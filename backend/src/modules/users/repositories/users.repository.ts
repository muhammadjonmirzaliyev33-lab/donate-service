import { Injectable } from '@nestjs/common';
import { DatabaseService, type QueryRunner } from '../../../database/database.service';
import type { ReferralInvitedRow, UserRow } from '../dto/user.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByTelegramId(telegramId: bigint): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>('select * from users where telegram_id = $1', [telegramId]);
    return rows[0] ?? null;
  }

  async findById(id: string, runner: QueryRunner = this.db): Promise<UserRow | null> {
    const { rows } = await runner.query<UserRow>('select * from users where id = $1', [id]);
    return rows[0] ?? null;
  }

  /**
   * Birinchi marta kirganda yaratadi, keyingi safar username/first_name'ni yangilaydi.
   * `referredBy` FAQAT insert paytida yoziladi (ON CONFLICT DO UPDATE uni qamramaydi) —
   * shu bilan mavjud userning "kim taklif qilgani" keyinchalik hech qachon o'zgarmaydi.
   */
  async upsert(params: { telegramId: bigint; username?: string; firstName?: string; referredBy?: string }): Promise<UserRow> {
    const { rows } = await this.db.query<UserRow>(
      `insert into users (telegram_id, username, first_name, referred_by)
       values ($1, $2, $3, $4)
       on conflict (telegram_id) do update
         set username = excluded.username,
             first_name = excluded.first_name,
             updated_at = now()
       returning *`,
      [params.telegramId, params.username ?? null, params.firstName ?? null, params.referredBy ?? null],
    );
    return rows[0];
  }

  /**
   * `greatest(0, ...)` — undo() manfiy delta bilan chaqirganda (masalan foydalanuvchi
   * to'ldirilgan balansni allaqachon sarflab bo'lgan bo'lsa), balans manfiyga tushib
   * ketmasin (stock_movements'dagi kabi floor bilan himoyalanadi).
   */
  async adjustBalance(userId: string, delta: number, runner: QueryRunner = this.db): Promise<UserRow> {
    const { rows } = await runner.query<UserRow>(
      `update users set balance = greatest(0, balance + $2), updated_at = now() where id = $1 returning *`,
      [userId, delta],
    );
    return rows[0];
  }

  /** Balans yetarli bo'lsagina `amount`ni yechadi (atomik). Yetmasa — null. */
  async debitBalance(userId: string, amount: number, runner: QueryRunner = this.db): Promise<UserRow | null> {
    const { rows } = await runner.query<UserRow>(
      `update users set balance = balance - $2, updated_at = now() where id = $1 and balance >= $2 returning *`,
      [userId, amount],
    );
    return rows[0] ?? null;
  }

  async adjustCashback(userId: string, delta: number, runner: QueryRunner = this.db): Promise<UserRow> {
    const { rows } = await runner.query<UserRow>(
      `update users set cashback = greatest(0, cashback + $2), updated_at = now() where id = $1 returning *`,
      [userId, delta],
    );
    return rows[0];
  }

  async setLanguage(telegramId: bigint, language: 'uz' | 'ru'): Promise<UserRow> {
    const { rows } = await this.db.query<UserRow>(
      `update users set language = $2, updated_at = now() where telegram_id = $1 returning *`,
      [telegramId, language],
    );
    return rows[0];
  }

  async setPhone(telegramId: bigint, phone: string): Promise<UserRow> {
    const { rows } = await this.db.query<UserRow>(
      `update users set phone = $2, updated_at = now() where telegram_id = $1 returning *`,
      [telegramId, phone],
    );
    return rows[0];
  }

  /** Referrerga bonus berilganda — bir martalik himoya (referral_rewarded_at) va statistikada ko'rsatish uchun summa. */
  async setReferralReward(userId: string, amount: number, paymentId: string, runner: QueryRunner = this.db): Promise<void> {
    await runner.query(
      'update users set referral_rewarded_at = now(), referral_reward_amount = $2, referral_reward_payment_id = $3 where id = $1',
      [userId, amount, paymentId],
    );
  }

  /** undo() qilinganda — agar shu to'lov aynan referral bonusini ishga tushirgan bo'lsa, bonusni tozalaydi va kimning balansidan ayirish kerakligini (referrer) qaytaradi. */
  async clearReferralRewardIfTriggeredBy(
    paymentId: string,
    runner: QueryRunner = this.db,
  ): Promise<{ referrerId: string; amount: number } | null> {
    const { rows } = await runner.query<{ referred_by: string; referral_reward_amount: string }>(
      `with old as (
         select id, referred_by, referral_reward_amount from users where referral_reward_payment_id = $1
       )
       update users u set referral_rewarded_at = null, referral_reward_amount = null, referral_reward_payment_id = null
       from old
       where u.id = old.id
       returning old.referred_by, old.referral_reward_amount`,
      [paymentId],
    );
    if (!rows[0]) return null;
    return { referrerId: rows[0].referred_by, amount: Number(rows[0].referral_reward_amount) };
  }

  /** Profil ekranidagi "Do'stlarni taklif qilish" bo'limi uchun — kim taklif qilingani va bonus holati. */
  async listInvitedBy(userId: string): Promise<ReferralInvitedRow[]> {
    const { rows } = await this.db.query<ReferralInvitedRow>(
      `select username, first_name, referral_rewarded_at, referral_reward_amount, created_at from users where referred_by = $1 order by created_at desc`,
      [userId],
    );
    return rows;
  }

  async listAll(limit: number): Promise<(UserRow & { orders_count: string; total_spent: string })[]> {
    const { rows } = await this.db.query<UserRow & { orders_count: string; total_spent: string }>(
      `select u.*, coalesce(o.orders_count, 0) as orders_count, coalesce(o.total_spent, 0) as total_spent
       from users u
       left join (
         select user_id, count(*) as orders_count, sum(amount) as total_spent
         from payments
         where status = 'completed'
         group by user_id
       ) o on o.user_id = u.id
       order by u.created_at desc
       limit $1`,
      [limit],
    );
    return rows;
  }

  async listAllTelegramIds(): Promise<string[]> {
    const { rows } = await this.db.query<{ telegram_id: string }>('select telegram_id from users');
    return rows.map((r) => r.telegram_id);
  }
}
