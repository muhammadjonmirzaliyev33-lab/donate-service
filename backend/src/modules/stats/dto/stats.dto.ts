export interface OverviewRow {
  total_users: string;
  completed_count: string;
  total_revenue: string;
  today_revenue: string;
  week_revenue: string;
  pending_count: string;
  cancelled_count: string;
}

export interface OverviewDto {
  totalUsers: number;
  completedCount: number;
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  pendingCount: number;
  cancelledCount: number;
}

export function toOverviewDto(row: OverviewRow): OverviewDto {
  return {
    totalUsers: Number(row.total_users),
    completedCount: Number(row.completed_count),
    totalRevenue: Number(row.total_revenue),
    todayRevenue: Number(row.today_revenue),
    weekRevenue: Number(row.week_revenue),
    pendingCount: Number(row.pending_count),
    cancelledCount: Number(row.cancelled_count),
  };
}

export interface TopGameRow {
  game_id: string;
  name: string;
  orders: string;
  revenue: string;
  units_sold: string | null;
}

export interface TopGameDto {
  gameId: string;
  name: string;
  orders: number;
  revenue: number;
  unitsSold: number;
}

export function toTopGameDto(row: TopGameRow): TopGameDto {
  return {
    gameId: row.game_id,
    name: row.name,
    orders: Number(row.orders),
    revenue: Number(row.revenue),
    unitsSold: Number(row.units_sold ?? 0),
  };
}

export interface LowStockDto {
  gameId: string;
  name: string;
  balance: number;
}
