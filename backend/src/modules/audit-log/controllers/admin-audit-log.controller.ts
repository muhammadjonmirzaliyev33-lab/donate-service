import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AuditLogService } from '../services/audit-log.service';

/** Admin panel — "Harakatlar tarixi" (auth, telefon ulashish, buyurtma qarorlari, o'yin tahriri va h.k.). */
@UseGuards(AdminGuard)
@Controller('admin/audit-logs')
export class AdminAuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  list(@Query('action') action?: string, @Query('userId') targetUserId?: string, @Query('limit') limit?: string) {
    return this.auditLog.list({ action, targetUserId, limit: limit ? Number(limit) : undefined });
  }
}
