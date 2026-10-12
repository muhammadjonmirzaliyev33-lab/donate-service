import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import type {
  CoinDropAccount,
  CoinDropBalance,
  CoinDropCreateOrderResult,
  CoinDropGame,
  CoinDropOrderDetail,
  CoinDropProduct,
  CoinDropProductsMeta,
  CoinDropValidateResult,
} from '../dto/coindrop.dto';

/** `fetch()` xatosi ko'pincha "fetch failed" deb qisqartirilgan bo'ladi — asl sabab
 * (masalan ENETUNREACH, DNS xatosi) `err.cause`da yashiringan, shuni ham chiqarib beramiz. */
function describeFetchError(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? `${err.message} — ${cause.message}` : err.message;
  }
  return String(err);
}

/** CoinDrop javobidagi `{ detail: "..." }` xatosi (HTTP status !== 2xx bo'lganda). */
export class CoinDropApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

/**
 * CoinDrop API (https://coindrop.uz/api-docs) bilan minimal HTTP integratsiya — SDK shart
 * emas. Auth `X-API-Key` sarlavhasi orqali. Kalit berilmagan bo'lsa (`COINDROP_API_KEY` yo'q)
 * integratsiya butunlay o'chirilgan holda ishlaydi. `/games/validate` faqat Validator tarifi
 * yoqilgan (`has_validator: true`) hisoblar uchun ishlaydi — aks holda 403 qaytadi.
 */
@Injectable()
export class CoinDropClientService {
  private readonly logger = new Logger(CoinDropClientService.name);
  private readonly apiKey?: string;
  private readonly base = 'https://coindrop.uz/api/v1';

  constructor(private readonly config: ConfigService<Env, true>) {
    this.apiKey = this.config.get('COINDROP_API_KEY', { infer: true });
  }

  get isEnabled(): boolean {
    return !!this.apiKey;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new CoinDropApiError("CoinDrop ulanmagan (COINDROP_API_KEY sozlanmagan)", 503);
    }

    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: {
          'X-API-Key': this.apiKey,
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...init.headers,
        },
      });
    } catch (err) {
      const message = describeFetchError(err);
      this.logger.error(`CoinDrop so'rovi bajarilmadi (${path}): ${message}`);
      throw new CoinDropApiError(message, 502);
    }

    const json = (await res.json().catch(() => null)) as (T & { detail?: string }) | null;
    if (!res.ok) {
      throw new CoinDropApiError(json?.detail ?? `CoinDrop HTTP ${res.status}`, res.status);
    }
    return json as T;
  }

  getAccount() {
    return this.request<{ success: boolean; account: CoinDropAccount }>('/account');
  }

  getBalance() {
    return this.request<{ success: boolean } & CoinDropBalance>('/balance');
  }

  listGames() {
    return this.request<{ success: boolean; games: CoinDropGame[] }>('/games');
  }

  listProducts(gameKey: string) {
    return this.request<{ success: boolean; products: CoinDropProduct[]; meta: CoinDropProductsMeta }>(
      `/games/${encodeURIComponent(gameKey)}/products`,
    );
  }

  /** `success:false` bilan 200 ham qaytishi mumkin (masalan noto'g'ri ID) — bu xato emas, natija. */
  validate(gameKey: string, playerId: string, serverId?: string) {
    return this.request<CoinDropValidateResult>(`/games/${encodeURIComponent(gameKey)}/validate`, {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId, ...(serverId ? { server_id: serverId } : {}) }),
    });
  }

  createOrder(body: Record<string, unknown>) {
    return this.request<CoinDropCreateOrderResult>('/orders', { method: 'POST', body: JSON.stringify(body) });
  }

  getOrder(orderId: number) {
    return this.request<{ success: boolean; order: CoinDropOrderDetail }>(`/orders/${orderId}`);
  }
}
