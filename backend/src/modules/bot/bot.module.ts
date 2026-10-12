import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BotService } from './services/bot.service';
import { BotOnboardingService } from './services/bot-onboarding.service';

@Module({
  imports: [UsersModule],
  providers: [BotService, BotOnboardingService],
  exports: [BotService, BotOnboardingService],
})
export class BotModule {}
