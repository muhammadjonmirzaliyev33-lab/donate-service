import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { UsersRepository } from '../../users/repositories/users.repository';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { BotService } from './bot.service';
import { BotMessageCode } from '../messages/bot-message.enum';
import { CHOOSE_LANGUAGE_TEXT, getBotText, type BotLang } from '../messages/bot-messages';

interface TelegramFrom {
  id: number;
  username?: string;
  first_name?: string;
}

/**
 * /start orqali kirgan yangi foydalanuvchini "til tanlash → telefon ulashish →
 * do'konni ochish" bosqichlaridan o'tkazadi. Har bir bosqich BotMessageCode
 * orqali localizatsiya qilinadi (bot-messages.ts).
 */
@Injectable()
export class BotOnboardingService {
  constructor(
    private readonly botService: BotService,
    private readonly usersRepository: UsersRepository,
    private readonly config: ConfigService<Env, true>,
    private readonly auditLog: AuditLogService,
  ) {}

  async handleStart(chatId: number, from: TelegramFrom, startPayload?: string) {
    const telegramId = BigInt(from.id);
    const referredBy = await this.resolveReferrer(telegramId, startPayload);
    const user = await this.usersRepository.upsert({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      referredBy,
    });

    if (user.phone) {
      // Qaytgan foydalanuvchi — barcha bosqichlardan allaqachon o'tgan.
      await this.sendOpenAppMessage(chatId, user.language, from.first_name ?? '');
      return;
    }

    await this.botService.sendMessage(
      chatId,
      CHOOSE_LANGUAGE_TEXT,
      BotService.inlineKeyboard([
        [
          { text: "🇺🇿 O'zbekcha", callback_data: 'lang:uz' },
          { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
        ],
      ]),
    );
  }

  async handleLanguageChoice(chatId: number, messageId: number, from: TelegramFrom, lang: BotLang) {
    const telegramId = BigInt(from.id);
    await this.usersRepository.setLanguage(telegramId, lang);

    // Do'konga o'tish tugmasi telefon ulashilgunga qadar chiqmaydi — sayt faqat
    // handleContact() orqali, raqam saqlangandan keyin ochiladi.
    await this.botService.editMessageText(chatId, messageId, getBotText(BotMessageCode.LANGUAGE_SAVED, lang));

    await this.botService.sendMessage(
      chatId,
      getBotText(BotMessageCode.ASK_PHONE, lang),
      BotService.contactRequestKeyboard(getBotText(BotMessageCode.SHARE_PHONE_BUTTON, lang)),
    );
  }

  async handleContact(chatId: number, from: TelegramFrom, contact: { user_id?: number; phone_number: string }) {
    const telegramId = BigInt(from.id);
    const user = await this.usersRepository.findByTelegramId(telegramId);
    const lang: BotLang = user?.language ?? 'uz';

    if (contact.user_id !== from.id) {
      // Boshqa birovning kontaktini forward qilib yuborgan — o'zinikini so'raymiz.
      await this.botService.sendMessage(chatId, getBotText(BotMessageCode.INVALID_CONTACT, lang));
      return;
    }

    const phone = contact.phone_number.startsWith('+') ? contact.phone_number : `+${contact.phone_number}`;
    const updated = await this.usersRepository.setPhone(telegramId, phone);

    await this.auditLog.log({
      action: 'user.phone_shared',
      actorType: 'user',
      actorId: telegramId.toString(),
      actorUsername: from.username ?? null,
      targetUserId: updated.id,
      targetTelegramId: telegramId.toString(),
      targetUsername: from.username ?? null,
      targetPhone: phone,
    });

    await this.botService.sendMessage(chatId, getBotText(BotMessageCode.PHONE_SAVED, lang, { phone }), BotService.removeKeyboard());
    await this.sendOpenAppMessage(chatId, lang, from.first_name ?? '');
  }

  /**
   * `/start <referrerTelegramId>` deep-link orqali kelgan bo'lsa — kim taklif qilganini aniqlaydi.
   * Faqat HAQIQIY YANGI user uchun (allaqachon mavjud userlarning referred_by'i o'zgarmasligi kerak),
   * o'zini-o'zi taklif qilishni va noma'lum referrerni rad etadi.
   */
  private async resolveReferrer(telegramId: bigint, startPayload?: string): Promise<string | undefined> {
    if (!startPayload || !/^\d+$/.test(startPayload)) return undefined;

    const alreadyExists = await this.usersRepository.findByTelegramId(telegramId);
    if (alreadyExists) return undefined;

    const referrerTelegramId = BigInt(startPayload);
    if (referrerTelegramId === telegramId) return undefined;

    const referrer = await this.usersRepository.findByTelegramId(referrerTelegramId);
    return referrer?.id;
  }

  private async sendOpenAppMessage(chatId: number, lang: BotLang, name: string) {
    const text = getBotText(BotMessageCode.WELCOME_BACK, lang, { name });
    await this.botService.sendMessage(chatId, text, this.openAppButton(lang));
  }

  /**
   * "🚀 Do'konni ochish" — web_app tugmasi, haqiqiy frontend manziliga ochiladi.
   * FRONTEND_ORIGIN CORS uchun vergul bilan ajratilgan bir nechta domenni saqlashi mumkin
   * (masalan "https://komakpay.uz,https://admin.komakpay.uz") — Telegram esa web_app.url'ga
   * FAQAT bitta aniq URL qabul qiladi, shuning uchun ro'yxatdagi birinchisini (asosiy
   * Mini App domeni) olamiz.
   */
  private openAppButton(lang: BotLang) {
    const frontendUrl = this.config.get('FRONTEND_ORIGIN', { infer: true }).split(',')[0].trim();
    return BotService.inlineKeyboard([[{ text: getBotText(BotMessageCode.OPEN_APP_BUTTON, lang), web_app: { url: frontendUrl } }]]);
  }
}
