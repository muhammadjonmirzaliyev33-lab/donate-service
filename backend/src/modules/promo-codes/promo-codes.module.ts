import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PromoCodesController } from './controllers/promo-codes.controller';
import { AdminPromoCodesController } from './controllers/admin-promo-codes.controller';
import { PromoCodesService } from './services/promo-codes.service';
import { PromoCodesRepository } from './repositories/promo-codes.repository';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [PromoCodesController, AdminPromoCodesController],
  providers: [PromoCodesService, PromoCodesRepository],
})
export class PromoCodesModule {}
