import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { PaymentsService } from './payments.service';
import { BotService } from '../../bot/services/bot.service';
import { BotOnboardingService } from '../../bot/services/bot-onboarding.service';
import type { BotLang } from '../../bot/messages/bot-messages';

export interface TelegramFrom {
  id: number;
  username?: string;
  first_name?: string;
}

export interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number };
    from: TelegramFrom;
    contact?: { user_id?: number; phone_number: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
    from: TelegramFrom;
  };
}

/**
 * Telegram'dan kelgan har bir update shu yerda ishlanadi — manbasi muhim emas
 * (webhook POST orqali kelsin, yoki polling getUpdates orqali kelsin, bir xil kod).
 * Ikki narsani boshqaradi:
 *  - foydalanuvchi tomoni: /start → til tanlash → telefon ulashish → do'konni ochish
 *  - admin tomoni: xarid/to'lov signal xabaridagi ✅/❌ tugma
 */
@Injectable()
export class BotUpdateService {
  private readonly logger = new Logger(BotUpdateService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly botService: BotService,
    private readonly onboardingService: BotOnboardingService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async handleUpdate(update: TelegramUpdate) {
    if (update.message) {
      await this.handleMessage(update.message);
      return;
    }
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleMessage(message: NonNullable<TelegramUpdate['message']>) {
    const startMatch = /^\/start(?:\s+(\S+))?$/.exec(message.text ?? '');
    if (startMatch) {
      await this.onboardingService.handleStart(message.chat.id, message.from, startMatch[1]);
      return;
    }
    if (message.contact) {
      await this.onboardingService.handleContact(message.chat.id, message.from, message.contact);
    }
  }

  private async handleCallbackQuery(cq: NonNullable<TelegramUpdate['callback_query']>) {
    if (!cq.data || !cq.message) return;

    const langMatch = /^lang:(uz|ru)$/.exec(cq.data);
    if (langMatch) {
      await this.onboardingService.handleLanguageChoice(cq.message.chat.id, cq.message.message_id, cq.from, langMatch[1] as BotLang);
      await this.botService.answerCallbackQuery(cq.id);
      return;
    }

    const payMatch = /^pay:(approve|reject):(.+)$/.exec(cq.data);
    if (payMatch) {
      await this.handlePaymentDecision(cq.id, cq.from, payMatch[1] as 'approve' | 'reject', payMatch[2]);
      return;
    }

    const undoMatch = /^pay:undo:(.+)$/.exec(cq.data);
    if (undoMatch) {
      await this.handlePaymentUndo(cq.id, cq.from, undoMatch[1]);
    }
  }

  private async handlePaymentDecision(callbackQueryId: string, from: TelegramFrom, action: 'approve' | 'reject', paymentId: string) {
    const fromId = BigInt(from.id);
    const adminIds = this.config.get('ADMIN_TELEGRAM_IDS', { infer: true });

    if (!adminIds.includes(fromId)) {
      await this.botService.answerCallbackQuery(callbackQueryId, 'Sizda admin huquqi yo‘q');
      return;
    }

    try {
      await this.paymentsService.decide(paymentId, { id: fromId, username: from.username, firstName: from.first_name }, action);
      await this.botService.answerCallbackQuery(callbackQueryId, action === 'approve' ? 'Tasdiqlandi ✅' : 'Rad etildi ❌');
    } catch (err) {
      this.logger.warn(`callback_query xatosi: ${err instanceof Error ? err.message : err}`);
      await this.botService.answerCallbackQuery(callbackQueryId, 'Bu to‘lov allaqachon hal qilingan');
    }
  }

  private async handlePaymentUndo(callbackQueryId: string, from: TelegramFrom, paymentId: string) {
    const fromId = BigInt(from.id);
    const adminIds = this.config.get('ADMIN_TELEGRAM_IDS', { infer: true });

    if (!adminIds.includes(fromId)) {
      await this.botService.answerCallbackQuery(callbackQueryId, 'Sizda admin huquqi yo‘q');
      return;
    }

    try {
      await this.paymentsService.undo(paymentId, { id: fromId, username: from.username, firstName: from.first_name });
      await this.botService.answerCallbackQuery(callbackQueryId, "O'zgartirildi — qayta ko'rib chiqish uchun ochildi");
    } catch (err) {
      this.logger.warn(`callback_query xatosi (undo): ${err instanceof Error ? err.message : err}`);
      await this.botService.answerCallbackQuery(callbackQueryId, "Bu to'lovni o'zgartirib bo'lmaydi");
    }
  }
}
