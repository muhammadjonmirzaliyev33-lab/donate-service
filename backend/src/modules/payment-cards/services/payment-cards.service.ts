import { Injectable } from '@nestjs/common';
import { PaymentCardsRepository } from '../repositories/payment-cards.repository';
import { toPaymentCardDto, type PaymentCardDto } from '../dto/payment-card.dto';
import type { CreatePaymentCardInput, UpdatePaymentCardInput } from '../schemas/payment-card.schema';
import { AppException, ErrorCode } from '../../../common/errors';

@Injectable()
export class PaymentCardsService {
  constructor(private readonly repository: PaymentCardsRepository) {}

  async listActive(): Promise<PaymentCardDto[]> {
    const rows = await this.repository.findAll(true);
    return rows.map(toPaymentCardDto);
  }

  async listAll(): Promise<PaymentCardDto[]> {
    const rows = await this.repository.findAll(false);
    return rows.map(toPaymentCardDto);
  }

  async create(input: CreatePaymentCardInput): Promise<PaymentCardDto> {
    const row = await this.repository.create(input);
    return toPaymentCardDto(row);
  }

  async update(id: string, input: UpdatePaymentCardInput): Promise<PaymentCardDto> {
    const row = await this.repository.update(id, input);
    if (!row) throw new AppException(ErrorCode.PAYMENT_CARD_NOT_FOUND);
    return toPaymentCardDto(row);
  }

  async remove(id: string): Promise<void> {
    const row = await this.repository.findById(id);
    if (!row) throw new AppException(ErrorCode.PAYMENT_CARD_NOT_FOUND);
    await this.repository.remove(id);
  }
}
