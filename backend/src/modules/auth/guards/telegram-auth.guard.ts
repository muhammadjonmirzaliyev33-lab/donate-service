import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { TelegramAuthService } from '../services/telegram-auth.service';

/**
 * So'rov header'idan (`X-Telegram-Init-Data`) Mini App initData'ni oladi, tekshiradi
 * va `req.telegramUser`ga yozadi. Himoyalangan (lekin admin bo'lishi shart bo'lmagan)
 * barcha route'larda ishlatiladi.
 */
@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly telegramAuth: TelegramAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    // Bo'sh satr bo'lsa ham TelegramAuthService.verifyInitData o'zi AUTH_MISSING_INIT_DATA bilan otadi.
    req.telegramUser = this.telegramAuth.verifyInitData(req.header('x-telegram-init-data') ?? '');
    return true;
  }
}
