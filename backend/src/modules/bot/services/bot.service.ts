import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';

/**
 * Telegram `chat_id`: raqamli id (user/guruh) yoki ommaviy kanal/guruh uchun "@username".
 * Admin signal chati .env'da ikkala ko'rinishda ham berilishi mumkin.
 */
export type ChatId = bigint | number | string;

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

/** Telegram sendMessage/editMessageText'ning `reply_markup` maydoni — inline, oddiy yoki "olib tashlash". */
export type ReplyMarkup = Record<string, unknown>;

/** getUpdates natijasidagi xom update — nima ichida borligi (message/callback_query) chaqiruvchiga bog'liq. */
export interface TelegramUpdatePayload {
  update_id: number;
  [key: string]: unknown;
}

/** `fetch()` xatosi ko'pincha "fetch failed" deb qisqartirilgan bo'ladi — asl sabab (masalan
 * ENETUNREACH, DNS xatosi) `err.cause`da yashiringan, shuni ham chiqarib beramiz. */
function describeFetchError(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? `${err.message} — ${cause.message}` : err.message;
  }
  return String(err);
}

/** Telegram Bot API bilan minimal ishlash — SDK shart emas, oddiy HTTP so'rovlar yetarli. */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly apiBase: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.apiBase = `https://api.telegram.org/bot${this.config.get('TELEGRAM_BOT_TOKEN', { infer: true })}`;
  }

  private async call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
    try {
      const res = await fetch(`${this.apiBase}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
      if (!json.ok) {
        this.logger.warn(`Telegram API xatosi (${method}): ${json.description}`);
        return null;
      }
      return json.result ?? null;
    } catch (err) {
      this.logger.error(`Telegram API so'rovi bajarilmadi (${method}): ${describeFetchError(err)}`);
      return null;
    }
  }

  sendMessage(chatId: ChatId, text: string, replyMarkup?: ReplyMarkup) {
    return this.call<{ message_id: number }>('sendMessage', {
      chat_id: chatId.toString(),
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }

  editMessageText(chatId: ChatId, messageId: number, text: string, replyMarkup?: ReplyMarkup) {
    return this.call('editMessageText', {
      chat_id: chatId.toString(),
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }

  answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.call('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
  }

  /** Rasmli xabarning caption'ini tahrirlaydi — editMessageText photo xabarlarida ishlamaydi. */
  editMessageCaption(chatId: ChatId, messageId: number, caption: string, replyMarkup?: ReplyMarkup) {
    return this.call('editMessageCaption', {
      chat_id: chatId.toString(),
      message_id: messageId,
      caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }

  deleteMessage(chatId: ChatId, messageId: number) {
    return this.call('deleteMessage', { chat_id: chatId.toString(), message_id: messageId });
  }

  /** Chek/screenshot kabi rasmlarni yuborish uchun — multipart/form-data orqali. */
  async sendPhoto(chatId: ChatId, buffer: Buffer, filename: string, caption?: string, replyMarkup?: ReplyMarkup) {
    try {
      const form = new FormData();
      form.append('chat_id', chatId.toString());
      if (caption) form.append('caption', caption);
      if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
      form.append('photo', new Blob([new Uint8Array(buffer)]), filename);

      const res = await fetch(`${this.apiBase}/sendPhoto`, { method: 'POST', body: form });
      const json = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
      if (!json.ok) {
        this.logger.warn(`Telegram API xatosi (sendPhoto): ${json.description}`);
        return null;
      }
      return json.result ?? null;
    } catch (err) {
      this.logger.error(`Telegram API so'rovi bajarilmadi (sendPhoto): ${describeFetchError(err)}`);
      return null;
    }
  }

  /** Rasmni URL orqali yuboradi (masalan Cloudinary'da allaqachon joylashgan rasm) — buferni qayta yuklab olish shart emas. */
  sendPhotoByUrl(chatId: ChatId, url: string, caption?: string, replyMarkup?: ReplyMarkup) {
    return this.call<{ message_id: number }>('sendPhoto', {
      chat_id: chatId.toString(),
      photo: url,
      caption,
      parse_mode: caption ? 'HTML' : undefined,
      reply_markup: replyMarkup,
    });
  }

  /** 2-5 ta rasmni bitta albom sifatida yuboradi — caption faqat birinchi rasmga qo'yiladi (Telegram shu tarzda ko'rsatadi). */
  sendMediaGroup(chatId: ChatId, urls: string[], caption?: string) {
    return this.call<{ message_id: number }[]>('sendMediaGroup', {
      chat_id: chatId.toString(),
      media: urls.map((url, i) => ({
        type: 'photo',
        media: url,
        ...(i === 0 && caption ? { caption, parse_mode: 'HTML' } : {}),
      })),
    });
  }

  // ---------- yangilanishlarni olish: polling yoki webhook ----------

  /** Uzoq-so'rov (long-poll). `timeoutSeconds` davomida Telegram yangilanish bo'lguncha ushlab turadi. */
  async getUpdates(offset: number, timeoutSeconds: number): Promise<TelegramUpdatePayload[]> {
    const res = await fetch(`${this.apiBase}/getUpdates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ offset, timeout: timeoutSeconds }),
      signal: AbortSignal.timeout((timeoutSeconds + 10) * 1000),
    });
    const json = (await res.json()) as { ok: boolean; result?: TelegramUpdatePayload[]; description?: string };
    if (!json.ok) {
      throw new Error(json.description ?? 'getUpdates xatosi');
    }
    return json.result ?? [];
  }

  /** Botning pastki chapdagi menyu tugmasi (hamma foydalanuvchilar uchun) — Mini App'ni ochadi. */
  setMenuWebApp(text: string, url: string) {
    return this.call('setChatMenuButton', { menu_button: { type: 'web_app', text, web_app: { url } } });
  }

  deleteWebhook() {
    return this.call('deleteWebhook', {});
  }

  setWebhook(url: string, secretToken: string) {
    return this.call('setWebhook', { url, secret_token: secretToken });
  }

  // ---------- reply_markup quruvchilari ----------

  static inlineKeyboard(buttons: InlineButton[][]): ReplyMarkup {
    return { inline_keyboard: buttons };
  }

  /** Faqat "raqamni ulashish" tugmasi bo'lgan oddiy klaviatura (request_contact). */
  static contactRequestKeyboard(buttonText: string): ReplyMarkup {
    return {
      keyboard: [[{ text: buttonText, request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  static removeKeyboard(): ReplyMarkup {
    return { remove_keyboard: true };
  }
}
