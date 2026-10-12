import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../../auth/guards/telegram-auth.guard';
import { PhoneRequiredGuard } from '../../auth/guards/phone-required.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UsersRepository } from '../../users/repositories/users.repository';
import { PromoCodesService } from '../services/promo-codes.service';
import { redeemPromoCodeSchema, type RedeemPromoCodeInput } from '../schemas/promo-code.schema';

@UseGuards(TelegramAuthGuard, PhoneRequiredGuard)
@Controller('promo-codes')
export class PromoCodesController {
  constructor(
    private readonly service: PromoCodesService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Post('redeem')
  async redeem(
    @Body(new ZodValidationPipe(redeemPromoCodeSchema)) body: RedeemPromoCodeInput,
    @CurrentUser() telegramUser: TelegramUser,
  ) {
    const user = await this.usersRepository.upsert({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
    });
    return this.service.redeem(user.id, body.code);
  }
}
