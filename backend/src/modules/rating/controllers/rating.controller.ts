import { Controller, Get, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../../auth/guards/telegram-auth.guard';
import { PhoneRequiredGuard } from '../../auth/guards/phone-required.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { RatingService } from '../services/rating.service';

@UseGuards(TelegramAuthGuard, PhoneRequiredGuard)
@Controller('rating')
export class RatingController {
  constructor(private readonly service: RatingService) {}

  @Get()
  get(@CurrentUser() user: TelegramUser) {
    return this.service.get(user);
  }
}
