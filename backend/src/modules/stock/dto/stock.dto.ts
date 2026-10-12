export interface GameStockRow {
  game_id: string;
  balance: string;
  updated_at: Date;
}

export interface StockMovementRow {
  id: string;
  game_id: string;
  kind: 'deposit' | 'sale' | 'adjustment';
  amount: string;
  note: string | null;
  payment_id: string | null;
  created_by: string | null;
  created_at: Date;
}

export interface GameStockDto {
  gameId: string;
  balance: number;
  updatedAt: Date;
}

export interface StockMovementDto {
  id: string;
  gameId: string;
  kind: 'deposit' | 'sale' | 'adjustment';
  amount: number;
  note: string | null;
  paymentId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export function toGameStockDto(row: GameStockRow): GameStockDto {
  return { gameId: row.game_id, balance: Number(row.balance), updatedAt: row.updated_at };
}

export function toStockMovementDto(row: StockMovementRow): StockMovementDto {
  return {
    id: row.id,
    gameId: row.game_id,
    kind: row.kind,
    amount: Number(row.amount),
    note: row.note,
    paymentId: row.payment_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
