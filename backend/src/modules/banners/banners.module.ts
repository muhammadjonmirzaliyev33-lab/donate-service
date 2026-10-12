import { BadRequestException, Body, Controller, Delete, Get, Module, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { AuthModule } from '../auth/auth.module';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { PhoneRequiredGuard } from '../auth/guards/phone-required.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AppException, ErrorCode } from '../../common/errors';
import { UploadsModule } from '../uploads/uploads.module';
import { CloudinaryService } from '../uploads/services/cloudinary.service';

interface BannerRow {
  id: string;
  image_url: string;
  link: string | null;
  sort_order: number;
  is_active: boolean;
}

const toDto = (r: BannerRow) => ({ id: r.id, imageUrl: r.image_url, link: r.link, sortOrder: r.sort_order, isActive: r.is_active });

const updateSchema = z.object({
  link: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
type UpdateInput = z.infer<typeof updateSchema>;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** Bosh sahifadagi karusel — foydalanuvchi tomoni faqat o'qiydi (Mini App ichidan). */
@UseGuards(TelegramAuthGuard, PhoneRequiredGuard)
@Controller('banners')
export class BannersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list() {
    const { rows } = await this.db.query<BannerRow>('select * from banners where is_active order by sort_order, created_at');
    return rows.map(toDto);
  }
}

@UseGuards(AdminGuard)
@Controller('admin/banners')
export class AdminBannersController {
  constructor(
    private readonly db: DatabaseService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get()
  async list() {
    const { rows } = await this.db.query<BannerRow>('select * from banners order by sort_order, created_at');
    return rows.map(toDto);
  }

  /** Yangi banner: rasm Cloudinary'ga yuklanadi, so'ng yozuv yaratiladi. */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE } }))
  async create(@UploadedFile() file: Express.Multer.File, @Body('link') link?: string) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');
    const url = await this.cloudinary.uploadBuffer(file.buffer, 'banners');
    if (!url) throw new AppException(ErrorCode.PAYMENTS_RECEIPT_UPLOAD_FAILED);
    const { rows } = await this.db.query<BannerRow>(
      'insert into banners (image_url, link, sort_order) values ($1, $2, (select coalesce(max(sort_order), 0) + 1 from banners)) returning *',
      [url, link || null],
    );
    return toDto(rows[0]);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(updateSchema)) body: UpdateInput) {
    const { rows } = await this.db.query<BannerRow>(
      `update banners set link = case when $2::boolean then $3 else link end,
              sort_order = coalesce($4, sort_order), is_active = coalesce($5, is_active)
       where id = $1 returning *`,
      [id, body.link !== undefined, body.link ?? null, body.sortOrder ?? null, body.isActive ?? null],
    );
    if (!rows[0]) throw new BadRequestException('Banner topilmadi');
    return toDto(rows[0]);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.db.query('delete from banners where id = $1', [id]);
    return { ok: true };
  }
}

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [BannersController, AdminBannersController],
})
export class BannersModule {}
