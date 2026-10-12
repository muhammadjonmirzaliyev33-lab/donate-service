import { BotMessageCode } from './bot-message.enum';

export type BotLang = 'uz' | 'ru';

interface PhoneSavedParams {
  phone: string;
}

interface WelcomeParams {
  name: string;
}

type Params = PhoneSavedParams | WelcomeParams | undefined;

const BOT_TEXT: Record<BotMessageCode, Record<BotLang, (params?: Params) => string>> = {
  [BotMessageCode.LANGUAGE_SAVED]: {
    uz: () => '✅ Til: Oʻzbekcha',
    ru: () => '✅ Язык: Русский',
  },
  [BotMessageCode.ASK_PHONE]: {
    uz: () => "Davom etish uchun telefon raqamingizni ulashing 👇",
    ru: () => 'Чтобы продолжить, поделитесь номером телефона 👇',
  },
  [BotMessageCode.SHARE_PHONE_BUTTON]: {
    uz: () => '📱 Telefon raqamni ulashish',
    ru: () => '📱 Поделиться номером',
  },
  [BotMessageCode.INVALID_CONTACT]: {
    uz: () => "❗️ Iltimos, faqat o'zingizning raqamingizni ulashing.",
    ru: () => '❗️ Пожалуйста, поделитесь СВОИМ номером.',
  },
  [BotMessageCode.PHONE_SAVED]: {
    uz: (p) => `✅ Raqam saqlandi: ${(p as PhoneSavedParams).phone}`,
    ru: (p) => `✅ Номер сохранён: ${(p as PhoneSavedParams).phone}`,
  },
  [BotMessageCode.OPEN_APP_BUTTON]: {
    uz: () => "🚀 Do'konni ochish",
    ru: () => '🚀 Открыть магазин',
  },
  [BotMessageCode.WELCOME_BACK]: {
    uz: (p) => `Xush kelibsiz, ${(p as WelcomeParams).name}! 👋`,
    ru: (p) => `Добро пожаловать, ${(p as WelcomeParams).name}! 👋`,
  },
};

export function getBotText(code: BotMessageCode, lang: BotLang, params?: Params): string {
  return BOT_TEXT[code][lang](params);
}

/** Til hali noma'lum bo'lganda (birinchi /start) — ikkala tilda birga ko'rsatiladi. */
export const CHOOSE_LANGUAGE_TEXT = "🌐 Tilni tanlang / Выберите язык";
