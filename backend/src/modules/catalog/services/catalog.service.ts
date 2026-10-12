import { Injectable, Logger } from '@nestjs/common';
import { GamesRepository } from '../repositories/games.repository';
import { PackagesRepository } from '../repositories/packages.repository';
import { toGameDto, toPublicGameDto, type GameDto, type PublicGameDto } from '../dto/game.dto';
import { toPackageDto, toPublicPackageDto, type PackageDto, type PublicPackageDto } from '../dto/package.dto';
import type { CreateGameInput, UpdateGameInput } from '../schemas/game.schema';
import type { CreatePackageInput, UpdatePackageInput } from '../schemas/package.schema';
import { SupplierFulfillmentService } from '../../supplier/services/supplier-fulfillment.service';
import { AppException, ErrorCode } from '../../../common/errors';

export interface GameWithPackages extends GameDto {
  packages: PackageDto[];
}

export interface PublicGameWithPackages extends PublicGameDto {
  packages: PublicPackageDto[];
}

export interface VerifyPlayerResult {
  supported: boolean;
  found: boolean;
  nickname?: string;
  alreadyPremium?: boolean;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly gamesRepository: GamesRepository,
    private readonly packagesRepository: PackagesRepository,
    private readonly supplierFulfillment: SupplierFulfillmentService,
  ) {}

  // ---------- Public (user-facing) ----------
  // Diqqat: bu ikkalasi ichki yetkazib beruvchi sozlamalarisiz (supplier*) qaytaradi —
  // admin ekranlari uchun quyidagi to'liq (listGames/getGameWithPackages) variantlar bor.

  async listPublicGames(): Promise<PublicGameDto[]> {
    const rows = await this.gamesRepository.findAll(true);
    return rows.map(toPublicGameDto);
  }

  async getPublicGameWithPackages(gameId: string): Promise<PublicGameWithPackages> {
    const game = await this.gamesRepository.findById(gameId);
    if (!game) throw new AppException(ErrorCode.CATALOG_GAME_NOT_FOUND);
    const packages = await this.packagesRepository.findByGameId(gameId, true);
    return { ...toPublicGameDto(game), packages: packages.map(toPublicPackageDto) };
  }

  // ---------- Admin (to'liq, supplier sozlamalari bilan) ----------

  async listGames(activeOnly = true): Promise<GameDto[]> {
    const rows = await this.gamesRepository.findAll(activeOnly);
    return rows.map(toGameDto);
  }

  async getGameWithPackages(gameId: string, activeOnly = true): Promise<GameWithPackages> {
    const game = await this.gamesRepository.findById(gameId);
    if (!game) throw new AppException(ErrorCode.CATALOG_GAME_NOT_FOUND);
    const packages = await this.packagesRepository.findByGameId(gameId, activeOnly);
    return { ...toGameDto(game), packages: packages.map(toPackageDto) };
  }

  /** Xarid yaratishda ishlatiladi — paket haqiqatan shu o'yinga tegishli va faolligini tekshiradi. */
  async getActivePackageForGame(gameId: string, packageId: string): Promise<PackageDto> {
    const pkg = await this.packagesRepository.findById(packageId);
    if (!pkg || pkg.game_id !== gameId || !pkg.is_active) {
      throw new AppException(ErrorCode.CATALOG_PACKAGE_NOT_FOUND);
    }
    return toPackageDto(pkg);
  }

  async getActiveGame(gameId: string): Promise<GameDto> {
    const game = await this.gamesRepository.findById(gameId);
    if (!game || !game.is_active) throw new AppException(ErrorCode.CATALOG_GAME_INACTIVE);
    return toGameDto(game);
  }

  /**
   * Xarid oldidan playerId'ni yetkazib beruvchi (PayCore yoki MooGold) orqali real
   * tekshiradi (o'yin biror provayderga bog'langan bo'lsa) — noto'g'ri ID bilan chek
   * yuklab, keyin admin tomonidan rad etilishining oldini oladi. Bog'lanmagan o'yinlar
   * uchun `supported: false` qaytadi — frontend bunday holda eski (faqat format)
   * tekshiruvga tushadi.
   */
  async verifyPlayer(gameId: string, playerId: string, server?: string): Promise<VerifyPlayerResult> {
    const game = await this.gamesRepository.findById(gameId);
    const provider = game?.supplier_provider ?? 'paycore';
    if (!game || !game.supplier_category || !this.supplierFulfillment.isProviderEnabled(provider)) {
      return { supported: false, found: false };
    }
    try {
      const result = await this.supplierFulfillment.verifyPlayer(provider, game.supplier_category, playerId, server);
      return { supported: true, ...result };
    } catch (err) {
      this.logger.warn(`playerId tekshiruvi muvaffaqiyatsiz (${gameId}): ${err instanceof Error ? err.message : err}`);
      return { supported: false, found: false };
    }
  }

  // ---------- Admin ----------

  async createGame(input: CreateGameInput): Promise<GameDto> {
    const row = await this.gamesRepository.create(input);
    return toGameDto(row);
  }

  async updateGame(id: string, input: UpdateGameInput): Promise<GameDto> {
    const row = await this.gamesRepository.update(id, input);
    if (!row) throw new AppException(ErrorCode.CATALOG_GAME_NOT_FOUND);
    return toGameDto(row);
  }

  async removeGame(id: string): Promise<void> {
    const game = await this.gamesRepository.findById(id);
    if (!game) throw new AppException(ErrorCode.CATALOG_GAME_NOT_FOUND);
    await this.gamesRepository.remove(id);
  }

  async createPackage(gameId: string, input: CreatePackageInput): Promise<PackageDto> {
    const game = await this.gamesRepository.findById(gameId);
    if (!game) throw new AppException(ErrorCode.CATALOG_GAME_NOT_FOUND);
    const row = await this.packagesRepository.create(gameId, input);
    return toPackageDto(row);
  }

  async updatePackage(packageId: string, input: UpdatePackageInput): Promise<PackageDto> {
    const row = await this.packagesRepository.update(packageId, input);
    if (!row) throw new AppException(ErrorCode.CATALOG_PACKAGE_NOT_FOUND);
    return toPackageDto(row);
  }

  async removePackage(packageId: string): Promise<void> {
    const pkg = await this.packagesRepository.findById(packageId);
    if (!pkg) throw new AppException(ErrorCode.CATALOG_PACKAGE_NOT_FOUND);
    await this.packagesRepository.remove(packageId);
  }
}
