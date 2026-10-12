import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export type AdminTokenType = 'access' | 'refresh';

export interface AdminSession {
  accountId: number;
  username: string;
}

/**
 * admin.komakpay.uz uchun access/refresh tokenlari — Telegram initData'ning HMAC-imzolash
 * uslubini takrorlaydi (TelegramAuthService), lekin bot tokeni o'rniga o'z-o'zidan
 * generatsiya qilingan kalit bilan. Kalit hech qanday env sozlamasini talab qilmaydi —
 * birinchi ishga tushishda o'zi tasodifiy kalit yaratib `admin_session_keys` jadvaliga
 * yozadi, keyingi ishga tushishlarda o'sha kalitni o'qib ishlatadi.
 * Format: base64url(payload-json) + "." + HMAC-SHA256 imzo (hex). Payload'dagi `type`
 * maydoni access va refresh tokenlarning bir-biri o'rniga ishlatilib qolinishining oldini
 * oladi (masalan access token refresh sifatida taqdim etilsa — rad etiladi).
 */
@Injectable()
export class AdminSessionService implements OnModuleInit {
  private secret = '';

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    const { rows } = await this.db.query<{ secret: string }>(`select secret from admin_session_keys where id = true`);
    if (rows[0]) {
      this.secret = rows[0].secret;
      return;
    }
    const generated = randomBytes(32).toString('hex');
    const { rows: inserted } = await this.db.query<{ secret: string }>(
      `insert into admin_session_keys (id, secret) values (true, $1)
       on conflict (id) do update set secret = admin_session_keys.secret
       returning secret`,
      [generated],
    );
    // `on conflict do update set secret = <o'zi>` — parallel ikkita instance bir vaqtda
    // birinchi marta ishga tushsa ham, ikkalasi ham OXIRIDA bitta xil kalitni o'qiydi
    // (race yutgan qator saqlanib qoladi, boshqasi shuni qaytarib oladi).
    this.secret = inserted[0].secret;
  }

  issueAccess(accountId: number, username: string): string {
    return this.sign(accountId, username, 'access', ACCESS_TOKEN_TTL_SECONDS);
  }

  issueRefresh(accountId: number, username: string): string {
    return this.sign(accountId, username, 'refresh', REFRESH_TOKEN_TTL_SECONDS);
  }

  private sign(accountId: number, username: string, type: AdminTokenType, ttlSeconds: number): string {
    const payload = { accountId, username, type, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
  }

  verify(token: string, expectedType: AdminTokenType): AdminSession | null {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;

    const expectedSignature = createHmac('sha256', this.secret).update(encoded).digest('hex');
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expectedSignature, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
        accountId: number;
        username: string;
        type: AdminTokenType;
        exp: number;
      };
      if (payload.type !== expectedType) return null;
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;
      return { accountId: payload.accountId, username: payload.username };
    } catch {
      return null;
    }
  }
}
