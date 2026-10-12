import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CatalogService } from '../services/catalog.service';
import { CloudinaryService } from '../../uploads/services/cloudinary.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { AppException, ErrorCode } from '../../../common/errors';
import { createGameSchema, updateGameSchema, type CreateGameInput, type UpdateGameInput } from '../schemas/game.schema';
import {
  createPackageSchema,
  updatePackageSchema,
  type CreatePackageInput,
  type UpdatePackageInput,
} from '../schemas/package.schema';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** Admin panel — katalogni to'liq boshqarish (o'yin/paket qo'shish, narx o'zgartirish, o'chirish). */
@UseGuards(AdminGuard)
@Controller('admin/games')
export class AdminCatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  listAll() {
    return this.catalogService.listGames(false);
  }

  @Get(':gameId')
  getOne(@Param('gameId') gameId: string) {
    return this.catalogService.getGameWithPackages(gameId, false);
  }

  @Post()
  async createGame(@Body(new ZodValidationPipe(createGameSchema)) body: CreateGameInput, @CurrentUser() admin: TelegramUser) {
    const game = await this.catalogService.createGame(body);
    await this.logAdminAction('game.created', admin, 'game', game.id, { name: game.name });
    return game;
  }

  @Patch(':gameId')
  async updateGame(
    @Param('gameId') gameId: string,
    @Body(new ZodValidationPipe(updateGameSchema)) body: UpdateGameInput,
    @CurrentUser() admin: TelegramUser,
  ) {
    const game = await this.catalogService.updateGame(gameId, body);
    await this.logAdminAction('game.updated', admin, 'game', gameId, { name: game.name, changes: body });
    return game;
  }

  @Delete(':gameId')
  async removeGame(@Param('gameId') gameId: string, @CurrentUser() admin: TelegramUser) {
    // O'chirishdan OLDIN nomini olib qolamiz — aks holda audit yozuvida qaysi o'yin
    // o'chirilgani (faqat id bilan) keyinchalik tushunarsiz bo'lib qoladi.
    const existing = await this.catalogService.getGameWithPackages(gameId, false).catch(() => null);
    await this.catalogService.removeGame(gameId);
    await this.logAdminAction('game.deleted', admin, 'game', gameId, { name: existing?.name ?? null });
    return { ok: true };
  }

  /** O'yin muqovasi rasmini yuklaydi (ixtiyoriy) — Cloudinary'ga saqlanadi, natijada olingan URL games.icon'ga yoziladi. */
  @Post(':gameId/image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE } }))
  async uploadImage(@Param('gameId') gameId: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() admin: TelegramUser) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');
    const url = await this.cloudinaryService.uploadBuffer(file.buffer, 'games');
    if (!url) throw new AppException(ErrorCode.PAYMENTS_RECEIPT_UPLOAD_FAILED);
    const game = await this.catalogService.updateGame(gameId, { icon: url });
    await this.logAdminAction('game.updated', admin, 'game', gameId, { name: game.name, changes: { icon: url } });
    return game;
  }

  @Post(':gameId/packages')
  async createPackage(
    @Param('gameId') gameId: string,
    @Body(new ZodValidationPipe(createPackageSchema)) body: CreatePackageInput,
    @CurrentUser() admin: TelegramUser,
  ) {
    const pkg = await this.catalogService.createPackage(gameId, body);
    await this.logAdminAction('package.created', admin, 'package', pkg.id, { gameId, label: pkg.label });
    return pkg;
  }

  /** Paket rasmini yuklaydi (ixtiyoriy) — Cloudinary'ga saqlanadi, URL packages.icon'ga yoziladi. */
  @Post('packages/:packageId/image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE } }))
  async uploadPackageImage(@Param('packageId') packageId: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() admin: TelegramUser) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');
    const url = await this.cloudinaryService.uploadBuffer(file.buffer, 'packages');
    if (!url) throw new AppException(ErrorCode.PAYMENTS_RECEIPT_UPLOAD_FAILED);
    const pkg = await this.catalogService.updatePackage(packageId, { icon: url });
    await this.logAdminAction('package.updated', admin, 'package', packageId, { label: pkg.label, changes: { icon: url } });
    return pkg;
  }

  @Patch('packages/:packageId')
  async updatePackage(
    @Param('packageId') packageId: string,
    @Body(new ZodValidationPipe(updatePackageSchema)) body: UpdatePackageInput,
    @CurrentUser() admin: TelegramUser,
  ) {
    const pkg = await this.catalogService.updatePackage(packageId, body);
    await this.logAdminAction('package.updated', admin, 'package', packageId, { label: pkg.label, changes: body });
    return pkg;
  }

  @Delete('packages/:packageId')
  async removePackage(@Param('packageId') packageId: string, @CurrentUser() admin: TelegramUser) {
    await this.catalogService.removePackage(packageId);
    await this.logAdminAction('package.deleted', admin, 'package', packageId, {});
    return { ok: true };
  }

  /** Katalog (o'yin/paket) tahriri audit-logga yoziladi — bu yerda foydalanuvchiga tegishli target yo'q, faqat admin + entity. */
  private async logAdminAction(
    action: string,
    admin: TelegramUser,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLog.log({
      action,
      actorType: 'admin',
      actorId: admin.id.toString(),
      actorUsername: admin.username ?? null,
      entityType,
      entityId,
      metadata,
    });
  }
}
