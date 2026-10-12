import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSupplierController } from './controllers/admin-supplier.controller';
import { PayCoreClientService } from './services/paycore-client.service';
import { MoogoldClientService } from './services/moogold-client.service';
import { CoinDropClientService } from './services/coindrop-client.service';
import { SupplierFulfillmentService } from './services/supplier-fulfillment.service';

/**
 * Yetkazib beruvchilar (PayCore, MooGold, CoinDrop) bilan bog'lanish — generik HTTP
 * clientlar + buyurtma tuzish. Bu modul "to'lov" haqida hech narsa bilmaydi (faqat
 * provider/category/slug/player_info oladi), shu bilan PaymentsModule'ga bog'liq bo'lmay,
 * uni import qiladi (aylanma bog'liqlik yo'q).
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminSupplierController],
  providers: [PayCoreClientService, MoogoldClientService, CoinDropClientService, SupplierFulfillmentService],
  exports: [PayCoreClientService, MoogoldClientService, CoinDropClientService, SupplierFulfillmentService],
})
export class SupplierModule {}
