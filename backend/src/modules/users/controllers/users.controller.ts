import { Controller, Get, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../../auth/guards/telegram-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { UsersService } from '../services/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(TelegramAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: TelegramUser) {
    return this.usersService.syncFromTelegram(user);
  }

  @UseGuards(TelegramAuthGuard)
  @Get('me/referrals')
  async myReferrals(@CurrentUser() user: TelegramUser) {
    return this.usersService.getReferralSummary(user);
  }
}
