export type AuditActorType = 'admin' | 'user' | 'system';

/** AuditLogService.log() ga beriladigan yozuv — barcha maydonlar (action/actorType'dan tashqari) ixtiyoriy. */
export interface AuditLogEntry {
  /** Masalan: 'auth.admin_login', 'user.phone_shared', 'order.approved', 'game.updated'. */
  action: string;
  actorType: AuditActorType;
  /** admin_accounts.id yoki telegram_id — matn sifatida. */
  actorId?: string | null;
  actorUsername?: string | null;
  targetUserId?: string | null;
  targetTelegramId?: string | null;
  targetUsername?: string | null;
  targetPhone?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRow {
  id: string;
  action: string;
  actor_type: AuditActorType;
  actor_id: string | null;
  actor_username: string | null;
  target_user_id: string | null;
  target_telegram_id: string | null;
  target_username: string | null;
  target_phone: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface AuditLogDto {
  id: string;
  action: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorUsername: string | null;
  targetUserId: string | null;
  targetTelegramId: string | null;
  targetUsername: string | null;
  targetPhone: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export function toAuditLogDto(row: AuditLogRow): AuditLogDto {
  return {
    id: row.id,
    action: row.action,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    targetUserId: row.target_user_id,
    targetTelegramId: row.target_telegram_id,
    targetUsername: row.target_username,
    targetPhone: row.target_phone,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
