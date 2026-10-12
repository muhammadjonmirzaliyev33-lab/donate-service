import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { OverviewRow, TopGameRow } from '../dto/stats.dto';

@Injectable()
export class StatsRepository {
  constructor(private readonly db: DatabaseService) {}

  async overview(): Promise<OverviewRow> {
    const { rows } = await this.db.query<OverviewRow>(
      `select
         (select count(*) from users) as total_users,
         count(*) filter (where status = 'completed') as completed_count,
         coalesce(sum(amount) filter (where status = 'completed'), 0) as total_revenue,
         coalesce(sum(amount) filter (where status = 'completed' and created_at >= now() - interval '1 day'), 0) as today_revenue,
         coalesce(sum(amount) filter (where status = 'completed' and created_at >= now() - interval '7 day'), 0) as week_revenue,
         count(*) filter (where status = 'pending_review') as pending_count,
         count(*) filter (where status = 'cancelled') as cancelled_count
       from payments`,
    );
    return rows[0];
  }

  async topGames(days: number, limit: number): Promise<TopGameRow[]> {
    const { rows } = await this.db.query<TopGameRow>(
      `select
         p.game_id,
         g.name,
         count(*) as orders,
         sum(p.amount) as revenue,
         sum(pk.amount + coalesce(pk.bonus, 0)) as units_sold
       from payments p
       join games g on g.id = p.game_id
       left join packages pk on pk.id = p.package_id
       where p.status = 'completed'
         and p.kind = 'purchase'
         and p.created_at >= now() - ($1 || ' days')::interval
       group by p.game_id, g.name
       order by revenue desc
       limit $2`,
      [days, limit],
    );
    return rows;
  }

  async lowStock(threshold: number): Promise<{ game_id: string; name: string; balance: string }[]> {
    const { rows } = await this.db.query<{ game_id: string; name: string; balance: string }>(
      `select g.id as game_id, g.name, coalesce(s.balance, 0) as balance
       from games g
       left join game_stock s on s.game_id = g.id
       where g.is_active and coalesce(s.balance, 0) <= $1
       order by coalesce(s.balance, 0) asc`,
      [threshold],
    );
    return rows;
  }
}
