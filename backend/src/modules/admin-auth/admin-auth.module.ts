import { Module } from '@nestjs/common';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminAccountsService } from './services/admin-accounts.service';
import { AdminSessionService } from './services/admin-session.service';
import { AdminRefreshTokensRepository } from './repositories/admin-refresh-tokens.repository';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAccountsService, AdminSessionService, AdminRefreshTokensRepository],
  exports: [AdminSessionService],
})
export class AdminAuthModule {}
