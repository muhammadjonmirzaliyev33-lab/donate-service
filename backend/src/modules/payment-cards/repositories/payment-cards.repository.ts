import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { PaymentCardRow } from '../dto/payment-card.dto';
import type { CreatePaymentCardInput, UpdatePaymentCardInput } from '../schemas/payment-card.schema';

@Injectable()
export class PaymentCardsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAll(activeOnly: boolean): Promise<PaymentCardRow[]> {
    const { rows } = await this.db.query<PaymentCardRow>(
      `select * from payment_cards ${activeOnly ? 'where is_active' : ''} order by sort_order, created_at`,
    );
    return rows;
  }

  async findById(id: string): Promise<PaymentCardRow | null> {
    const { rows } = await this.db.query<PaymentCardRow>('select * from payment_cards where id = $1', [id]);
    return rows[0] ?? null;
  }

  async create(input: CreatePaymentCardInput): Promise<PaymentCardRow> {
    const { rows } = await this.db.query<PaymentCardRow>(
      `insert into payment_cards (bank_name, card_number, holder_name, is_active, sort_order)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [input.bankName, input.cardNumber, input.holderName, input.isActive, input.sortOrder],
    );
    return rows[0];
  }

  async update(id: string, input: UpdatePaymentCardInput): Promise<PaymentCardRow | null> {
    const entries = Object.entries(input).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);

    const columnMap: Record<string, string> = {
      bankName: 'bank_name',
      cardNumber: 'card_number',
      holderName: 'holder_name',
      isActive: 'is_active',
      sortOrder: 'sort_order',
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

    const { rows } = await this.db.query<PaymentCardRow>(
      `update payment_cards set ${setClauses.join(', ')} where id = $1 returning *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  }

  async remove(id: string): Promise<void> {
    await this.db.query('delete from payment_cards where id = $1', [id]);
  }
}
