import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

export interface RatingRow {
  user_id: string;
  username: string | null;
  first_name: string | null;
  total_amount: string;
  rank: string;
}

/** Reyting — tasdiqlangan xaridlar (kind='purchase', status='completed') summasi bo'yicha. */
const RANKED_CTE = `
  select u.id as user_id, u.username, u.first_name,
         sum(p.amount) as total_amount,
         rank() over (order by sum(p.amount) desc) as rank
  from payments p
  join users u on u.id = p.user_id
  where p.kind = 'purchase' and p.status = 'completed'
  group by u.id, u.username, u.first_name
`;

@Injectable()
export class RatingRepository {
  constructor(private readonly db: DatabaseService) {}

  async listRanked(limit: number): Promise<RatingRow[]> {
    const { rows } = await this.db.query<RatingRow>(`select * from (${RANKED_CTE}) ranked order by rank limit $1`, [limit]);
    return rows;
  }

  async findRankForUser(userId: string): Promise<RatingRow | null> {
    const { rows } = await this.db.query<RatingRow>(`select * from (${RANKED_CTE}) ranked where user_id = $1`, [userId]);
    return rows[0] ?? null;
  }
}
