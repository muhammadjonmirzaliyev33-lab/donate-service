import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { PromoCodesService } from '../services/promo-codes.service';
import {
  createPromoCodeSchema,
  updatePromoCodeSchema,
  type CreatePromoCodeInput,
  type UpdatePromoCodeInput,
} from '../schemas/promo-code.schema';

@UseGuards(AdminGuard)
@Controller('admin/promo-codes')
export class AdminPromoCodesController {
  constructor(private readonly service: PromoCodesService) {}

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createPromoCodeSchema)) body: CreatePromoCodeInput, @CurrentUser() admin: TelegramUser) {
    return this.service.create(body, admin);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updatePromoCodeSchema)) body: UpdatePromoCodeInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
