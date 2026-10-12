import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { PromoCodesRepository } from '../repositories/promo-codes.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { toAdminPromoCodeDto, type AdminPromoCodeDto, type RedeemResultDto } from '../dto/promo-code.dto';
import type { CreatePromoCodeInput, UpdatePromoCodeInput } from '../schemas/promo-code.schema';
import type { TelegramUser } from '../../../common/interfaces/telegram-user.interface';
import { AppException, ErrorCode } from '../../../common/errors';

@Injectable()
export class PromoCodesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly repository: PromoCodesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async listAll(): Promise<AdminPromoCodeDto[]> {
    const rows = await this.repository.listAll();
    return rows.map(toAdminPromoCodeDto);
  }

  async create(input: CreatePromoCodeInput, admin: TelegramUser): Promise<AdminPromoCodeDto> {
    const existing = await this.repository.findByCode(input.code);
    if (existing) throw new AppException(ErrorCode.PROMO_CODE_ALREADY_EXISTS);
    const row = await this.repository.create(input, admin.id);
    return toAdminPromoCodeDto({ ...row, redemptions_count: 0 });
  }

  async update(id: string, input: UpdatePromoCodeInput): Promise<AdminPromoCodeDto> {
    const row = await this.repository.update(id, input);
    if (!row) throw new AppException(ErrorCode.PROMO_CODE_NOT_FOUND);
    return toAdminPromoCodeDto(row);
  }

  async remove(id: string): Promise<void> {
    const row = await this.repository.findById(id);
    if (!row) throw new AppException(ErrorCode.PROMO_CODE_NOT_FOUND);
    await this.repository.remove(id);
  }

  /**
   * Bir userga bitta kod faqat bir marta — `promo_code_redemptions`dagi unique constraint
   * orqali DB darajasida ham himoyalangan (parallel so'rovlarda ham xavfsiz).
   */
  async redeem(userId: string, codeRaw: string): Promise<RedeemResultDto> {
    const code = codeRaw.trim();
    if (!code) throw new AppException(ErrorCode.PROMO_CODE_NOT_FOUND);

    return this.db.transaction(async (client) => {
      const promo = await this.repository.findByCode(code, client);
      if (!promo) throw new AppException(ErrorCode.PROMO_CODE_NOT_FOUND);
      if (!promo.is_active) throw new AppException(ErrorCode.PROMO_CODE_INACTIVE);
      if (promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now()) {
        throw new AppException(ErrorCode.PROMO_CODE_EXPIRED);
      }

      const bonusAmount = Number(promo.bonus_amount);
      const inserted = await this.repository.insertRedemption(promo.id, userId, bonusAmount, client);
      if (!inserted) throw new AppException(ErrorCode.PROMO_CODE_ALREADY_REDEEMED);

      const user = await this.usersRepository.adjustBalance(userId, bonusAmount, client);
      return { bonusAmount, balance: Number(user.balance) };
    });
  }
}
