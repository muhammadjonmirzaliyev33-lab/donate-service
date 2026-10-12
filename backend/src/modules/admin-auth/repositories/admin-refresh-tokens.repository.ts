import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AdminRefreshTokensRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(accountId: number, token: string, expiresAt: Date): Promise<void> {
    await this.db.query(`insert into admin_refresh_tokens (account_id, token_hash, expires_at) values ($1, $2, $3)`, [
      accountId,
      hashToken(token),
      expiresAt,
    ]);
  }

  /** Token DB'da mavjud, bekor qilinmagan va muddati o'tmaganini tekshiradi. */
  async isValid(token: string): Promise<boolean> {
    const { rows } = await this.db.query(
      `select 1 from admin_refresh_tokens where token_hash = $1 and revoked_at is null and expires_at > now()`,
      [hashToken(token)],
    );
    return rows.length > 0;
  }

  async revoke(token: string): Promise<void> {
    await this.db.query(`update admin_refresh_tokens set revoked_at = now() where token_hash = $1 and revoked_at is null`, [
      hashToken(token),
    ]);
  }
}
