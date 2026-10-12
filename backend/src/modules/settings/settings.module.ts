import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SettingsController } from './controllers/settings.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { SettingsService } from './services/settings.service';
import { SettingsRepository } from './repositories/settings.repository';

@Module({
  imports: [AuthModule],
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
