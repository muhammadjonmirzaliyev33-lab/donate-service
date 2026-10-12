import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { PaymentCardsService } from '../services/payment-cards.service';
import {
  createPaymentCardSchema,
  updatePaymentCardSchema,
  type CreatePaymentCardInput,
  type UpdatePaymentCardInput,
} from '../schemas/payment-card.schema';

@UseGuards(AdminGuard)
@Controller('admin/payment-cards')
export class AdminPaymentCardsController {
  constructor(private readonly service: PaymentCardsService) {}

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createPaymentCardSchema)) body: CreatePaymentCardInput) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updatePaymentCardSchema)) body: UpdatePaymentCardInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
