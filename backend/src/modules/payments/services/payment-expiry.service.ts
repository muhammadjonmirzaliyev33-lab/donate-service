import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentsRepository } from '../repositories/payments.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { BotService } from '../../bot/services/bot.service';
import type { PaymentRow } from '../dto/payment.dto';

const SWEEP_INTERVAL_MS = 60_000;

/**
 * Qo'lda o'tkazma kutayotgan buyurtmalar (`expires_at` o'tib ketgan `pending_review`)ni
 * davriy tekshirib `expired`ga o'tkazadi. Muhim: bu billing amali emas — hech qanday
 * balans/keshbek/zaxira o'zgarmaydi (chunki expired holatga o'tguncha hech narsa
 * berilmagan edi), faqat `match_amount` band joyi bo'shaydi va navbat yig'ilib qolmaydi.
 * Har bir muddati o'tgan buyurtma haqida userga ham Telegram orqali xabar beriladi —
 * aks holda user pul o'tkazganini o'ylab kutib qolishi mumkin, hech narsa demasdan.
 */
@Injectable()
export class PaymentExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentExpiryService.name);
  private stopped = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly botService: BotService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.stopped) return;
    try {
      const expired = await this.paymentsRepository.expireOverduePending();
      if (expired.length > 0) {
        this.logger.log(`${expired.length} ta buyurtma muddati o'tgani uchun 'expired' qilindi`);
      }
      for (const payment of expired) {
        await this.notifyUser(payment);
      }
    } catch (err) {
      this.logger.warn(`Muddati o'tgan buyurtmalarni tekshirishda xato: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async notifyUser(payment: PaymentRow): Promise<void> {
    try {
      const user = await this.usersRepository.findById(payment.user_id);
      if (!user) return;
      await this.botService.sendMessage(
        BigInt(user.telegram_id),
        `⏰ Buyurtma #${payment.order_no} muddati tugadi (15 daqiqa ichida to'lov aniqlanmadi).\n\n` +
          `Agar pulni allaqachon o'tkazgan bo'lsangiz — admin bilan bog'laning, biz tekshirib beramiz. ` +
          `Aks holda ilovada qayta buyurtma yaratishingiz mumkin.`,
      );
    } catch (err) {
      this.logger.warn(`Buyurtma #${payment.order_no} uchun expiry xabarini yuborib bo'lmadi: ${err instanceof Error ? err.message : err}`);
    }
  }
}
