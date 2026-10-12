import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { GameRow } from '../dto/game.dto';
import type { CreateGameInput, UpdateGameInput } from '../schemas/game.schema';

@Injectable()
export class GamesRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAll(activeOnly: boolean): Promise<GameRow[]> {
    const { rows } = await this.db.query<GameRow>(
      `select * from games ${activeOnly ? 'where is_active' : ''} order by sort_order, name`,
    );
    return rows;
  }

  async findById(id: string): Promise<GameRow | null> {
    const { rows } = await this.db.query<GameRow>('select * from games where id = $1', [id]);
    return rows[0] ?? null;
  }

  async create(input: CreateGameInput): Promise<GameRow> {
    const { rows } = await this.db.query<GameRow>(
      `insert into games (id, name, category, currency_name, gradient, icon, requires_server, server_options, sort_order, is_active, supplier_category, supplier_provider, supplier_order_category)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       returning *`,
      [
        input.id,
        input.name,
        input.category,
        input.currencyName,
        input.gradient,
        input.icon ?? null,
        input.requiresServer,
        input.serverOptions ? JSON.stringify(input.serverOptions) : null,
        input.sortOrder,
        input.isActive,
        input.supplierCategory ?? null,
        input.supplierProvider ?? 'paycore',
        input.supplierOrderCategory ?? null,
      ],
    );
    return rows[0];
  }

  async update(id: string, input: UpdateGameInput): Promise<GameRow | null> {
    const entries = Object.entries(input).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);

    const columnMap: Record<string, string> = {
      name: 'name',
      category: 'category',
      currencyName: 'currency_name',
      gradient: 'gradient',
      icon: 'icon',
      requiresServer: 'requires_server',
      serverOptions: 'server_options',
      sortOrder: 'sort_order',
      isActive: 'is_active',
      supplierCategory: 'supplier_category',
      supplierProvider: 'supplier_provider',
      supplierOrderCategory: 'supplier_order_category',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of entries) {
      const column = columnMap[key];
      if (!column) continue;
      values.push(key === 'serverOptions' && value !== null ? JSON.stringify(value) : value);
      setClauses.push(`${column} = $${values.length + 1}`); // $1 = id
    }
    setClauses.push('updated_at = now()');

    const { rows } = await this.db.query<GameRow>(
      `update games set ${setClauses.join(', ')} where id = $1 returning *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  }

  async remove(id: string): Promise<void> {
    await this.db.query('delete from games where id = $1', [id]);
  }
}
