import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { BotUpdateService, type TelegramUpdate } from '../services/bot-update.service';
import { isValidTelegramWebhookSecret } from '../../bot/utils/webhook-secret';

/** Production'da (webhook rejimi) Telegram bu manzilga har bir update'ni yuboradi. */
@Controller('bot')
export class BotWebhookController {
  constructor(
    private readonly botUpdateService: BotUpdateService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('webhook')
  async handleUpdate(@Body() update: TelegramUpdate, @Headers('x-telegram-bot-api-secret-token') secret?: string) {
    // Faqat Telegram'ning o'zi (setWebhook'da berilgan secret_token bilan) chaqira oladi.
    if (!isValidTelegramWebhookSecret(this.config.get('TELEGRAM_BOT_TOKEN', { infer: true }), secret)) {
      throw new UnauthorizedException();
    }
    await this.botUpdateService.handleUpdate(update);
    return { ok: true };
  }
}
