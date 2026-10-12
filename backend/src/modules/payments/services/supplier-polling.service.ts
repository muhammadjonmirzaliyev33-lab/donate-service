import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { PaymentsRepository } from '../repositories/payments.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { SupplierFulfillmentService } from '../../supplier/services/supplier-fulfillment.service';
import { BotService } from '../../bot/services/bot.service';
import type { PaymentRow } from '../dto/payment.dto';
import { buildDeliveredMessage } from '../utils/delivered-message';

const POLL_INTERVAL_MS = 25_000;

/**
 * PayCore'ga yuborilgan, lekin hali 'processing' holatida qolgan buyurtmalarni
 * (masalan pubg-sets, kartoteka bilan tekshiriladigan kategoriyalar) davriy tekshiradi —
 * yakunlangach userga xabar beradi, muvaffaqiyatsiz bo'lsa adminni ogohlantiradi.
 */
@Injectable()
export class SupplierPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupplierPollingService.name);
  private stopped = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly fulfillment: SupplierFulfillmentService,
    private readonly botService: BotService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    if (!this.fulfillment.isEnabled) return;
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.stopped) return;
    let pending: PaymentRow[];
    try {
      pending = await this.paymentsRepository.listProcessingSupplierOrders();
    } catch (err) {
      this.logger.warn(`Kutilayotgan buyurtmalar ro'yxatini olishda xato: ${err instanceof Error ? err.message : err}`);
      return;
    }
    for (const payment of pending) {
      await this.checkOne(payment);
    }
  }

  private async checkOne(payment: PaymentRow) {
    if (!payment.supplier_order_id) return;
    try {
      // Eski (provayder yozilmagan) qatorlar PayCore davridan qolgan — standart 'paycore'.
      const order = await this.fulfillment.pollStatus(payment.supplier_provider ?? 'paycore', Number(payment.supplier_order_id));
      if (order.status === 'processing') return; // hali kutmoqda, keyingi tsiklda qayta tekshiriladi

      await this.paymentsRepository.setSupplierResult(payment.id, {
        status: order.status,
        details: order.details ?? null,
        error: order.status === 'failed' ? "PayCore: yetkazib berish muvaffaqiyatsiz tugadi" : null,
      });

      if (order.status === 'completed') {
        const user = await this.usersRepository.findById(payment.user_id);
        if (user) {
          await this.botService.sendMessage(BigInt(user.telegram_id), buildDeliveredMessage(payment.order_no, order.details));
        }
      } else {
        const chatId = this.config.get('ADMIN_ALERT_CHAT_ID', { infer: true });
        await this.botService.sendMessage(
          chatId,
          `⚠️ Buyurtma #${payment.order_no} — PayCore orqali yetkazib bo'lmadi, qo'lda yetkazing.`,
        );
      }
    } catch (err) {
      this.logger.warn(`Buyurtma #${payment.order_no} holatini tekshirishda xato: ${err instanceof Error ? err.message : err}`);
    }
  }
}
