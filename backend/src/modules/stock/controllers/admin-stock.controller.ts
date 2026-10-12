import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { StockService } from '../services/stock.service';
import { depositSchema, type DepositInput } from '../schemas/deposit.schema';

@UseGuards(AdminGuard)
@Controller('admin/stock')
export class AdminStockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  listBalances() {
    return this.stockService.listBalances();
  }

  @Get(':gameId/movements')
  listMovements(@Param('gameId') gameId: string, @Query('limit') limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    return this.stockService.listMovements(gameId, parsed && parsed > 0 ? parsed : 50);
  }

  @Post(':gameId/deposit')
  deposit(
    @Param('gameId') gameId: string,
    @Body(new ZodValidationPipe(depositSchema)) body: DepositInput,
    @CurrentUser() admin: TelegramUser,
  ) {
    return this.stockService.deposit(gameId, admin.id, body);
  }
}
