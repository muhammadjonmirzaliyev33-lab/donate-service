import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { PaymentsRepository } from '../repositories/payments.repository';
import { PaymentEventsRepository } from '../repositories/payment-events.repository';
import { PaymentsService } from './payments.service';
import { BotService } from '../../bot/services/bot.service';
import { PaymentCardsService } from '../../payment-cards/services/payment-cards.service';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import type { PaymentRow } from '../dto/payment.dto';

/** SMS/notification'da match_amount topilmagan taqdirda — summa+vaqt oynasi bo'yicha qidiriladigan davr. */
const MATCH_WINDOW_MINUTES = 120;

/** `decide()` "kim tasdiqladi" deb admin_id/username sifatida shuni yozadi — real admin
 * telegram_id'lari hech qachon 0 bo'lmaydi, shuning uchun tarixda aniq ajralib turadi. */
const PAYMENT_BOT_ADMIN: TelegramUser = { id: BigInt(0), username: 'sms-bot', firstName: 'Avtomatik' };

/**
 * Bank/Click/Payme SMS yoki notification matnidan summani ajratib oladi. Format provayderga
 * qarab har xil bo'lgani uchun (masalan "50 000 so'm", "50,000 sum", "150.000 UZS") — qattiq
 * shablon emas, "so'm/sum/сум/uzs" so'zidan oldingi raqamlar guruhini umumiy qidiradi.
 */
function extractAmount(text: string): number | null {
  const match = text.match(/([\d][\d\s.,]{2,})\s*(so'?m|сум|sum|uzs)/i);
  if (!match) return null;
  // Oxiridagi ".00"/",00" (tiyin/kasr qismi) — chiziqni raqamga aylantirsak "500000"ga
  // aylanib ketmasligi uchun avval shuni tashlab yuboramiz, keyingina qolgan
  // bo'shliq/vergul/nuqtalarni (minglik ajratgich) olib tashlaymiz.
  const raw = match[1].trim().replace(/[.,](\d{2})$/, '');
  const digits = raw.replace(/[^\d]/g, '');
  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/**
 * User checkout ekranida o'tkazma "Izoh"iga #<orderNo> yozishi so'raladi (paymentFlow.ts).
 * Ba'zi provayderlar (masalan Click/Payme) shu izohni qabul qiluvchiga SMS/notification'da
 * ham ko'rsatadi — shunday bo'lsa, bu match_amount'dan HAM aniqroq signal.
 */
function extractOrderNo(text: string): number | null {
  const match = text.match(/#(\d{2,})/);
  return match ? Number(match[1]) : null;
}

/** SMS/notification'dagi karta oxirgi 4 raqami (masalan "*1234" yoki "1234 ****"). */
function extractCardTail(text: string): string | null {
  const match = text.match(/\*\s?(\d{4})\b/) ?? text.match(/\b(\d{4})\s?\*{2,}/);
  return match ? match[1] : null;
}

/**
 * Telefon SMS Forwarder'i ODDIY SMS'larni ham (operator xabarlari — "abonent tarmoqqa
 * qaytdi" va h.k.) yuborishi mumkin. Bunday matnlarda summa tabiiy ravishda topilmaydi —
 * ularning HAR biri uchun admin chatiga "summani aniqlab bo'lmadi" deb xabar yuborish
 * shovqin yaratadi. Shu sabab, to'lovga umuman o'xshamagan matnlar uchun jim o'tkazib
 * yuboriladi (faqat debug logga yoziladi); to'lovga o'xshab-u summasi o'qilmagan
 * matnlar uchungina admin xabar oladi (bular haqiqatan tekshirishga arziydi).
 */
const PAYMENT_LOOKALIKE = /(so'?m|сум|sum|uzs|karta|карта|click|payme|to'lov|оплата|перевод|tushdi|hisob|balans|баланс)/i;

function looksLikePayment(text: string): boolean {
  return PAYMENT_LOOKALIKE.test(text);
}

@Injectable()
export class PaymentMatcherService {
  private readonly logger = new Logger(PaymentMatcherService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentEventsRepository: PaymentEventsRepository,
    private readonly paymentsService: PaymentsService,
    private readonly paymentCardsService: PaymentCardsService,
    private readonly botService: BotService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** `SMS_WEBHOOK_SECRET` bir nechta qurilma uchun vergul bilan ajratilgan token ro'yxati bo'lishi mumkin. */
  isValidToken(token: string): boolean {
    const configured = this.config.get('SMS_WEBHOOK_SECRET', { infer: true });
    if (!configured) return false;
    const allowed = configured
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return allowed.includes(token);
  }

  /**
   * SMS yoki notification kelganda chaqiriladi. Moslashtirish zanjiri:
   *   1. Buyurtma raqami (#123, agar matnda bo'lsa) — eng aniq.
   *   2. match_amount — DB darajasida noyob, deyarli har doim aniq.
   *   3. Summa + vaqt oynasi — zaxira, faqat BITTA nomzod bo'lsa avtomatik tasdiqlaydi.
   * Har bir chaqiruv natijasi (topildi/noaniq/topilmadi/o'qilmadi/shovqin) `payment_events`ga yoziladi.
   */
  async handle(source: string, text: string): Promise<void> {
    const chatId = this.config.get('ADMIN_ALERT_CHAT_ID', { infer: true });

    // 1 va 2-bosqich (order-raqam, noyob match_amount) atayin karta-tekshiruvidan OLDIN
    // ishlaydi: bular allaqachon o'ta aniq signal (match_amount tasodifiy va DB darajasida
    // noyob), shuning uchun matndan noto'g'ri/mos kelmaydigan karta oxiri o'qilib qolishi
    // (masalan notification shabloni boshqa maydonni ushlab olsa) haqiqiy to'lovni
    // bloklamasligi kerak — karta-tekshiruv faqat zaxira (3-bosqich) uchun shovqin filtri.
    const orderNo = extractOrderNo(text);
    if (orderNo) {
      const payment = await this.paymentsRepository.findPendingByOrderNo(orderNo);
      if (payment) {
        await this.approve(payment, chatId, source, text, { parsedOrderNo: orderNo });
        return;
      }
      // #raqam matnda bor, lekin bunday kutilayotgan buyurtma yo'q — ehtimol boshqa
      // maqsaddagi o'tkazma yoki eskirgan/hal qilingan buyurtma, davom etamiz.
    }

    const amount = extractAmount(text);
    if (amount) {
      const exact = await this.paymentsRepository.findPendingByMatchAmount(amount);
      if (exact) {
        await this.approve(exact, chatId, source, text, { parsedAmount: amount, parsedOrderNo: orderNo });
        return;
      }
    }

    if (await this.rejectAsNoise(source, text)) return;

    if (!amount) {
      if (!looksLikePayment(text)) {
        await this.paymentEventsRepository.record({ source, rawText: text, outcome: 'ignored_noise' });
        this.logger.debug(`To'lovga aloqasi yo'q signal e'tiborsiz qoldirildi: ${text}`);
        return;
      }
      await this.paymentEventsRepository.record({ source, rawText: text, parsedOrderNo: orderNo, outcome: 'unparsed' });
      this.logger.warn(`Summa aniqlanmadi: ${text}`);
      await this.botService.sendMessage(chatId, `📩 ${sourceLabel(source)} keldi, lekin summani aniqlab bo'lmadi:\n<code>${escapeHtml(text)}</code>`);
      return;
    }

    // 3-bosqich: zaxira — summa + vaqt oynasi (eski to'lovlar yoki match_amount ajratilmagan holatlar uchun).
    const candidates = await this.paymentsRepository.listPendingByAmount(amount, MATCH_WINDOW_MINUTES);
    const amountText = `${amount.toLocaleString('ru-RU')} so'm`;

    if (candidates.length === 0) {
      await this.paymentEventsRepository.record({ source, rawText: text, parsedAmount: amount, parsedOrderNo: orderNo, outcome: 'not_found' });
      await this.botService.sendMessage(
        chatId,
        `📩 ${sourceLabel(source)} keldi (${amountText}) — mos kutilayotgan to'lov topilmadi.\n<code>${escapeHtml(text)}</code>`,
      );
      return;
    }

    if (candidates.length > 1) {
      const list = candidates.map((p) => `#${p.order_no}`).join(', ');
      await this.paymentEventsRepository.record({ source, rawText: text, parsedAmount: amount, parsedOrderNo: orderNo, outcome: 'ambiguous' });
      await this.botService.sendMessage(
        chatId,
        `🔐 Xavfsizlikni tekshiring: bir vaqtda ${candidates.length} ta bir xil summadagi (${amountText}) to'lov bor — ${list}. ` +
          `Avtomatik hech qaysini tasdiqlamadi (adashib boshqa userga pul/o'yin berib qo'yish xavfi bor). ` +
          `Bank ilovasidan qaysi buyurtma haqiqatan to'langanini tekshirib, o'sha birontasini qo'lda tasdiqlang.\n<code>${escapeHtml(text)}</code>`,
      );
      return;
    }

    await this.approve(candidates[0], chatId, source, text, { parsedAmount: amount, parsedOrderNo: orderNo });
  }

  /** SMS'da karta oxiri bo'lsa-yu, bizning ro'yxatdagi kartalarga mos kelmasa — bu telefon
   * ekranidagi boshqa (bizga aloqasi yo'q) shaxsiy tranzaksiya, e'tiborsiz qoldiramiz. */
  private async rejectAsNoise(source: string, text: string): Promise<boolean> {
    const tail = extractCardTail(text);
    if (!tail) return false;
    const cards = await this.paymentCardsService.listActive();
    const knownTails = cards.map((c) => c.cardNumber.replace(/\D/g, '').slice(-4));
    if (knownTails.length === 0 || knownTails.includes(tail)) return false;
    await this.paymentEventsRepository.record({ source, rawText: text, outcome: 'ignored_noise' });
    this.logger.debug(`Notanish kartaga tegishli signal e'tiborsiz qoldirildi (*${tail}): ${text}`);
    return true;
  }

  private async approve(
    payment: PaymentRow,
    chatId: bigint,
    source: string,
    smsText: string,
    parsed: { parsedAmount?: number | null; parsedOrderNo?: number | null },
  ): Promise<void> {
    try {
      await this.paymentsService.decide(payment.id, PAYMENT_BOT_ADMIN, 'approve');
      await this.paymentEventsRepository.record({
        source,
        rawText: smsText,
        parsedAmount: parsed.parsedAmount,
        parsedOrderNo: parsed.parsedOrderNo,
        matchedPaymentId: payment.id,
        outcome: 'matched',
      });
      this.logger.log(`Avtomatik tasdiqlandi: #${payment.order_no} (${source})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Avtomatik tasdiqlash muvaffaqiyatsiz (#${payment.order_no}): ${message}`);
      await this.paymentEventsRepository.record({
        source,
        rawText: smsText,
        parsedAmount: parsed.parsedAmount,
        parsedOrderNo: parsed.parsedOrderNo,
        matchedPaymentId: payment.id,
        outcome: 'not_found',
      });
      await this.botService.sendMessage(
        chatId,
        `⚠️ ${sourceLabel(source)} orqali #${payment.order_no}ni tasdiqlashda xato: ${message}. Qo'lda tekshiring.\n<code>${escapeHtml(smsText)}</code>`,
      );
    }
  }
}

function sourceLabel(source: string): string {
  return source === 'notification' ? 'Notification' : 'SMS';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
