import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import { UsersRepository } from '../repositories/users.repository';
import { toAdminUserDto, toUserDto, type AdminUserDto, type ReferralSummaryDto, type UserDto } from '../dto/user.dto';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';

@Injectable()
export class UsersService {
  private cachedBotUsername: string | null | undefined;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Har bir autentifikatsiya qilingan so'rovda chaqiriladi — user mavjud bo'lmasa yaratadi. */
  async syncFromTelegram(telegramUser: TelegramUser): Promise<UserDto> {
    const row = await this.usersRepository.upsert({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
    });
    return toUserDto(row);
  }

  async getById(id: string): Promise<UserDto | null> {
    const row = await this.usersRepository.findById(id);
    return row ? toUserDto(row) : null;
  }

  async listAll(limit = 200): Promise<AdminUserDto[]> {
    const rows = await this.usersRepository.listAll(limit);
    return rows.map(toAdminUserDto);
  }

  /** Profildagi "Do'stlarni taklif qilish" bo'limi uchun — link + statistika + kim taklif qilingani. */
  async getReferralSummary(telegramUser: TelegramUser): Promise<ReferralSummaryDto> {
    const user = await this.usersRepository.upsert({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
    });
    const invitedRows = await this.usersRepository.listInvitedBy(user.id);

    const botUsername = await this.getBotUsername();
    const link = botUsername ? `https://t.me/${botUsername}?start=${user.telegram_id}` : null;

    return {
      link,
      invitedCount: invitedRows.length,
      totalEarned: invitedRows.reduce((sum, r) => sum + Number(r.referral_reward_amount ?? 0), 0),
      invited: invitedRows.map((r) => ({
        username: r.username,
        firstName: r.first_name,
        rewarded: r.referral_rewarded_at !== null,
        createdAt: r.created_at,
      })),
    };
  }

  /**
   * Referral link qurish uchun bot username kerak. Avval TELEGRAM_BOT_USERNAME env
   * tekshiriladi; berilmagan bo'lsa Telegram'ning getMe orqali o'zi so'rab keshlaydi —
   * shu bilan Render'da alohida sozlash shart emas. (BotModule'ni bu yerga import qilmaymiz —
   * BotModule allaqachon UsersModule'ni import qiladi, aylanma bog'liqlik yuzaga kelmasligi uchun.)
   */
  private async getBotUsername(): Promise<string | null> {
    const configured = this.config.get('TELEGRAM_BOT_USERNAME', { infer: true });
    if (configured) return configured;
    if (this.cachedBotUsername !== undefined) return this.cachedBotUsername;

    try {
      const token = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const json = (await res.json()) as { ok: boolean; result?: { username?: string } };
      this.cachedBotUsername = (json.ok && json.result?.username) || null;
    } catch {
      this.cachedBotUsername = null;
    }
    return this.cachedBotUsername;
  }
}
