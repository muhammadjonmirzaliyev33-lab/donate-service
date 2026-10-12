import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AdminAuditLogController } from './controllers/admin-audit-log.controller';

/**
 * @Global — AuditLogService istalgan modulda import qilinmasdan inject qilinishi mumkin
 * (bot-onboarding, payments, admin-auth, admin-catalog kabi ko'plab joyda kerak bo'ladi,
 * har birining moduliga AuditLogModule qo'shib chiqish o'rniga shu yerda bir marta).
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [AdminAuditLogController],
  providers: [AuditLogService, AuditLogRepository],
  exports: [AuditLogService],
})
export class AuditLogModule {}
