import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { HealthController } from './health.controller';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { StockModule } from './modules/stock/stock.module';
import { BotModule } from './modules/bot/bot.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StatsModule } from './modules/stats/stats.module';
import { PaymentCardsModule } from './modules/payment-cards/payment-cards.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BroadcastModule } from './modules/broadcast/broadcast.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { RatingModule } from './modules/rating/rating.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { BannersModule } from './modules/banners/banners.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    AuditLogModule,
    UsersModule,
    CatalogModule,
    StockModule,
    BotModule,
    PaymentsModule,
    StatsModule,
    PaymentCardsModule,
    SettingsModule,
    BroadcastModule,
    UploadsModule,
    PromoCodesModule,
    RatingModule,
    SupplierModule,
    BannersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
