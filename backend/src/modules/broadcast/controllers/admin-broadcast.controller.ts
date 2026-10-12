import { Body, Controller, Get, Logger, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AppException, ErrorCode } from '../../../common/errors';
import { CloudinaryService } from '../../uploads/services/cloudinary.service';
import { UsersRepository } from '../../users/repositories/users.repository';
import { RedisService } from '../../../redis/redis.service';
import { BroadcastService } from '../services/broadcast.service';
import { BroadcastMessagesRepository } from '../repositories/broadcast-messages.repository';
import { toBroadcastMessageDto } from '../dto/broadcast-message.dto';
import { broadcastSchema, type BroadcastInput } from '../schemas/broadcast.schema';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const LOCK_KEY = 'broadcast:send';
const LOCK_TTL_SECONDS = 300; // eng uzoq yuborish davri uchun ehtiyot marjasi bilan

@UseGuards(AdminGuard)
@Controller('admin/broadcast')
export class AdminBroadcastController {
  private readonly logger = new Logger(AdminBroadcastController.name);

  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly broadcastMessagesRepository: BroadcastMessagesRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly usersRepository: UsersRepository,
    private readonly redisService: RedisService,
  ) {}

  @Get('history')
  async history() {
    const rows = await this.broadcastMessagesRepository.list(50);
    return rows.map(toBroadcastMessageDto);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES, { limits: { fileSize: MAX_IMAGE_SIZE } }))
  async send(
    @Body(new ZodValidationPipe(broadcastSchema)) body: BroadcastInput,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser() admin: TelegramUser,
  ) {
    const locked = await this.redisService.tryAcquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!locked) {
      throw new AppException(ErrorCode.BROADCAST_IN_PROGRESS);
    }

    try {
      const imageUrls: string[] = [];
      for (const file of images ?? []) {
        const url = await this.cloudinaryService.uploadBuffer(file.buffer, 'broadcast');
        if (url) imageUrls.push(url);
      }

      const telegramIds = await this.usersRepository.listAllTelegramIds();
      const row = await this.broadcastMessagesRepository.create({
        message: body.message,
        imageUrls,
        totalRecipients: telegramIds.length,
        createdBy: admin.id,
        createdByUsername: admin.username ?? null,
      });

      this.broadcastService
        .sendToAll(body.message, imageUrls)
        .then((result) =>
          this.broadcastMessagesRepository.markFinished(row.id, {
            status: result.failed === result.total && result.total > 0 ? 'failed' : 'sent',
            sentCount: result.sent,
            failedCount: result.failed,
          }),
        )
        .catch((err) => this.logger.error('Broadcast xatosi', err))
        .finally(() => this.redisService.releaseLock(LOCK_KEY));

      return { id: row.id, started: true };
    } catch (err) {
      await this.redisService.releaseLock(LOCK_KEY);
      throw err;
    }
  }
}
