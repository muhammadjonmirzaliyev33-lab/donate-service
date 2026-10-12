import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CatalogModule } from '../catalog/catalog.module';
import { StockModule } from '../stock/stock.module';
import { BotModule } from '../bot/bot.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SettingsModule } from '../settings/settings.module';
import { SupplierModule } from '../supplier/supplier.module';
import { PaymentCardsModule } from '../payment-cards/payment-cards.module';
import { PaymentsController } from './controllers/payments.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { BotWebhookController } from './controllers/bot-webhook.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentsService } from './services/payments.service';
import { PaymentsRepository } from './repositories/payments.repository';
import { PaymentEventsRepository } from './repositories/payment-events.repository';
import { BotUpdateService } from './services/bot-update.service';
import { BotLifecycleService } from './services/bot-lifecycle.service';
import { SupplierPollingService } from './services/supplier-polling.service';
import { PaymentMatcherService } from './services/payment-matcher.service';
import { PaymentExpiryService } from './services/payment-expiry.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CatalogModule,
    StockModule,
    BotModule,
    UploadsModule,
    SettingsModule,
    SupplierModule,
    PaymentCardsModule,
  ],
  controllers: [PaymentsController, AdminPaymentsController, BotWebhookController, PaymentWebhookController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentEventsRepository,
    BotUpdateService,
    BotLifecycleService,
    SupplierPollingService,
    PaymentMatcherService,
    PaymentExpiryService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
