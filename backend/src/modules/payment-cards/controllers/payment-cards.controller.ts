import { Controller, Get, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../../auth/guards/telegram-auth.guard';
import { PhoneRequiredGuard } from '../../auth/guards/phone-required.guard';
import { PaymentCardsService } from '../services/payment-cards.service';

/**
 * Foydalanuvchi to'lov ekranida ko'radigan faol kartalar ro'yxati. Bu yerda karta raqami
 * va egasining ismi qaytariladi — shuning uchun faqat Mini App ichidan (initData bilan)
 * kirish mumkin, ochiq internetga chiqarilmaydi.
 */
@UseGuards(TelegramAuthGuard, PhoneRequiredGuard)
@Controller('payment-cards')
export class PaymentCardsController {
  constructor(private readonly service: PaymentCardsService) {}

  @Get()
  listActive() {
    return this.service.listActive();
  }
}
