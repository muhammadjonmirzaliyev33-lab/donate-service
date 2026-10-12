import { Injectable, Logger } from '@nestjs/common';
import { PayCoreClientService } from './paycore-client.service';
import { MoogoldClientService } from './moogold-client.service';
import { CoinDropClientService } from './coindrop-client.service';
import type { PayCoreOrder } from '../dto/paycore.dto';

/** Qaysi yetkazib beruvchi ishlatilishi — o'yin darajasida tanlanadi (games.supplier_provider). */
export type SupplierProvider = 'paycore' | 'moogold' | 'coindrop';

export interface FulfillParams {
  provider: SupplierProvider;
  /** paycore: kategoriya slug'i · moogold: product_id · coindrop: game_key */
  category: string;
  /** paycore: mahsulot slug'i · moogold: variation_id · coindrop: product_id (bo'sh bo'lsa — amount-based buyurtma) */
  slug: string | null;
  amount: number;
  playerInfo: Record<string, string> | null;
  /** Faqat 'vpn' uchun — qurilmalar soni (packages.extra_qty). */
  extraQty?: number | null;
  /** Faqat moogold uchun — 1 = direct top-up, 2 = eVoucher (games.supplier_order_category). */
  orderCategory?: number | null;
  /** Faqat moogold uchun — takroriy buyurtmani oldini olish + keyin izlash uchun bizning buyurtma raqamimiz. */
  partnerOrderId?: string;
}

const CATEGORIES_REQUIRING_SERVER = new Set(['mobile-legends-ru', 'mobile-legends-global']);

const PUBG_CATEGORIES = new Set(['pubg-uc-direct', 'pubg-uc-codes', 'pubg-sets', 'pubg-popularity']);
const GAME_PLAYER_CATEGORIES = new Set([
  'free-fire',
  'mobile-legends-ru',
  'mobile-legends-global',
  'arena-breakout',
  'honor-of-kings',
  'delta-force',
]);
const TELEGRAM_CATEGORIES = new Set(['telegram-stars', 'telegram-premium']);

/**
 * Bitta tasdiqlangan xaridni tanlangan yetkazib beruvchiga (PayCore yoki MooGold) mos
 * formatda yuboradi. Har bir provayder/kategoriyaning so'rov shakli har xil — shu farqlar
 * shu yerda, bitta joyda jamlangan.
 */
@Injectable()
export class SupplierFulfillmentService {
  private readonly logger = new Logger(SupplierFulfillmentService.name);

  constructor(
    private readonly client: PayCoreClientService,
    private readonly moogold: MoogoldClientService,
    private readonly coindrop: CoinDropClientService,
  ) {}

  /** Kamida bitta provayder sozlangan bo'lsa — avtomatik yetkazish umuman yoqilgan hisoblanadi. */
  get isEnabled(): boolean {
    return this.client.isEnabled || this.moogold.isEnabled || this.coindrop.isEnabled;
  }

  isProviderEnabled(provider: SupplierProvider): boolean {
    if (provider === 'moogold') return this.moogold.isEnabled;
    if (provider === 'coindrop') return this.coindrop.isEnabled;
    return this.client.isEnabled;
  }

  async deliver(params: FulfillParams): Promise<PayCoreOrder> {
    if (params.provider === 'moogold') {
      return this.deliverViaMoogold(params);
    }
    if (params.provider === 'coindrop') {
      return this.deliverViaCoinDrop(params);
    }
    const body = this.buildOrderBody(params);
    const { order } = await this.client.createOrder(body);
    return order;
  }

  async pollStatus(provider: SupplierProvider, orderId: number): Promise<PayCoreOrder> {
    if (provider === 'moogold') {
      const detail = await this.moogold.getOrderDetail(orderId);
      return {
        id: Number(detail.order_id),
        category: 'moogold',
        status: mapMoogoldStatus(detail.order_status),
        amount_usdt: detail.total ?? '0',
        details: { moogold_status: detail.order_status, item: detail.item },
      };
    }
    if (provider === 'coindrop') {
      const { order } = await this.coindrop.getOrder(orderId);
      return {
        id: order.id,
        category: 'coindrop',
        status: mapCoinDropStatus(order.status),
        amount_usdt: String(order.amount_usd ?? '0'),
        details: { coindrop_status: order.status, product_name: order.product_name, player_id: order.player_id },
      };
    }
    const { order } = await this.client.getOrder(orderId);
    return order;
  }

  /**
   * Bitta so'rov nuqtasi — provayder va kategoriyaga qarab o'zi to'g'ri tekshiruvga
   * yo'naltiradi (PayCore: pubg-id / game-player / telegram-user; MooGold: product/validate).
   * Chaqiruvchi (frontend/purchase oqimi) qaysi endpoint ekanini bilishi shart emas.
   */
  async verifyPlayer(
    provider: SupplierProvider,
    category: string,
    playerId: string,
    serverId?: string,
  ): Promise<{ found: boolean; nickname?: string; alreadyPremium?: boolean }> {
    if (provider === 'moogold') {
      const res = await this.moogold.validate(category, buildMoogoldFields(playerId, serverId));
      const found = res.status === true || res.status === 'true';
      return { found, nickname: found ? res.username : undefined };
    }

    if (provider === 'coindrop') {
      // `success:false` bu yerda "topilmadi" degani, xato emas — shuning uchun alohida try/catch shart emas.
      const res = await this.coindrop.validate(category, playerId, serverId);
      return { found: res.valid, nickname: res.valid ? res.username : undefined };
    }

    if (PUBG_CATEGORIES.has(category)) {
      return this.client.checkPubgId(playerId);
    }
    if (GAME_PLAYER_CATEGORIES.has(category)) {
      if (CATEGORIES_REQUIRING_SERVER.has(category) && !serverId) {
        throw new Error(`"${category}" uchun server_id kerak`);
      }
      return this.client.checkGamePlayer(category, playerId, serverId);
    }
    if (TELEGRAM_CATEGORIES.has(category)) {
      // PayCore telegram-user check'i nickname qaytarmaydi (faqat exists/is_premium) —
      // shuning uchun "topildi" xabarida userning o'zi kiritgan username'ini ko'rsatamiz.
      const res = await this.client.checkTelegramUser(playerId);
      return {
        found: res.exists,
        nickname: playerId.replace(/^@/, ''),
        // telegram-premium sotib olishdan oldin — allaqachon Premium bo'lsa, bekorga
        // sotib olmasin deb ogohlantirish uchun (PayCore docs shuni tavsiya qiladi).
        alreadyPremium: category === 'telegram-premium' ? res.is_premium : undefined,
      };
    }
    throw new Error(`"${category}" uchun tekshiruv qo'llab-quvvatlanmaydi`);
  }

  /**
   * MooGold buyurtmani darhol yakunlamaydi — javobda faqat order_id keladi, haqiqiy holat
   * keyinroq `order/order_detail` orqali aniqlanadi. Shu sabab bu yerda doim 'processing'
   * qaytariladi va SupplierPollingService uni oxirigacha kuzatib boradi.
   */
  private async deliverViaMoogold(params: FulfillParams): Promise<PayCoreOrder> {
    const playerId = params.playerInfo?.playerId;
    const serverId = params.playerInfo?.server;
    if (!playerId) throw new Error('MooGold buyurtmasi uchun player_id kerak');
    if (!params.slug) throw new Error('MooGold buyurtmasi uchun paketda variation_id (supplier_slug) sozlanmagan');
    if (!params.orderCategory) throw new Error("MooGold buyurtmasi uchun o'yinda buyurtma turi (1/2) tanlanmagan");

    const res = await this.moogold.createOrder({
      orderCategory: params.orderCategory,
      variationId: params.slug,
      quantity: 1,
      fields: buildMoogoldFields(playerId, serverId),
      partnerOrderId: params.partnerOrderId,
    });

    const orderId = res.account_details?.order_id;
    if (!orderId) {
      throw new Error(res.message || 'MooGold buyurtma raqamini qaytarmadi');
    }
    return {
      id: Number(orderId),
      category: 'moogold',
      status: 'processing',
      amount_usdt: '0',
      details: { moogold_message: res.message, player_id: res.account_details?.player_id },
    };
  }

  /**
   * CoinDrop buyurtmani odatda o'sha so'rovning o'zida yakunlaydi (~30s ichida, `delivered`
   * yoki `failed` bilan qaytadi) — lekin ba'zan `processing` holatida qolishi mumkin, shu
   * holatda SupplierPollingService keyinroq `getOrder` orqali kuzatib boradi.
   * `slug` (product_id) bo'lmasa — amount-based o'yin deb hisoblanadi va `amount` yuboriladi
   * (masalan CoinDrop'dagi Telegram Stars/Steam uchun maxsus miqdor).
   */
  private async deliverViaCoinDrop(params: FulfillParams): Promise<PayCoreOrder> {
    const playerId = params.playerInfo?.playerId;
    const serverId = params.playerInfo?.server;
    if (!playerId) throw new Error('CoinDrop buyurtmasi uchun player_id kerak');

    const body: Record<string, unknown> = {
      game_key: params.category,
      player_id: playerId,
      ...(serverId ? { server_id: serverId } : {}),
      ...(params.slug ? { product_id: params.slug } : { amount: params.amount }),
      ...(params.partnerOrderId ? { external_ref: params.partnerOrderId } : {}),
    };

    const res = await this.coindrop.createOrder(body);
    return {
      id: res.order_id,
      category: 'coindrop',
      status: mapCoinDropStatus(res.status),
      amount_usdt: String(res.amount_usd ?? '0'),
      details: { coindrop_message: res.message, product_name: res.product_name, player_id: res.player_id },
    };
  }

  private buildOrderBody(params: FulfillParams): Record<string, unknown> {
    const { category, slug, amount, playerInfo, extraQty } = params;
    const playerId = playerInfo?.playerId;
    const serverId = playerInfo?.server;

    if (CATEGORIES_REQUIRING_SERVER.has(category) && !serverId) {
      throw new Error(`"${category}" uchun server_id kerak, lekin buyurtmada yo'q`);
    }

    switch (category) {
      case 'pubg-uc-direct':
        if (!playerId) throw new Error("pubg-uc-direct uchun player_id kerak");
        return { category, player_id: playerId, amount };

      case 'pubg-sets':
      case 'pubg-popularity':
        if (!playerId) throw new Error(`${category} uchun player_id kerak`);
        if (!slug) throw new Error(`${category} uchun supplier_slug sozlanmagan`);
        return { category, slug, player_id: playerId };

      case 'free-fire':
      case 'honor-of-kings':
      case 'arena-breakout':
      case 'delta-force':
        if (!playerId) throw new Error(`${category} uchun player_id kerak`);
        if (!slug) throw new Error(`${category} uchun supplier_slug sozlanmagan`);
        return { category, slug, player_id: playerId };

      case 'mobile-legends-ru':
      case 'mobile-legends-global':
        if (!playerId) throw new Error(`${category} uchun player_id kerak`);
        if (!slug) throw new Error(`${category} uchun supplier_slug sozlanmagan`);
        return { category, slug, player_id: playerId, server_id: serverId };

      case 'telegram-stars':
      case 'telegram-premium':
        if (!playerId) throw new Error(`${category} uchun username (player_id maydonida) kerak`);
        if (!slug) throw new Error(`${category} uchun supplier_slug sozlanmagan`);
        return { category, slug, username: playerId.replace(/^@/, '') };

      case 'steam':
        if (!playerId) throw new Error("steam uchun login (player_id maydonida) kerak");
        return { category, login: playerId, amount_rub: amount };

      case 'vpn':
        // Player identifikatori umuman kerak emas — faqat oy soni (amount) va qurilmalar soni.
        return { category, months: amount, devices: extraQty && extraQty > 0 ? extraQty : 1 };

      default:
        throw new Error(`Qo'llab-quvvatlanmaydigan supplier kategoriyasi: "${category}"`);
    }
  }
}

/** MooGold'da maydon nomlari o'yinga qarab o'zgaradi, lekin amalda deyarli hamma joyda "User ID" + "Server". */
function buildMoogoldFields(playerId: string, serverId?: string): Record<string, string> {
  return { 'User ID': playerId, ...(serverId ? { Server: serverId } : {}) };
}

/** MooGold holatini bizning ichki ('processing' | 'completed' | 'failed') holatga o'giradi. */
function mapMoogoldStatus(status: string): PayCoreOrder['status'] {
  if (status === 'completed') return 'completed';
  // 'refunded' — buyurtma bekor qilinib pul qaytarilgan; 'incorrect-details' — noto'g'ri
  // ma'lumot sabab bajarilmagan (qo'lda aralashuv kerak). Ikkalasi ham biz uchun muvaffaqiyatsiz.
  if (status === 'refunded' || status === 'incorrect-details') return 'failed';
  return 'processing';
}

/** CoinDrop holatini bizning ichki ('processing' | 'completed' | 'failed') holatga o'giradi. */
function mapCoinDropStatus(status: string): PayCoreOrder['status'] {
  if (status === 'delivered') return 'completed';
  if (status === 'failed') return 'failed';
  return 'processing';
}
