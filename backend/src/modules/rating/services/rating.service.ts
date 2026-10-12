import { Injectable } from '@nestjs/common';
import { RatingRepository, type RatingRow } from '../repositories/rating.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import type { RatingEntryDto, RatingResponseDto } from '../dto/rating.dto';

const TOP_LIMIT = 20;

function displayName(row: RatingRow): string {
  return row.username ? `@${row.username}` : row.first_name || 'Foydalanuvchi';
}

function toEntry(row: RatingRow, meUserId: string | null): RatingEntryDto {
  return {
    rank: Number(row.rank),
    displayName: displayName(row),
    totalAmount: Number(row.total_amount),
    isMe: row.user_id === meUserId,
  };
}

@Injectable()
export class RatingService {
  constructor(
    private readonly repository: RatingRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async get(telegramUser: TelegramUser): Promise<RatingResponseDto> {
    const user = await this.usersRepository.findByTelegramId(telegramUser.id);
    const meUserId = user?.id ?? null;

    const top = (await this.repository.listRanked(TOP_LIMIT)).map((row) => toEntry(row, meUserId));

    let me = top.find((e) => e.isMe) ?? null;
    if (!me && meUserId) {
      const myRow = await this.repository.findRankForUser(meUserId);
      if (myRow) me = toEntry(myRow, meUserId);
    }

    return { top, me };
  }
}
