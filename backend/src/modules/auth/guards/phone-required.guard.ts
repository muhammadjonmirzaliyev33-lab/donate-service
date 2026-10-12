import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DatabaseService } from '../../../database/database.service';
import { AppException, ErrorCode } from '../../../common/errors';

/**
 * TelegramAuthGuard'dan KEYIN ishlatiladi (req.telegramUser talab qiladi). Foydalanuvchi
 * botga telefon raqamini hali ulashmagan bo'lsa (users.phone hali null) — do'kon/ilovaning
 * qolgan qismiga (katalog, to'lov, reyting va h.k.) ruxsat bermaydi: AUTH_PHONE_NOT_SHARED
 * (403) qaytaradi. Frontend shu kodni ko'rib "telefon raqamingizni ulashing" ekranini
 * ko'rsatadi, webapp'ning o'zini ko'rsatmaydi.
 *
 * `/users/me` bu guard'dan ATAYLAB ozod — frontend aynan shu endpoint orqali
 * `phoneShared`ni tekshirib, qaysi ekranni ko'rsatishni hal qiladi.
 */
@Injectable()
export class PhoneRequiredGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const telegramUser = req.telegramUser;
    if (!telegramUser) {
      // Dasturchi xatosi: PhoneRequiredGuard TelegramAuthGuard'siz ishlatilgan.
      throw new AppException(ErrorCode.INTERNAL, "PhoneRequiredGuard TelegramAuthGuard'dan keyin ishlatilishi kerak");
    }

    const { rows } = await this.db.query<{ phone: string | null }>('select phone from users where telegram_id = $1', [
      telegramUser.id,
    ]);
    if (!rows[0]?.phone) {
      throw new AppException(ErrorCode.AUTH_PHONE_NOT_SHARED);
    }
    return true;
  }
}
