import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../../config/env';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { AppException, ErrorCode } from '../../../common/errors';

/** initData qancha vaqtgacha "yangi" hisoblanadi (o'g'irlangan eski initData qayta ishlatilmasin). */
const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

@Injectable()
export class TelegramAuthService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * Telegram Mini App `initData` satrini tekshiradi va undan foydalanuvchini chiqarib beradi.
   * Rasmiy algoritm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  verifyInitData(initData: string): TelegramUser {
    if (!initData) {
      throw new AppException(ErrorCode.AUTH_MISSING_INIT_DATA);
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new AppException(ErrorCode.AUTH_MISSING_HASH);
    }
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const botToken = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new AppException(ErrorCode.AUTH_INVALID_SIGNATURE);
    }

    const authDate = Number(params.get('auth_date') ?? 0);
    const ageSeconds = Date.now() / 1000 - authDate;
    if (!authDate || ageSeconds > MAX_INIT_DATA_AGE_SECONDS) {
      throw new AppException(ErrorCode.AUTH_INIT_DATA_EXPIRED);
    }

    const rawUser = params.get('user');
    if (!rawUser) {
      throw new AppException(ErrorCode.AUTH_MISSING_USER);
    }

    const parsedUser = JSON.parse(rawUser) as { id: number; username?: string; first_name?: string };
    return {
      id: BigInt(parsedUser.id),
      username: parsedUser.username,
      firstName: parsedUser.first_name,
    };
  }
}
