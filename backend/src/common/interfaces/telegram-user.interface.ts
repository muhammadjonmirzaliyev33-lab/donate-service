export interface TelegramUser {
  id: bigint;
  username?: string;
  firstName?: string;
}

// Express Request'ga qo'shiladigan maydon uchun global tur kengaytmasi.
declare module 'express' {
  interface Request {
    telegramUser?: TelegramUser;
  }
}
