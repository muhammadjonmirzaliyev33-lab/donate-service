import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

/** Har bir kodning standart HTTP holati + o'zbekcha matni — bitta yagona manba. */
export const ERROR_DEFINITIONS: Record<ErrorCode, { status: HttpStatus; message: string }> = {
  [ErrorCode.AUTH_MISSING_INIT_DATA]: { status: HttpStatus.UNAUTHORIZED, message: "X-Telegram-Init-Data header'i yo'q" },
  [ErrorCode.AUTH_MISSING_HASH]: { status: HttpStatus.UNAUTHORIZED, message: "initData'da hash yo'q" },
  [ErrorCode.AUTH_INVALID_SIGNATURE]: { status: HttpStatus.UNAUTHORIZED, message: "initData imzosi noto'g'ri" },
  [ErrorCode.AUTH_INIT_DATA_EXPIRED]: { status: HttpStatus.UNAUTHORIZED, message: 'initData muddati o‘tgan' },
  [ErrorCode.AUTH_MISSING_USER]: { status: HttpStatus.UNAUTHORIZED, message: "initData'da user yo'q" },
  [ErrorCode.AUTH_PHONE_NOT_SHARED]: { status: HttpStatus.FORBIDDEN, message: "Avval botga telefon raqamingizni ulashing" },
  [ErrorCode.AUTH_NOT_ADMIN]: { status: HttpStatus.FORBIDDEN, message: 'Admin huquqi yo‘q' },
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: { status: HttpStatus.UNAUTHORIZED, message: "Login yoki parol noto'g'ri" },
  [ErrorCode.AUTH_INVALID_SESSION]: { status: HttpStatus.UNAUTHORIZED, message: 'Sessiya tugagan, qayta kiring' },

  [ErrorCode.CATALOG_GAME_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: "O'yin topilmadi" },
  [ErrorCode.CATALOG_GAME_INACTIVE]: { status: HttpStatus.NOT_FOUND, message: "O'yin topilmadi yoki faol emas" },
  [ErrorCode.CATALOG_PACKAGE_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'Paket topilmadi yoki faol emas' },

  [ErrorCode.PAYMENTS_INSUFFICIENT_BALANCE]: { status: HttpStatus.BAD_REQUEST, message: 'Balans yetarli emas' },
  [ErrorCode.PAYMENTS_ALREADY_DECIDED]: { status: HttpStatus.CONFLICT, message: 'Bu to‘lov allaqachon hal qilingan' },
  [ErrorCode.PAYMENTS_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: "To'lov topilmadi" },
  [ErrorCode.PAYMENTS_RECEIPT_UPLOAD_FAILED]: { status: HttpStatus.BAD_GATEWAY, message: 'Chekni yuborib bo‘lmadi, birozdan keyin qayta urinib ko‘ring' },
  [ErrorCode.PAYMENTS_UNDO_NOT_ALLOWED]: { status: HttpStatus.CONFLICT, message: 'Bu to‘lovni o‘zgartirib bo‘lmaydi (hali hal qilinmagan)' },

  [ErrorCode.PAYMENT_CARD_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'Karta topilmadi' },

  [ErrorCode.PROMO_CODE_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'Bunday promokod topilmadi' },
  [ErrorCode.PROMO_CODE_ALREADY_EXISTS]: { status: HttpStatus.CONFLICT, message: 'Bu kod allaqachon mavjud' },
  [ErrorCode.PROMO_CODE_INACTIVE]: { status: HttpStatus.CONFLICT, message: "Bu promokod faol emas" },
  [ErrorCode.PROMO_CODE_EXPIRED]: { status: HttpStatus.CONFLICT, message: 'Bu promokodning muddati tugagan' },
  [ErrorCode.PROMO_CODE_ALREADY_REDEEMED]: { status: HttpStatus.CONFLICT, message: 'Siz bu promokodni allaqachon ishlatgansiz' },

  [ErrorCode.BROADCAST_IN_PROGRESS]: { status: HttpStatus.CONFLICT, message: 'Boshqa xabar hali yuborilmoqda, birozdan keyin qayta urinib ko‘ring' },

  [ErrorCode.RESOURCE_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'Topilmadi' },
  [ErrorCode.VALIDATION_FAILED]: { status: HttpStatus.BAD_REQUEST, message: "Kiritilgan ma'lumot noto'g'ri" },
  [ErrorCode.INTERNAL]: { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Server xatosi' },
};
