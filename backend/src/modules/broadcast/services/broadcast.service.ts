import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { BotService } from '../../bot/services/bot.service';

const DELAY_BETWEEN_MESSAGES_MS = 60; // ~16/soniya — Telegram flood limitidan xavfsiz

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly botService: BotService,
  ) {}

  /**
   * Barcha foydalanuvchilarga ketma-ket xabar yuboradi (flood limitidan qochish uchun bir
   * oz kechikish bilan). Rasm bo'lmasa — oddiy matn; bitta rasm — sendPhoto; 2-5 ta rasm —
   * albom (sendMediaGroup), caption faqat birinchi rasmga qo'yiladi.
   */
  async sendToAll(message: string, imageUrls: string[]): Promise<{ total: number; sent: number; failed: number }> {
    const telegramIds = await this.usersRepository.listAllTelegramIds();
    let sent = 0;
    let failed = 0;

    for (const id of telegramIds) {
      const chatId = BigInt(id);
      const result =
        imageUrls.length === 0
          ? await this.botService.sendMessage(chatId, message)
          : imageUrls.length === 1
            ? await this.botService.sendPhotoByUrl(chatId, imageUrls[0], message)
            : await this.botService.sendMediaGroup(chatId, imageUrls, message);
      if (result) sent++;
      else failed++;
      await sleep(DELAY_BETWEEN_MESSAGES_MS);
    }

    this.logger.log(`Broadcast tugadi: ${sent}/${telegramIds.length} yuborildi, ${failed} muvaffaqiyatsiz`);
    return { total: telegramIds.length, sent, failed };
  }
}
