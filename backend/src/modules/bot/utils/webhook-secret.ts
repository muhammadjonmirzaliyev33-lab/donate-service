import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Telegram webhook'i uchun maxfiy kalit — bot tokenidan hosil qilinadi (alohida env shart emas).
 * setWebhook({ secret_token }) bilan Telegram'ga beriladi, Telegram har bir update'da uni
 * `X-Telegram-Bot-Api-Secret-Token` header'ida qaytaradi. Header'siz yoki noto'g'ri header bilan
 * kelgan so'rov — soxta (istalgan odam /bot/webhook'ga "admin bosdi" update'ini yubora olmasin).
 */
export function telegramWebhookSecret(botToken: string): string {
  return createHash('sha256').update(`webhook:${botToken}`).digest('hex');
}

export function isValidTelegramWebhookSecret(botToken: string, header: string | undefined): boolean {
  if (!header) return false;
  const a = Buffer.from(telegramWebhookSecret(botToken));
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
