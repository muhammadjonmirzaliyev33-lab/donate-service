import { Injectable } from '@nestjs/common';
import { DatabaseService, type QueryRunner } from '../../../database/database.service';
import type { PromoCodeRow } from '../dto/promo-code.dto';
import type { CreatePromoCodeInput, UpdatePromoCodeInput } from '../schemas/promo-code.schema';

@Injectable()
export class PromoCodesRepository {
  constructor(private readonly db: DatabaseService) {}

  async listAll(): Promise<(PromoCodeRow & { redemptions_count: string })[]> {
    const { rows } = await this.db.query<PromoCodeRow & { redemptions_count: string }>(
      `select p.*, coalesce(r.count, 0) as redemptions_count
       from promo_codes p
       left join (select promo_code_id, count(*) as count from promo_code_redemptions group by promo_code_id) r
         on r.promo_code_id = p.id
       order by p.created_at desc`,
    );
    return rows;
  }

  async findById(id: string): Promise<PromoCodeRow | null> {
    const { rows } = await this.db.query<PromoCodeRow>('select * from promo_codes where id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByCode(code: string, runner: QueryRunner = this.db): Promise<PromoCodeRow | null> {
    const { rows } = await runner.query<PromoCodeRow>('select * from promo_codes where code = $1', [code.toUpperCase()]);
    return rows[0] ?? null;
  }

  async create(input: CreatePromoCodeInput, adminId: bigint): Promise<PromoCodeRow> {
    const { rows } = await this.db.query<PromoCodeRow>(
      `insert into promo_codes (code, bonus_amount, expires_at, created_by)
       values ($1, $2, $3, $4)
       returning *`,
      [input.code.toUpperCase(), input.bonusAmount, input.expiresAt ?? null, adminId],
    );
    return rows[0];
  }

  async update(id: string, input: UpdatePromoCodeInput): Promise<PromoCodeRow | null> {
    const entries = Object.entries(input).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);

    const columnMap: Record<string, string> = {
      bonusAmount: 'bonus_amount',
      expiresAt: 'expires_at',
      isActive: 'is_active',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of entries) {
      const column = columnMap[key];
      if (!column) continue;
      values.push(value);
      setClauses.push(`${column} = $${values.length + 1}`);
    }
    setClauses.push('updated_at = now()');

    const { rows } = await this.db.query<PromoCodeRow>(
      `update promo_codes set ${setClauses.join(', ')} where id = $1 returning *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  }

  async remove(id: string): Promise<void> {
    await this.db.query('delete from promo_codes where id = $1', [id]);
  }

  /** unique(promo_code_id, user_id) — musobaqa holatida ham xavfsiz: allaqachon mavjud bo'lsa hech narsa qaytmaydi. */
  async insertRedemption(promoCodeId: string, userId: string, amount: number, runner: QueryRunner = this.db): Promise<boolean> {
    const { rows } = await runner.query(
      `insert into promo_code_redemptions (promo_code_id, user_id, amount)
       values ($1, $2, $3)
       on conflict (promo_code_id, user_id) do nothing
       returning id`,
      [promoCodeId, userId, amount],
    );
    return rows.length > 0;
  }
}
