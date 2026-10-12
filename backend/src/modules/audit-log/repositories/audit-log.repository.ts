import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { AuditLogEntry, AuditLogRow } from '../dto/audit-log.dto';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly db: DatabaseService) {}

  async insert(entry: AuditLogEntry): Promise<void> {
    await this.db.query(
      `insert into audit_logs
         (action, actor_type, actor_id, actor_username, target_user_id, target_telegram_id,
          target_username, target_phone, entity_type, entity_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.action,
        entry.actorType,
        entry.actorId ?? null,
        entry.actorUsername ?? null,
        entry.targetUserId ?? null,
        entry.targetTelegramId ?? null,
        entry.targetUsername ?? null,
        entry.targetPhone ?? null,
        entry.entityType ?? null,
        entry.entityId ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ],
    );
  }

  /** Admin panel — filtrlar bilan (hammasi ixtiyoriy). Eng yangisi birinchi. */
  async list(filter: { action?: string; targetUserId?: string; limit?: number }): Promise<AuditLogRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.action) {
      params.push(filter.action);
      conditions.push(`action = $${params.length}`);
    }
    if (filter.targetUserId) {
      params.push(filter.targetUserId);
      conditions.push(`target_user_id = $${params.length}`);
    }

    const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
    params.push(Math.min(filter.limit ?? 100, 500));

    const { rows } = await this.db.query<AuditLogRow>(
      `select * from audit_logs ${where} order by created_at desc limit $${params.length}`,
      params,
    );
    return rows;
  }
}
