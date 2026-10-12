import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { PaymentsRepository } from '../repositories/payments.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { CatalogService } from '../../catalog/services/catalog.service';
import type { PackageDto } from '../../catalog/dto/package.dto';
import { StockService } from '../../stock/services/stock.service';
import { SupplierFulfillmentService, type SupplierProvider } from '../../supplier/services/supplier-fulfillment.service';
import { BotService } from '../../bot/services/bot.service';
import { CloudinaryService } from '../../uploads/services/cloudinary.service';
import { SettingsService } from '../../settings/services/settings.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { toPaymentDetailDto, toPaymentDto, type PaymentDetailDto, type PaymentDetailRow, type PaymentDto, type PaymentRow } from '../dto/payment.dto';
import type { CreatePurchaseInput, CreateTopupInput } from '../schemas/create-payment.schema';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import type { QueryRunner } from '../../../database/database.service';
import { AppException, ErrorCode } from '../../../common/errors';
import { PaymentNotificationCode } from '../notifications/notification-code.enum';
import { getPaymentNotificationText } from '../notifications/notification-messages';
import { buildDeliveredMessage } from '../utils/delivered-message';

/** Tasdiqlangan xarid uchun o'yinning yetkazib beruvchi sozlamalari (games jadvalidan). */
interface ApprovedSupplier {
  provider: SupplierProvider;
  /** paycore: kategoriya slug'i · moogold: product_id */
  category: string;
  /** Faqat moogold: 1 = direct top-up, 2 = eVoucher. */
  orderCategory: number | null;
}

const CASHBACK_RATE = 0.01;
/** Qo'lda o'tkazma kutilayotgan buyurtma shuncha daqiqada muddati o'tgan (expired) deb belgilanadi. */
const PAYMENT_EXPIRY_MINUTES = 15;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly catalogService: CatalogService,
    private readonly stockService: StockService,
    private readonly supplierFulfillment: SupplierFulfillmentService,
    private readonly botService: BotService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService<Env, true>,
    private readonly auditLog: AuditLogService,
  ) {}

  // ---------- User tomoni: yaratish ----------

  async createPurchase(telegramUser: TelegramUser, input: CreatePurchaseInput): Promise<PaymentDto> {
    const user = await this.usersRepository.upsert({ telegramId: telegramUser.id, username: telegramUser.username, firstName: telegramUser.firstName });
    const game = await this.catalogService.getActiveGame(input.gameId);
    const pkg = await this.catalogService.getActivePackageForGame(input.gameId, input.packageId);

    if (input.method === 'balance') {
      const payment = await this.db.transaction(async (client) => {
        // Atomik yechish: balans yetarli bo'lsagina kamayadi. Parallel so'rovlar bitta balansni
        // ikki marta sarflay olmaydi (oldingi "avval tekshir, keyin yech" usuli race'ga ochiq edi).
        const debited = await this.usersRepository.debitBalance(user.id, pkg.price, client);
        if (!debited) {
          throw new AppException(ErrorCode.PAYMENTS_INSUFFICIENT_BALANCE);
        }
        const row = await this.paymentsRepository.create(
          {
            userId: user.id,
            kind: 'purchase',
            status: 'completed',
            method: 'balance',
            amount: pkg.price,
            gameId: game.id,
            packageId: pkg.id,
            playerInfo: input.playerInfo,
          },
          client,
        );
        await this.usersRepository.adjustCashback(user.id, Math.round(pkg.price * CASHBACK_RATE), client);
        await this.stockService.recordSale({ gameId: game.id, amount: pkg.amount + (pkg.bonus ?? 0), paymentId: row.id, client });
        return row;
      });
      // Karta/bankomat to'lovlarida bu decide() (admin tasdiqlashi) orqali chaqiriladi —
      // balansdan to'lov esa shu yerning o'zida darhol 'completed' bo'lgani uchun, supplier
      // chaqiruvi ham shu yerda bo'lishi kerak (aks holda yetkazib beruvchiga umuman
      // so'rov ketmaydi).
      if (game.supplierCategory) {
        await this.attemptSupplierFulfillment(payment, pkg, {
          provider: game.supplierProvider,
          category: game.supplierCategory,
          orderCategory: game.supplierOrderCategory,
        });
      }
      return toPaymentDto(payment);
    }

    // Admin bu bosqichda hali xabardor qilinmaydi — chek hali yuklanmagan, ko'rib chiqadigan
    // hech narsa yo'q. Xabar faqat uploadReceipt() orqali, chek bilan birga boradi.
    // match_amount (SMS/notification'ni aniq moslashtirish uchun noyob summa) shu yerda ajratiladi.
    const row = await this.paymentsRepository.createWithMatchAmount(
      {
        userId: user.id,
        kind: 'purchase',
        status: 'pending_review',
        method: input.method,
        amount: pkg.price,
        gameId: game.id,
        packageId: pkg.id,
        playerInfo: input.playerInfo,
      },
      PAYMENT_EXPIRY_MINUTES,
    );

    return toPaymentDto(row);
  }

  async createTopup(telegramUser: TelegramUser, input: CreateTopupInput): Promise<PaymentDto> {
    const user = await this.usersRepository.upsert({ telegramId: telegramUser.id, username: telegramUser.username, firstName: telegramUser.firstName });

    const row = await this.paymentsRepository.createWithMatchAmount(
      {
        userId: user.id,
        kind: 'topup',
        status: 'pending_review',
        method: input.method,
        amount: input.amount,
      },
      PAYMENT_EXPIRY_MINUTES,
    );

    return toPaymentDto(row);
  }

  // ---------- Admin/bot tomoni: qaror ----------

  async decide(paymentId: string, admin: TelegramUser, outcome: 'approve' | 'reject', reason?: string): Promise<PaymentDto> {
    const newStatus = outcome === 'approve' ? ('completed' as const) : ('cancelled' as const);

    let approvedPkg: PackageDto | null = null;
    let approvedSupplier: ApprovedSupplier | null = null;

    const result = await this.db.transaction(async (client) => {
      const row = await this.paymentsRepository.decide(paymentId, newStatus, admin.id, reason ?? null, client);
      if (!row) return null;

      let referralReward: { referrerTelegramId: bigint; amount: number } | null = null;
      if (outcome === 'approve') {
        if (row.kind === 'topup') {
          await this.usersRepository.adjustBalance(row.user_id, Number(row.amount), client);
        } else if (row.kind === 'purchase' && row.game_id && row.package_id) {
          const pkg = await this.catalogService.getActivePackageForGame(row.game_id, row.package_id).catch(() => null);
          await this.usersRepository.adjustCashback(row.user_id, Math.round(Number(row.amount) * CASHBACK_RATE), client);
          if (pkg) {
            await this.stockService.recordSale({
              gameId: row.game_id,
              amount: pkg.amount + (pkg.bonus ?? 0),
              paymentId: row.id,
              client,
            });
            approvedPkg = pkg;
            const game = await this.catalogService.getActiveGame(row.game_id).catch(() => null);
            approvedSupplier = game?.supplierCategory
              ? { provider: game.supplierProvider, category: game.supplierCategory, orderCategory: game.supplierOrderCategory }
              : null;
          }
        }
        referralReward = await this.applyReferralReward(row, client);
      }
      return { row, referralReward };
    });

    if (!result) {
      throw new AppException(ErrorCode.PAYMENTS_ALREADY_DECIDED);
    }
    const { row: payment, referralReward } = result;

    await this.logOrderAudit(outcome === 'approve' ? 'order.approved' : 'order.rejected', payment, admin, {
      reason: reason ?? null,
    });

    await this.notifyUserAndCloseAlert(payment, outcome, admin);

    if (referralReward) {
      const amountText = `${referralReward.amount.toLocaleString('ru-RU')} so'm`;
      await this.botService.sendMessage(
        referralReward.referrerTelegramId,
        `🎉 Sizning taklifingiz bilan kelgan do'stingiz birinchi to'lovini amalga oshirdi — balansingizga <b>${amountText}</b> qo'shildi!`,
      );
    }

    // Zaxira/balans/keshbek allaqachon qo'llanildi — supplier chaqiruvi shundan keyin, tashqi
    // tarmoq kechikishi tranzaksiyani (DB ulanishini) ushlab turmasligi uchun.
    if (outcome === 'approve' && approvedPkg && approvedSupplier) {
      await this.attemptSupplierFulfillment(payment, approvedPkg, approvedSupplier);
    }

    return toPaymentDto(payment);
  }

  /**
   * O'yin yetkazib beruvchiga (PayCore/MooGold) va paket slug/variation'ga ega bo'lsa —
   * avtomatik sotib olishga urinadi. Muvaffaqiyatsizlik to'lov tasdiqlanishini BEKOR
   * QILMAYDI (balans/keshbek/zaxira allaqachon berilgan) — faqat adminga xabar beriladi,
   * u qo'lda yetkazadi.
   */
  private async attemptSupplierFulfillment(payment: PaymentRow, pkg: PackageDto, supplier: ApprovedSupplier): Promise<void> {
    // VPN'da PayCore mahsulot katalogida alohida slug bo'lmaydi — buyurtma faqat
    // oy/qurilma soni bilan yaratiladi, shuning uchun bu kategoriya slug talab qilmaydi.
    const needsSlug = supplier.category !== 'vpn';
    if ((needsSlug && !pkg.supplierSlug) || !this.supplierFulfillment.isProviderEnabled(supplier.provider)) return;

    try {
      const order = await this.supplierFulfillment.deliver({
        provider: supplier.provider,
        category: supplier.category,
        slug: pkg.supplierSlug,
        amount: pkg.amount,
        playerInfo: payment.player_info,
        extraQty: pkg.extraQty,
        orderCategory: supplier.orderCategory,
        partnerOrderId: String(payment.order_no),
      });
      await this.paymentsRepository.setSupplierResult(payment.id, {
        orderId: order.id,
        status: order.status,
        details: order.details ?? null,
        provider: supplier.provider,
      });
      if (order.status === 'completed') {
        const user = await this.usersRepository.findById(payment.user_id);
        if (user) {
          await this.botService.sendMessage(BigInt(user.telegram_id), buildDeliveredMessage(payment.order_no, order.details));
        }
      }
      // 'processing' bo'lsa — SupplierPollingService keyinroq holatni tekshirib, yakunlaydi.
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Buyurtma #${payment.order_no} — PayCore orqali yetkazib bo'lmadi: ${message}`);
      await this.paymentsRepository.setSupplierResult(payment.id, { status: 'failed', error: message });
      const chatId = this.config.get('ADMIN_ALERT_CHAT_ID', { infer: true });
      await this.botService.sendMessage(
        chatId,
        `⚠️ Buyurtma #${payment.order_no} tasdiqlandi, lekin PayCore orqali avtomatik yetkazib bo'lmadi:\n${message}\n\nIltimos, qo'lda yetkazib bering.`,
      );
    }
  }

  /**
   * Taklif qilingan user birinchi marta to'lov qilganda (xarid yoki hisob to'ldirish — ikkalasi ham
   * hisoblanadi), referrerning balansiga bonus qo'shadi. Faqat BIR MARTA (referral_rewarded_at orqali
   * himoyalangan) va faqat haqiqatan HAM birinchi to'lov bo'lsa (countCompleted === 1).
   */
  private async applyReferralReward(row: PaymentRow, client: QueryRunner): Promise<{ referrerTelegramId: bigint; amount: number } | null> {
    const user = await this.usersRepository.findById(row.user_id, client);
    if (!user || !user.referred_by || user.referral_rewarded_at) return null;

    const completedCount = await this.paymentsRepository.countCompleted(row.user_id, client);
    if (completedCount !== 1) return null;

    const referrer = await this.usersRepository.findById(user.referred_by, client);
    if (!referrer) return null;

    const settings = await this.settingsService.get();
    const reward = Math.round(settings.referralFixedBonus + (Number(row.amount) * settings.referralPercent) / 100);
    if (reward <= 0) return null;

    await this.usersRepository.adjustBalance(referrer.id, reward, client);
    await this.usersRepository.setReferralReward(user.id, reward, row.id, client);

    return { referrerTelegramId: BigInt(referrer.telegram_id), amount: reward };
  }

  /**
   * Admin xato bosgan holat uchun (masalan boshqa foydalanuvchining to'lovini tasdiqlab
   * qo'ygan bo'lsa) — hal qilingan to'lovni yana 'pending_review'ga qaytaradi va agar
   * approve bo'lgan bo'lsa, balans/keshbek/zaxiraga qo'shilgan narsalarni orqaga qaytaradi.
   */
  async undo(paymentId: string, admin: TelegramUser): Promise<PaymentDto> {
    const payment = await this.db.transaction(async (client) => {
      const row = await this.paymentsRepository.undo(paymentId, client);
      if (!row) return null;

      if (row.previous_status === 'completed') {
        if (row.kind === 'topup') {
          await this.usersRepository.adjustBalance(row.user_id, -Number(row.amount), client);
        } else if (row.kind === 'purchase' && row.game_id && row.package_id) {
          await this.usersRepository.adjustCashback(row.user_id, -Math.round(Number(row.amount) * CASHBACK_RATE), client);
          await this.stockService.reverseSale({ gameId: row.game_id, paymentId: row.id, client });
        }
        // Agar shu to'lov referral bonusini ishga tushirgan bo'lsa — bonus ham qaytariladi
        // (aks holda referrer haqiqiy sodir bo'lmagan to'lov uchun pulni saqlab qolardi).
        const reverted = await this.usersRepository.clearReferralRewardIfTriggeredBy(row.id, client);
        if (reverted) {
          await this.usersRepository.adjustBalance(reverted.referrerId, -reverted.amount, client);
        }
      }
      return row;
    });

    if (!payment) {
      throw new AppException(ErrorCode.PAYMENTS_UNDO_NOT_ALLOWED);
    }

    await this.logOrderAudit('order.undo', payment, admin, { previousStatus: payment.previous_status });
    await this.reopenForReview(payment, admin);
    return toPaymentDto(payment);
  }

  /** Buyurtma bo'yicha admin qarorini audit-logga yozadi — kim (admin), qaysi userga tegishli (username/telefon/telegram_id bilan). */
  private async logOrderAudit(
    action: string,
    payment: PaymentRow,
    admin: TelegramUser,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const targetUser = await this.usersRepository.findById(payment.user_id).catch(() => null);
    await this.auditLog.log({
      action,
      actorType: 'admin',
      actorId: admin.id.toString(),
      actorUsername: admin.username ?? null,
      targetUserId: payment.user_id,
      targetTelegramId: targetUser?.telegram_id ?? null,
      targetUsername: targetUser?.username ?? null,
      targetPhone: targetUser?.phone ?? null,
      entityType: 'payment',
      entityId: payment.id,
      metadata: { orderNo: payment.order_no, amount: Number(payment.amount), kind: payment.kind, ...metadata },
    });
  }

  /**
   * User to'lov qilgandan keyin chek/screenshot yuklaydi. Admin bu haqda AYNAN SHU YERDA —
   * chek yuklangandan keyin — birinchi marta xabardor qilinadi (buyurtma yaratilganda emas,
   * hali ko'rib chiqadigan hech narsa yo'q edi). Xabar bitta: chek rasmi + buyurtmaning
   * TO'LIQ ma'lumoti (paket, narx, playerId va h.k.) + Tasdiqlash/Rad etish tugmalari.
   */
  async uploadReceipt(paymentId: string, telegramUser: TelegramUser, file: { buffer: Buffer; originalname: string }): Promise<PaymentDto> {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) throw new AppException(ErrorCode.PAYMENTS_NOT_FOUND);

    const user = await this.usersRepository.findByTelegramId(telegramUser.id);
    if (!user || user.id !== payment.user_id) throw new AppException(ErrorCode.PAYMENTS_NOT_FOUND);
    if (payment.status !== 'pending_review') throw new AppException(ErrorCode.PAYMENTS_ALREADY_DECIDED);

    const detail = await this.paymentsRepository.findByIdWithDetails(paymentId);
    const caption = `🧾 ${this.buildOrderText(detail!)}`;
    const chatId = this.config.get('ADMIN_ALERT_CHAT_ID', { infer: true });

    const result = await this.botService.sendPhoto(chatId, file.buffer, file.originalname, caption, this.decisionButtons(paymentId));
    if (!result) {
      throw new AppException(ErrorCode.PAYMENTS_RECEIPT_UPLOAD_FAILED);
    }
    await this.paymentsRepository.setReceiptMessageId(paymentId, result.message_id);

    // Avvalgi (chek yo'q holatdagi) matn-signal xabarni endi kerak emas — o'chirib tashlaymiz,
    // yangi rasmli xabar uning o'rnini bosadi va shu xabar tahrirlanadigan bo'ladi.
    if (payment.telegram_alert_message_id) {
      await this.botService.deleteMessage(chatId, Number(payment.telegram_alert_message_id));
    }
    await this.paymentsRepository.setTelegramAlert(paymentId, result.message_id, true);

    // O'zimizning "serverimiz"da (Cloudinary) ham saqlaymiz — admin panelida to'g'ridan-to'g'ri
    // ko'rish uchun. Bu ixtiyoriy qatlam: muvaffaqiyatsiz bo'lsa ham asosiy oqim (Telegram'ga
    // yetkazish) allaqachon bajarilgan, shuning uchun xatoni faqat log qilamiz, so'rovni qulatmaymiz.
    const url = await this.cloudinaryService.uploadBuffer(file.buffer, 'receipts');
    if (url) await this.paymentsRepository.setReceiptUrl(paymentId, url);

    const updated = await this.paymentsRepository.findById(paymentId);
    return toPaymentDto(updated!);
  }

  // ---------- Ko'rish ----------

  async listMine(userId: string): Promise<PaymentDetailDto[]> {
    const rows = await this.paymentsRepository.listByUserWithDetails(userId);
    return rows.map(toPaymentDetailDto);
  }

  /** Foydalanuvchi o'z to'lovi holatini kuzatishi (polling) uchun — faqat o'ziniki bo'lsagina qaytadi. */
  async getMineById(paymentId: string, userId: string): Promise<PaymentDto> {
    const row = await this.paymentsRepository.findById(paymentId);
    if (!row || row.user_id !== userId) throw new AppException(ErrorCode.PAYMENTS_NOT_FOUND);
    return toPaymentDto(row);
  }
  

  /** Admin navbati — foydalanuvchi/o'yin nomi bilan birga (kim nima kutayotgani ko'rinsin). */
  async listPending(): Promise<PaymentDetailDto[]> {
    const rows = await this.paymentsRepository.listPendingWithDetails();
    return rows.map(toPaymentDetailDto);
  }

  /** Buyurtmalar tarixi — hal qilingan to'lovlar, admin "kimga nima berilgani"ni ko'rishi uchun. */
  async listDecided(): Promise<PaymentDetailDto[]> {
    const rows = await this.paymentsRepository.listDecidedWithDetails();
    return rows.map(toPaymentDetailDto);
  }

  // ---------- ichki: Telegram xabarlari ----------

  /** Buyurtmaning to'liq matnini quradi — creation-time signal xabari va chek-caption bir xil formatda bo'lishi uchun. */
  private buildOrderText(row: PaymentDetailRow): string {
    const amountText = `${Number(row.amount).toLocaleString('ru-RU')} so'm`;
    const title =
      row.kind === 'topup' ? `💳 Hisobni to'ldirish #${row.order_no}` : `🛒 Buyurtma #${row.order_no} — ${escapeHtml(row.game_name ?? '')}`;
    const lines: string[] = [];
    if (row.kind === 'purchase') lines.push(`Paket: <b>${escapeHtml(row.package_label ?? '')}</b>`);
    lines.push(`${row.kind === 'topup' ? 'Summa' : 'Narx'}: <b>${amountText}</b>`);
    lines.push(`Usul: ${row.method}`);
    if (row.player_info) {
      for (const [k, v] of Object.entries(row.player_info)) lines.push(`${escapeHtml(k)}: <code>${escapeHtml(String(v))}</code>`);
    }
    lines.push(`Foydalanuvchi: ${row.user_username ? '@' + escapeHtml(row.user_username) : row.user_telegram_id}`);
    return `${title}\n\n${lines.join('\n')}`;
  }

  private decisionButtons(paymentId: string) {
    return BotService.inlineKeyboard([
      [
        { text: '✅ Tasdiqlash', callback_data: `pay:approve:${paymentId}` },
        { text: '❌ Rad etish', callback_data: `pay:reject:${paymentId}` },
      ],
    ]);
  }

  /**
   * To'lov hal qilingandan keyin natija IKKI joyga ketadi: (1) userga shaxsiy DM,
   * (2) admin guruhidagi original signal xabari tahrirlanadi. Ikkalasi ham
   * `PaymentNotificationCode` orqali — matn faqat notification-messages.ts'da yoziladi.
   */
  private async notifyUserAndCloseAlert(
    payment: {
      id: string;
      user_id: string;
      telegram_alert_message_id: string | null;
      telegram_alert_is_photo: boolean;
      amount: string;
      kind: string;
      reject_reason: string | null;
    },
    outcome: 'approve' | 'reject',
    admin: TelegramUser,
  ) {
    const amountText = `${Number(payment.amount).toLocaleString('ru-RU')} so'm`;
    const reason = payment.reject_reason ?? undefined;
    const adminLabel = admin.username ? `@${admin.username}` : `${admin.id}`;

    const userCode =
      outcome === 'reject'
        ? PaymentNotificationCode.PAYMENT_REJECTED
        : payment.kind === 'topup'
          ? PaymentNotificationCode.TOPUP_APPROVED
          : PaymentNotificationCode.PURCHASE_APPROVED;

    const user = await this.usersRepository.findById(payment.user_id);
    if (user) {
      await this.botService.sendMessage(BigInt(user.telegram_id), getPaymentNotificationText(userCode, { amountText, reason }));
    }

    if (payment.telegram_alert_message_id) {
      const adminCode = outcome === 'approve' ? PaymentNotificationCode.ADMIN_ALERT_APPROVED : PaymentNotificationCode.ADMIN_ALERT_REJECTED;
      const chatId = this.config.get('ADMIN_ALERT_CHAT_ID', { infer: true });
      // Tasdiqlash/Rad etish tugmalarini olib tashlab, o'rniga faqat "O'zgartirish"ni qoldiramiz
      // (agar admin adashib boshqa foydalanuvchining to'lovini bosgan bo'lsa, shu orqali qaytaradi).
      const undoButton = BotService.inlineKeyboard([[{ text: "↩️ O'zgartirish", callback_data: `pay:undo:${payment.id}` }]]);
      const text = getPaymentNotificationText(adminCode, { amountText, reason, adminLabel });
      if (payment.telegram_alert_is_photo) {
        await this.botService.editMessageCaption(chatId, Number(payment.telegram_alert_message_id), text, undoButton);
      } else {
        await this.botService.editMessageText(chatId, Number(payment.telegram_alert_message_id), text, undoButton);
      }
    }
  }

  /** undo()dan keyin — foydalanuvchiga ogohlantirish, admin xabariga esa asl Tasdiqlash/Rad etish tugmalari qaytariladi. */
  private async reopenForReview(
    payment: {
      id: string;
      order_no: number;
      user_id: string;
      telegram_alert_message_id: string | null;
      telegram_alert_is_photo: boolean;
      amount: string;
    },
    admin: TelegramUser,
  ) {
    const user = await this.usersRepository.findById(payment.user_id);
    if (user) {
      await this.botService.sendMessage(BigInt(user.telegram_id), getPaymentNotificationText(PaymentNotificationCode.PAYMENT_UNDONE));
    }

    if (payment.telegram_alert_message_id) {
      const chatId = this.config.get('ADMIN_ALERT_CHAT_ID', { infer: true });
      const amountText = `${Number(payment.amount).toLocaleString('ru-RU')} so'm`;
      const adminLabel = admin.username ? `@${admin.username}` : `${admin.id}`;
      const text = `🔄 Qayta ko'rib chiqilmoqda — buyurtma #${payment.order_no} — ${amountText}\n(${adminLabel} o'zgartirdi)`;
      const buttons = this.decisionButtons(payment.id);
      if (payment.telegram_alert_is_photo) {
        await this.botService.editMessageCaption(chatId, Number(payment.telegram_alert_message_id), text, buttons);
      } else {
        await this.botService.editMessageText(chatId, Number(payment.telegram_alert_message_id), text, buttons);
      }
    }
  }
}

/** Telegram HTML parse_mode uchun — user kiritgan matn xabarni buzmasin/teg qo'sha olmasin. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
