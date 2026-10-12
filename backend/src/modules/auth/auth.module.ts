import { Module } from '@nestjs/common';
import { TelegramAuthService } from './services/telegram-auth.service';
import { TelegramAuthGuard } from './guards/telegram-auth.guard';
import { PhoneRequiredGuard } from './guards/phone-required.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminPingController } from './controllers/admin-ping.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminPingController],
  providers: [TelegramAuthService, TelegramAuthGuard, PhoneRequiredGuard, AdminGuard],
  exports: [TelegramAuthService, TelegramAuthGuard, PhoneRequiredGuard, AdminGuard, AdminAuthModule],
})
export class AuthModule {}
