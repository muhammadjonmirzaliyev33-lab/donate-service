import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../../auth/guards/telegram-auth.guard';
import { PhoneRequiredGuard } from '../../auth/guards/phone-required.guard';
import { CatalogService } from '../services/catalog.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { verifyPlayerSchema, type VerifyPlayerInput } from '../schemas/game.schema';

/**
 * Foydalanuvchi tomoni — faqat o'qish, lekin Mini App ichidan (initData bilan) kirish
 * shart: katalog narxlari va ayniqsa `verify-player` (bizning yetkazib beruvchi
 * hisobimiz orqali ishlaydigan tekshiruv) ochiq internetga chiqarilmasligi kerak.
 */
@UseGuards(TelegramAuthGuard, PhoneRequiredGuard)
@Controller('games')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listGames() {
    return this.catalogService.listPublicGames();
  }

  @Get(':gameId')
  getGame(@Param('gameId') gameId: string) {
    return this.catalogService.getPublicGameWithPackages(gameId);
  }

  /** Xarid formasida "Tekshirish" bosilganda — playerId'ni yetkazib beruvchi orqali real tasdiqlaydi (bog'langan bo'lsa). */
  @Post(':gameId/verify-player')
  verifyPlayer(@Param('gameId') gameId: string, @Body(new ZodValidationPipe(verifyPlayerSchema)) body: VerifyPlayerInput) {
    return this.catalogService.verifyPlayer(gameId, body.playerId, body.server);
  }
}
