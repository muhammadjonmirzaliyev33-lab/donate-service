import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../../config/env';
import { TelegramAuthService } from '../services/telegram-auth.service';
import { AdminSessionService } from '../../admin-auth/services/admin-session.service';
import { parseCookies } from '../../../common/utils/cookies';
import { AppException, ErrorCode } from '../../../common/errors';

/**
 * Ikkita kirish usulini qabul qiladi:
 *   1. Telegram Mini App: initData (HMAC) + telegram_id ADMIN_TELEGRAM_IDS ro'yxatida.
 *   2. admin.komakpay.uz: `admin_access` httpOnly cookie (login/parol bilan olingan,
 *      15 daqiqalik access token — muddati o'tsa frontend /admin-auth/refresh chaqiradi).
 * Ikkalasi ham `req.telegramUser`ni to'ldiradi — shu sabab qolgan barcha admin
 * controller/service'lar (@CurrentUser()) ikkala kirish usuli uchun ham o'zgarishsiz ishlaydi.
 * Web-login hisoblari uchun sun'iy id manfiy qilib beriladi (haqiqiy Telegram id'lari doim
 * musbat), shuning uchun hech qachon to'qnashmaydi.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly telegramAuth: TelegramAuthService,
    private readonly adminSession: AdminSessionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const accessCookie = parseCookies(req.header('cookie'))['admin_access'];
    if (accessCookie) {
      const session = this.adminSession.verify(accessCookie, 'access');
      if (!session) {
        throw new AppException(ErrorCode.AUTH_INVALID_SESSION);
      }
      req.telegramUser = { id: BigInt(-session.accountId), username: session.username };
      return true;
    }

    const user = this.telegramAuth.verifyInitData(req.header('x-telegram-init-data') ?? '');

    const adminIds = this.config.get('ADMIN_TELEGRAM_IDS', { infer: true });
    if (!adminIds.includes(user.id)) {
      throw new AppException(ErrorCode.AUTH_NOT_ADMIN);
    }

    req.telegramUser = user;
    return true;
  }
}
