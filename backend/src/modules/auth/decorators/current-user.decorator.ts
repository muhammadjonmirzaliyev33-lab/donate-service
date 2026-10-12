import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { AppException, ErrorCode } from '../../../common/errors';

/** TelegramAuthGuard yoki AdminGuard'dan keyin controller'da `@CurrentUser() user: TelegramUser` sifatida ishlatiladi. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): TelegramUser => {
  const req = ctx.switchToHttp().getRequest<Request>();
  if (!req.telegramUser) {
    // Dasturchi xatosi: @CurrentUser() TelegramAuthGuard/AdminGuard'siz route'da ishlatilgan.
    throw new AppException(ErrorCode.INTERNAL, "CurrentUser guard'dan oldin chaqirilmoqda — TelegramAuthGuard yo'q");
  }
  return req.telegramUser;
});
