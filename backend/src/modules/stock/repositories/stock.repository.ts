import { Injectable } from '@nestjs/common';
import { DatabaseService, type QueryRunner } from '../../../database/database.service';
import type { GameStockRow, StockMovementRow } from '../dto/stock.dto';

@Injectable()
export class StockRepository {
  constructor(private readonly db: DatabaseService) {}

  async listBalances(): Promise<GameStockRow[]> {
    const { rows } = await this.db.query<GameStockRow>(
      `select g.id as game_id, coalesce(s.balance, 0) as balance, coalesce(s.updated_at, g.created_at) as updated_at
       from games g
       left join game_stock s on s.game_id = g.id
       order by g.sort_order, g.name`,
    );
    return rows;
  }

  async getBalance(gameId: string): Promise<GameStockRow | null> {
    const { rows } = await this.db.query<GameStockRow>('select * from game_stock where game_id = $1', [gameId]);
    return rows[0] ?? null;
  }

  async listMovements(gameId: string, limit: number): Promise<StockMovementRow[]> {
    const { rows } = await this.db.query<StockMovementRow>(
      'select * from stock_movements where game_id = $1 order by created_at desc limit $2',
      [gameId, limit],
    );
    return rows;
  }

  /**
   * undo() uchun — sotilganda YOZILGAN aynan shu miqdorni topadi (paket keyinchalik
   * o'zgartirilgan/o'chirilgan bo'lsa ham to'g'ri qiymat qaytariladi, joriy katalogdan
   * qayta hisoblanmaydi).
   */
  async findSaleMovement(paymentId: string, runner: QueryRunner = this.db): Promise<StockMovementRow | null> {
    const { rows } = await runner.query<StockMovementRow>(
      `select * from stock_movements where payment_id = $1 and kind = 'sale' order by created_at desc limit 1`,
      [paymentId],
    );
    return rows[0] ?? null;
  }

  /** Zaxirani o'zgartiradi (musbat = kirim, manfiy = chiqim) va harakatni yozib qo'yadi. */
  async applyMovement(params: {
    gameId: string;
    kind: 'deposit' | 'sale' | 'adjustment';
    amount: number;
    note?: string;
    paymentId?: string;
    createdBy?: bigint;
    client?: QueryRunner;
  }): Promise<GameStockRow> {
    const runner: QueryRunner = params.client ?? this.db;

    await runner.query(
      `insert into game_stock (game_id, balance, updated_at)
       values ($1, greatest(0, $2), now())
       on conflict (game_id) do update set balance = greatest(0, game_stock.balance + $2), updated_at = now()`,
      [params.gameId, params.amount],
    );

    await runner.query(
      `insert into stock_movements (game_id, kind, amount, note, payment_id, created_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [params.gameId, params.kind, params.amount, params.note ?? null, params.paymentId ?? null, params.createdBy ?? null],
    );

    const { rows } = await runner.query<GameStockRow>('select * from game_stock where game_id = $1', [params.gameId]);
    return rows[0];
  }
}
