import { Controller, Get, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../../auth/guards/telegram-auth.guard';
import { PhoneRequiredGuard } from '../../auth/guards/phone-required.guard';
import { SettingsService } from '../services/settings.service';

/**
 * Frontend to'lov ekranida "o'rtacha bajarilish vaqti" kabi ma'lumotlarni shu yerdan
 * oladi — faqat Mini App ichidan (initData bilan). Admin panellar buning o'rniga
 * `GET /admin/settings`dan foydalanadi.
 */
@UseGuards(TelegramAuthGuard, PhoneRequiredGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  get() {
    return this.service.get();
  }
}
