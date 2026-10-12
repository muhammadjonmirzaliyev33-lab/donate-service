import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { PaymentsService } from '../services/payments.service';

@UseGuards(AdminGuard)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending')
  listPending() {
    return this.paymentsService.listPending();
  }

  /** Buyurtmalar tarixi — kim, qachon, nima olgani (hal qilingan to'lovlar). */
  @Get('history')
  listHistory() {
    return this.paymentsService.listDecided();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() admin: TelegramUser) {
    return this.paymentsService.decide(id, admin, 'approve');
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @CurrentUser() admin: TelegramUser) {
    return this.paymentsService.decide(id, admin, 'reject', body?.reason);
  }

  /** Admin xato bosgan holat uchun — hal qilingan to'lovni yana 'kutilmoqda'ga qaytaradi. */
  @Post(':id/undo')
  undo(@Param('id') id: string, @CurrentUser() admin: TelegramUser) {
    return this.paymentsService.undo(id, admin);
  }
}
