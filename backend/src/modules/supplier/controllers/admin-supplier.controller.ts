import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PayCoreClientService, PayCoreApiError } from '../services/paycore-client.service';
import { MoogoldClientService, MoogoldApiError } from '../services/moogold-client.service';
import { CoinDropClientService, CoinDropApiError } from '../services/coindrop-client.service';

/** Admin panelida yetkazib beruvchilar hisobini (balans) va katalogini (paketni bog'lash uchun) ko'rsatish. */
@UseGuards(AdminGuard)
@Controller('admin/supplier')
export class AdminSupplierController {
  constructor(
    private readonly client: PayCoreClientService,
    private readonly moogold: MoogoldClientService,
    private readonly coindrop: CoinDropClientService,
  ) {}

  @Get('account')
  async account() {
    if (!this.client.isEnabled) return { enabled: false as const };
    try {
      const account = await this.client.getAccount();
      return { enabled: true as const, ...account };
    } catch (err) {
      return { enabled: true as const, error: err instanceof PayCoreApiError ? err.message : "Bog'lanib bo'lmadi" };
    }
  }

  @Get('categories')
  async categories() {
    if (!this.client.isEnabled) return { categories: [] };
    try {
      return await this.client.listCategories();
    } catch {
      return { categories: [] };
    }
  }

  @Get('catalog')
  async catalog(@Query('category') category?: string) {
    if (!this.client.isEnabled) return { products: [] };
    try {
      return await this.client.listCatalog(category);
    } catch {
      return { products: [] };
    }
  }

  // ---------- MooGold ----------

  @Get('moogold/account')
  async moogoldAccount() {
    if (!this.moogold.isEnabled) return { enabled: false as const };
    try {
      const balance = await this.moogold.getBalance();
      return { enabled: true as const, ...balance };
    } catch (err) {
      return { enabled: true as const, error: err instanceof MoogoldApiError ? err.message : "Bog'lanib bo'lmadi" };
    }
  }

  /** Berilgan MooGold kategoriyasidagi o'yinlar ro'yxati (o'yinga product_id biriktirish uchun). */
  @Get('moogold/products')
  async moogoldProducts(@Query('categoryId') categoryId?: string) {
    const id = Number(categoryId);
    if (!this.moogold.isEnabled || !id) return { products: [] };
    try {
      const products = await this.moogold.listProducts(id);
      return { products };
    } catch {
      return { products: [] };
    }
  }

  /** Bitta MooGold mahsulotining variantlari (paketga variation_id biriktirish uchun). */
  @Get('moogold/product')
  async moogoldProduct(@Query('productId') productId?: string) {
    const id = Number(productId);
    if (!this.moogold.isEnabled || !id) return { variations: [] };
    try {
      const detail = await this.moogold.getProductDetail(id);
      return { name: detail.Product_Name, variations: detail.Variation ?? [] };
    } catch {
      return { variations: [] };
    }
  }

  /** Mahsulot server ro'yxati (agar o'yinda server tanlash bo'lsa). */
  @Get('moogold/servers')
  async moogoldServers(@Query('productId') productId?: string) {
    const id = Number(productId);
    if (!this.moogold.isEnabled || !id) return { servers: {} };
    try {
      const servers = await this.moogold.getServerList(id);
      return { servers };
    } catch {
      return { servers: {} };
    }
  }

  // ---------- CoinDrop ----------

  @Get('coindrop/account')
  async coindropAccount() {
    if (!this.coindrop.isEnabled) return { enabled: false as const };
    try {
      const { account } = await this.coindrop.getAccount();
      return { enabled: true as const, balance: account.balance_usd, currency: 'USD', username: account.name };
    } catch (err) {
      return { enabled: true as const, error: err instanceof CoinDropApiError ? err.message : "Bog'lanib bo'lmadi" };
    }
  }

  /** O'yinlar ro'yxati (o'yinga game_key biriktirish uchun) — flaglar (id_type, requires_server...) ham qaytadi. */
  @Get('coindrop/games')
  async coindropGames() {
    if (!this.coindrop.isEnabled) return { games: [] };
    try {
      const { games } = await this.coindrop.listGames();
      return { games };
    } catch {
      return { games: [] };
    }
  }

  /** Bitta CoinDrop o'yinining paketlari (paketga product_id biriktirish uchun). */
  @Get('coindrop/products')
  async coindropProducts(@Query('gameKey') gameKey?: string) {
    if (!this.coindrop.isEnabled || !gameKey) return { products: [] };
    try {
      const { products } = await this.coindrop.listProducts(gameKey);
      return { products };
    } catch {
      return { products: [] };
    }
  }
}
