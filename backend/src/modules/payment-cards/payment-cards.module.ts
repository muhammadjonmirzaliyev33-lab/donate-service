import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentCardsController } from './controllers/payment-cards.controller';
import { AdminPaymentCardsController } from './controllers/admin-payment-cards.controller';
import { PaymentCardsService } from './services/payment-cards.service';
import { PaymentCardsRepository } from './repositories/payment-cards.repository';

@Module({
  imports: [AuthModule],
  controllers: [PaymentCardsController, AdminPaymentCardsController],
  providers: [PaymentCardsService, PaymentCardsRepository],
  exports: [PaymentCardsService],
})
export class PaymentCardsModule {}
