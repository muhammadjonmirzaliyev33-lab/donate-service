import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { StockRepository } from '../repositories/stock.repository';
import { toGameStockDto, toStockMovementDto, type GameStockDto, type StockMovementDto } from '../dto/stock.dto';
import type { DepositInput } from '../schemas/deposit.schema';

@Injectable()
export class StockService {
  constructor(private readonly stockRepository: StockRepository) {}

  async listBalances(): Promise<GameStockDto[]> {
    const rows = await this.stockRepository.listBalances();
    return rows.map(toGameStockDto);
  }

  async listMovements(gameId: string, limit = 50): Promise<StockMovementDto[]> {
    const rows = await this.stockRepository.listMovements(gameId, limit);
    return rows.map(toStockMovementDto);
  }

  /** Admin qo'lda zaxira qo'shganda (masalan yangi UC sotib olganda) chaqiriladi. */
  async deposit(gameId: string, adminId: bigint, input: DepositInput): Promise<GameStockDto> {
    const row = await this.stockRepository.applyMovement({
      gameId,
      kind: 'deposit',
      amount: input.amount,
      note: input.note,
      createdBy: adminId,
    });
    return toGameStockDto(row);
  }

  /** To'lov tasdiqlanganda (approve) PaymentsService ichidan, o'sha tranzaksiya ichida chaqiriladi. */
  async recordSale(params: { gameId: string; amount: number; paymentId: string; client: PoolClient }): Promise<void> {
    await this.stockRepository.applyMovement({
      gameId: params.gameId,
      kind: 'sale',
      amount: -Math.abs(params.amount),
      paymentId: params.paymentId,
      client: params.client,
    });
  }

  /**
   * Admin xato bosib, tasdiqlangan to'lovni "o'zgartirish" bilan qaytarganda — sotilgan
   * zaxirani tiklaydi. Miqdorni JORIY katalogdan emas, aynan o'sha paytdagi 'sale'
   * harakatidan o'qiydi — shu bilan paket keyin tahrirlangan/o'chirilgan bo'lsa ham
   * to'g'ri miqdor qaytariladi.
   */
  async reverseSale(params: { gameId: string; paymentId: string; client: PoolClient }): Promise<void> {
    const sale = await this.stockRepository.findSaleMovement(params.paymentId, params.client);
    if (!sale) return;
    await this.stockRepository.applyMovement({
      gameId: params.gameId,
      kind: 'adjustment',
      amount: Math.abs(Number(sale.amount)),
      note: "To'lov bekor qilindi (admin o'zgartirdi) — zaxira qaytarildi",
      paymentId: params.paymentId,
      client: params.client,
    });
  }
}
