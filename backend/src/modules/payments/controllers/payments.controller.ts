import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { TelegramAuthGuard } from '../../auth/guards/telegram-auth.guard';
import { PhoneRequiredGuard } from '../../auth/guards/phone-required.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { PaymentsService } from '../services/payments.service';
import { UsersRepository } from '../../users/repositories/users.repository';
import {
  createPurchaseSchema,
  createTopupSchema,
  type CreatePurchaseInput,
  type CreateTopupInput,
} from '../schemas/create-payment.schema';

const MAX_RECEIPT_SIZE = 8 * 1024 * 1024; // 8MB — Telegram sendPhoto limitiga mos

@UseGuards(TelegramAuthGuard, PhoneRequiredGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Post('purchase')
  createPurchase(@Body(new ZodValidationPipe(createPurchaseSchema)) body: CreatePurchaseInput, @CurrentUser() user: TelegramUser) {
    return this.paymentsService.createPurchase(user, body);
  }

  @Post('topup')
  createTopup(@Body(new ZodValidationPipe(createTopupSchema)) body: CreateTopupInput, @CurrentUser() user: TelegramUser) {
    return this.paymentsService.createTopup(user, body);
  }

  @Get('mine')
  async listMine(@CurrentUser() telegramUser: TelegramUser) {
    const user = await this.usersRepository.findByTelegramId(telegramUser.id);
    if (!user) return [];
    return this.paymentsService.listMine(user.id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() telegramUser: TelegramUser) {
    const user = await this.usersRepository.findByTelegramId(telegramUser.id);
    if (!user) throw new BadRequestException('Foydalanuvchi topilmadi');
    return this.paymentsService.getMineById(id, user.id);
  }

  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RECEIPT_SIZE } }))
  uploadReceipt(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: TelegramUser) {
    if (!file) throw new BadRequestException("Fayl yuborilmadi");
    return this.paymentsService.uploadReceipt(id, user, { buffer: file.buffer, originalname: file.originalname || 'receipt.jpg' });
  }
}
