import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL kerak'),
  // Ikkinchi (backup/mirror) baza — masalan Neon. Berilsa, asosiy DB'da muvaffaqiyatli
  // bajarilgan har bir so'rov shu bazaga ham yoziladi (best-effort). Bo'sh qoldirilsa,
  // faqat asosiy DATABASE_URL ishlaydi.
  BACKUP_DATABASE_URL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN kerak'),
  ADMIN_TELEGRAM_IDS: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => BigInt(id)),
    ),
  ADMIN_ALERT_CHAT_ID: z.string().min(1).transform(BigInt),
  FRONTEND_ORIGIN: z.string().min(1),
  // 'polling' — hech qanday ochiq HTTPS domen kerak emas, lokal/dev uchun standart.
  // 'webhook' — production uchun; PUBLIC_URL berilsa, ilova o'zi setWebhook chaqiradi.
  TELEGRAM_BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
  PUBLIC_URL: z.string().optional(),
  // Cheklar/o'yin rasmlarini saqlash uchun (Render diski vaqtinchalik, shu sabab Cloudinary
  // ishlatiladi). Berilmasa, rasm yuklash funksiyalari shunchaki o'chirilgan holda ishlaydi.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Referral linki qurish uchun ("https://t.me/<username>?start=<id>"). Berilmasa, referral
  // linki frontendda ko'rsatilmaydi (funksiya o'chirilgan holda ishlaydi).
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  // PayCore supplier API kaliti — o'yin valyutalarini avtomatik yetkazib berish uchun.
  // Berilmasa, supplier integratsiyasi o'chirilgan holda ishlaydi (hamma narsa qo'lda qoladi).
  PAYCORE_API_KEY: z.string().optional(),
  // MooGold (https://doc.moogold.com) — ikkinchi yetkazib beruvchi. Har bir o'yin uchun
  // qaysi provayder ishlatilishi admin 
  // panelda tanlanadi (games.supplier_provider).
  // Berilmasa, MooGold o'chirilgan holda qoladi (PayCore o'yinlariga ta'sir qilmaydi).
  MOOGOLD_PARTNER_ID: z.string().optional(),
  MOOGOLD_SECRET_KEY: z.string().optional(),
  // CoinDrop (https://coindrop.uz/api-docs) — uchinchi yetkazib beruvchi, X-API-Key bilan
  // autentifikatsiya qilinadi. Berilmasa, CoinDrop o'chirilgan holda qoladi (boshqa
  // provayderlarga ta'sir qilmaydi).
  COINDROP_API_KEY: z.string().optional(),
  // Telefondagi SMS Forwarder dasturidan kelgan webhook'ni tekshirish uchun maxfiy kalit
  // (POST /webhooks/sms). Berilmasa, bu endpoint har doim 401 qaytaradi (o'chirilgan holda).
  SMS_WEBHOOK_SECRET: z.string().optional(),
  // Broadcast xabar yuborishda ikkita so'rov bir vaqtda ishlab, takroriy yuborilib
  // ketmasligi uchun qulf (lock) sifatida ishlatiladi. Berilmasa, qulf ishlamaydi
  // (xabar baribir yuboriladi, faqat bir nechta jarayon orasidagi himoya bo'lmaydi).
  REDIS_URL: z.string().optional(),
});

export type Env = {
  PORT: number;
  DATABASE_URL: string;
  BACKUP_DATABASE_URL?: string;
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_TELEGRAM_IDS: bigint[];
  ADMIN_ALERT_CHAT_ID: bigint;
  FRONTEND_ORIGIN: string;
  TELEGRAM_BOT_MODE: 'polling' | 'webhook';
  PUBLIC_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  TELEGRAM_BOT_USERNAME?: string;
  PAYCORE_API_KEY?: string;
  MOOGOLD_PARTNER_ID?: string;
  MOOGOLD_SECRET_KEY?: string;
  COINDROP_API_KEY?: string;
  SMS_WEBHOOK_SECRET?: string;
  REDIS_URL?: string;
};

export function validateEnv(config: Record<string, unknown>): Env {
  // Render har bir servisga RENDER_EXTERNAL_URL beradi (https://<nom>.onrender.com). Mini App shu
  // serverning o'zidan beriladi — shuning uchun PUBLIC_URL/FRONTEND_ORIGIN qo'lda yozilmasa ham ishlaydi.
  const autoUrl = (config.PUBLIC_URL as string | undefined) || (config.RENDER_EXTERNAL_URL as string | undefined);
  const withDefaults = {
    ...config,
    PUBLIC_URL: autoUrl,
    FRONTEND_ORIGIN: (config.FRONTEND_ORIGIN as string | undefined) || autoUrl,
  };
  const parsed = envSchema.safeParse(withDefaults);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Noto'g'ri .env sozlamalari:\n${issues}`);
  }
  return parsed.data;
}
