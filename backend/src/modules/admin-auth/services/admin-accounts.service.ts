import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { DatabaseService } from '../../../database/database.service';

/**
 * admin.komakpay.uz uchun login/parol hisoblari. Hisoblar `init.sql` ichida bcrypt hash
 * bilan oldindan seed qilinadi (parol matni hech qayerda — env'da ham — saqlanmaydi, faqat
 * bcrypt hash git repo/DB'da yotadi). Yangi hisob qo'shish yoki parolni almashtirish uchun
 * `init.sql`dagi tegishli `insert ... on conflict do update` qatorini tahrirlash kifoya.
 */
@Injectable()
export class AdminAccountsService {
  constructor(private readonly db: DatabaseService) {}

  /** To'g'ri bo'lsa hisob id'sini, aks holda null qaytaradi. */
  async verifyCredentials(username: string, password: string): Promise<number | null> {
    const { rows } = await this.db.query<{ id: number; password_hash: string }>(
      `select id, password_hash from admin_accounts where username = $1`,
      [username],
    );
    const account = rows[0];
    if (!account) return null;
    return (await compare(password, account.password_hash)) ? account.id : null;
  }
}
