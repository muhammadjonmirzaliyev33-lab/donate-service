import { telegramWebhookSecret } from '../../bot/utils/webhook-secret';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { BotService } from '../../bot/services/bot.service';
import { BotUpdateService } from './bot-update.service';

/**
 * Ilova ishga tushganda botni ikki rejimdan biriga ulaydi:
 *  - polling (standart, dev uchun qulay) — ochiq HTTPS domen shart emas, bot o'zi so'rab turadi
 *  - webhook (production) — PUBLIC_URL berilgan bo'lsa, setWebhook avtomatik chaqiriladi;
 *    berilmasa, /bot/webhook manzilini qo'lda bog'lash kerakligi haqida eslatma chiqadi.
 */
@Injectable()
export class BotLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotLifecycleService.name);
  private stopped = false;
  private offset = 0;

  constructor(
    private readonly botService: BotService,
    private readonly botUpdateService: BotUpdateService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit() {
    const mode = this.config.get('TELEGRAM_BOT_MODE', { infer: true });

    if (mode === 'webhook') {
      const publicUrl = this.config.get('PUBLIC_URL', { infer: true });
      if (publicUrl) {
        await this.botService.setWebhook(
          `${publicUrl.replace(/\/$/, '')}/bot/webhook`,
          telegramWebhookSecret(this.config.get('TELEGRAM_BOT_TOKEN', { infer: true })),
        );
        this.logger.log(`Webhook ulandi: ${publicUrl}/bot/webhook`);
      } else {
        this.logger.warn(
          "TELEGRAM_BOT_MODE=webhook, lekin PUBLIC_URL berilmagan — botni qo'lda ulash kerak (setWebhook).",
        );
      }
      return;
    }

    // Polling rejimida webhook o'chirilishi shart — aks holda Telegram getUpdates'ni rad etadi.
    await this.botService.deleteWebhook();
    this.logger.log('Bot polling rejimida ishga tushdi');
    void this.pollLoop();
  }

  onModuleDestroy() {
    this.stopped = true;
  }

  private async pollLoop() {
    while (!this.stopped) {
      try {
        const updates = await this.botService.getUpdates(this.offset, 30);
        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.botUpdateService.handleUpdate(update as never);
        }
      } catch (err) {
        this.logger.warn(`Polling xatosi: ${err instanceof Error ? err.message : err}`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
}
