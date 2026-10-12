import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { PackageRow } from '../dto/package.dto';
import type { CreatePackageInput, UpdatePackageInput } from '../schemas/package.schema';

@Injectable()
export class PackagesRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByGameId(gameId: string, activeOnly: boolean): Promise<PackageRow[]> {
    const { rows } = await this.db.query<PackageRow>(
      `select * from packages where game_id = $1 ${activeOnly ? 'and is_active' : ''} order by sort_order, price`,
      [gameId],
    );
    return rows;
  }

  async findById(id: string): Promise<PackageRow | null> {
    const { rows } = await this.db.query<PackageRow>('select * from packages where id = $1', [id]);
    return rows[0] ?? null;
  }

  async create(gameId: string, input: CreatePackageInput): Promise<PackageRow> {
    const { rows } = await this.db.query<PackageRow>(
      `insert into packages (game_id, label, amount, bonus, price, badge, group_name, sort_order, is_active, supplier_slug, extra_qty)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning *`,
      [
        gameId,
        input.label,
        input.amount,
        input.bonus ?? null,
        input.price,
        input.badge ?? null,
        input.groupName,
        input.sortOrder,
        input.isActive,
        input.supplierSlug ?? null,
        input.extraQty ?? null,
      ],
    );
    return rows[0];
  }

  async update(id: string, input: UpdatePackageInput): Promise<PackageRow | null> {
    const entries = Object.entries(input).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);

    const columnMap: Record<string, string> = {
      label: 'label',
      amount: 'amount',
      bonus: 'bonus',
      price: 'price',
      badge: 'badge',
      groupName: 'group_name',
      sortOrder: 'sort_order',
      isActive: 'is_active',
      supplierSlug: 'supplier_slug',
      extraQty: 'extra_qty',
      icon: 'icon',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of entries) {
      const column = columnMap[key];
      if (!column) continue;
      values.push(value);
      setClauses.push(`${column} = $${values.length + 1}`); // $1 = id
    }
    setClauses.push('updated_at = now()');

    const { rows } = await this.db.query<PackageRow>(
      `update packages set ${setClauses.join(', ')} where id = $1 returning *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  }

  async remove(id: string): Promise<void> {
    await this.db.query('delete from packages where id = $1', [id]);
  }
}
