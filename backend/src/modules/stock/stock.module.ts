import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminStockController } from './controllers/admin-stock.controller';
import { StockService } from './services/stock.service';
import { StockRepository } from './repositories/stock.repository';

@Module({
  imports: [AuthModule],
  controllers: [AdminStockController],
  providers: [StockService, StockRepository],
  exports: [StockService, StockRepository],
})
export class StockModule {}
