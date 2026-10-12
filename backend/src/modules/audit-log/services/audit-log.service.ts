import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { toAuditLogDto, type AuditLogDto, type AuditLogEntry } from '../dto/audit-log.dto';

/**
 * Audit-log yozish — biznes oqimini HECH QACHON to'xtatmasligi kerak (masalan to'lovni
 * tasdiqlash o'zi muvaffaqiyatli bo'lib, faqat audit yozuvi saqlanmay qolishi mumkin).
 * Shu sabab log() xato otmaydi, faqat logger.warn bilan ogohlantiradi.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly repository: AuditLogRepository) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.repository.insert(entry);
    } catch (err) {
      this.logger.warn(`Audit-log yozilmadi (${entry.action}): ${err instanceof Error ? err.message : err}`);
    }
  }

  async list(filter: { action?: string; targetUserId?: string; limit?: number }): Promise<AuditLogDto[]> {
    const rows = await this.repository.list(filter);
    return rows.map(toAuditLogDto);
  }
}
