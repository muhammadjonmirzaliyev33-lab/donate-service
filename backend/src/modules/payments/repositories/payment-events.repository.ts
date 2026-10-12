import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

export type PaymentEventOutcome = 'matched' | 'ambiguous' | 'not_found' | 'unparsed' | 'ignored_noise';

export interface PaymentEventRow {
  id: string;
  source: string;
  raw_text: string;
  parsed_amount: string | null;
  parsed_order_no: number | null;
  matched_payment_id: string | null;
  outcome: PaymentEventOutcome;
  created_at: Date;
}

/**
 * SMS/notification webhook'idan kelgan HAR bir xom signalning audit yozuvi — moslashgan
 * yoki moslashmaganidan qat'i nazar. Bank/Click/Payme SMS formati keyin o'zgarsa ham eski
 * signallar saqlanib qoladi, parsing xato ishlaganda "nima kelgan edi" deb tekshirish uchun.
 */
@Injectable()
export class PaymentEventsRepository {
  constructor(private readonly db: DatabaseService) {}

  async record(params: {
    source: string;
    rawText: string;
    parsedAmount?: number | null;
    parsedOrderNo?: number | null;
    matchedPaymentId?: string | null;
    outcome: PaymentEventOutcome;
  }): Promise<void> {
    await this.db.query(
      `insert into payment_events (source, raw_text, parsed_amount, parsed_order_no, matched_payment_id, outcome)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        params.source,
        params.rawText,
        params.parsedAmount ?? null,
        params.parsedOrderNo ?? null,
        params.matchedPaymentId ?? null,
        params.outcome,
      ],
    );
  }
}
