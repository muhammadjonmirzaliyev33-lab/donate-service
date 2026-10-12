import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';
import { ERROR_DEFINITIONS } from './error-definitions';

/**
 * Loyihadagi barcha HTTP xatolar shu klass orqali otiladi. Javob har doim
 * `{ statusCode, code, message, details? }` shaklida bo'ladi — `code` barqaror
 * (frontend/bot shu bo'yicha filiallashi kerak), `message` faqat ko'rsatish uchun.
 */
export class AppException extends HttpException {
  constructor(code: ErrorCode, messageOverride?: string, details?: unknown) {
    const def = ERROR_DEFINITIONS[code];
    super(
      {
        statusCode: def.status,
        code,
        message: messageOverride ?? def.message,
        ...(details !== undefined ? { details } : {}),
      },
      def.status,
    );
  }
}
