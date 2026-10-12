import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { Env } from '../../../config/env';
import type {
  MoogoldBalance,
  MoogoldCreateOrderResult,
  MoogoldOrderDetail,
  MoogoldProductDetail,
  MoogoldProductListItem,
  MoogoldServerList,
  MoogoldValidateResult,
} from '../dto/moogold.dto';

/** `fetch()` xatosi ko'pincha "fetch failed" deb qisqartirilgan bo'ladi — asl sabab
 * (masalan ENETUNREACH, DNS xatosi) `err.cause`da yashiringan, shuni ham chiqarib beramiz. */
function describeFetchError(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? `${err.message} — ${cause.message}` : err.message;
  }
  return String(err);
}

export class MoogoldApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

/**
 * MooGold API bilan minimal HTTP integratsiya. Har bir chaqiruv — `POST {base}/{path}`,
 * va `path` yana body ichida ham takrorlanadi. Uchta sarlavha talab qilinadi:
 *   Authorization: Basic base64(partnerId:secretKey)
 *   timestamp:     joriy unix vaqt (soniyalarda)
 *   auth:          HMAC-SHA256(body + timestamp + path, secretKey)
 * Imzo AYNAN yuborilayotgan body satridan hisoblanishi shart — shuning uchun JSON bir
 * marta serializatsiya qilinib, ham imzoga, ham so'rov tanasiga o'sha satr ishlatiladi.
 */
@Injectable()
export class MoogoldClientService {
  private readonly logger = new Logger(MoogoldClientService.name);
  private readonly base = 'https://moogold.com/wp-json/v1/api';
  private readonly partnerId?: string;
  private readonly secretKey?: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.partnerId = this.config.get('MOOGOLD_PARTNER_ID', { infer: true });
    this.secretKey = this.config.get('MOOGOLD_SECRET_KEY', { infer: true });
  }

  get isEnabled(): boolean {
    return !!(this.partnerId && this.secretKey);
  }

  private async request<T>(path: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.partnerId || !this.secretKey) {
      throw new MoogoldApiError('DISABLED', 'MooGold ulanmagan (MOOGOLD_PARTNER_ID/SECRET_KEY sozlanmagan)', 503);
    }

    const body = JSON.stringify({ path, ...payload });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const auth = createHmac('sha256', this.secretKey).update(body + timestamp + path).digest('hex');
    const basic = Buffer.from(`${this.partnerId}:${this.secretKey}`).toString('base64');

    let res: Response;
    try {
      res = await fetch(`${this.base}/${path}`, {
        method: 'POST',
        headers: {
          authorization: `Basic ${basic}`,
          auth,
          timestamp,
          'content-type': 'application/json',
        },
        body,
      });
    } catch (err) {
      const message = describeFetchError(err);
      this.logger.error(`MooGold so'rovi bajarilmadi (${path}): ${message}`);
      throw new MoogoldApiError('NETWORK_ERROR', message, 502);
    }

    const json = (await res.json().catch(() => null)) as (T & { err_code?: string; err_message?: string }) | null;
    if (!json || json.err_code) {
      const code = json?.err_code ?? 'UNKNOWN';
      const message = json?.err_message ?? `MooGold HTTP ${res.status}`;
      throw new MoogoldApiError(code, message, res.status);
    }
    return json as T;
  }

  getBalance() {
    return this.request<MoogoldBalance>('user/balance');
  }

  listProducts(categoryId: number) {
    return this.request<MoogoldProductListItem[]>('product/list_product', { category_id: categoryId });
  }

  getProductDetail(productId: number) {
    return this.request<MoogoldProductDetail>('product/product_detail', { product_id: productId });
  }

  getServerList(productId: number) {
    return this.request<MoogoldServerList>('product/server_list', { product_id: productId });
  }

  /** `fields` — o'yinga qarab o'zgaruvchan maydonlar, masalan `{ 'User ID': '123', Server: 'Asia' }`. */
  validate(productId: string, fields: Record<string, string>) {
    return this.request<MoogoldValidateResult>('product/validate', {
      data: { 'product-id': productId, ...fields },
    });
  }

  createOrder(params: {
    orderCategory: number; // 1 = direct top-up, 2 = eVoucher
    variationId: string;
    quantity: number;
    fields: Record<string, string>;
    partnerOrderId?: string;
  }) {
    return this.request<MoogoldCreateOrderResult>('order/create_order', {
      data: {
        category: String(params.orderCategory),
        'product-id': params.variationId,
        quantity: String(params.quantity),
        ...params.fields,
      },
      ...(params.partnerOrderId ? { partnerOrderId: params.partnerOrderId } : {}),
    });
  }

  getOrderDetail(orderId: number) {
    return this.request<MoogoldOrderDetail>('order/order_detail', { order_id: String(orderId) });
  }
}
