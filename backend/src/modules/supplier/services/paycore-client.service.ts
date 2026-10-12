import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import type { PayCoreAccount, PayCoreCategory, PayCoreOrder, PayCoreProduct } from '../dto/paycore.dto';

/** `fetch()` xatosi ko'pincha "fetch failed" deb qisqartirilgan bo'ladi — asl sabab
 * (masalan ENETUNREACH, DNS xatosi) `err.cause`da yashiringan, shuni ham chiqarib beramiz. */
function describeFetchError(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? `${err.message} — ${cause.message}` : err.message;
  }
  return String(err);
}

/** PayCore javobidagi `{ ok:false, error:{code,message} }` xatosi — code'ga qarab (masalan
 * OUT_OF_STOCK, INSUFFICIENT_FUNDS) chaqiruvchi turlicha reaksiya bildirishi mumkin. */
export class PayCoreApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

interface PayCoreEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** PayCore Supplier API v2 bilan minimal HTTP integratsiya — SDK shart emas. Kalit
 * berilmagan bo'lsa (`PAYCORE_API_KEY` yo'q) integratsiya butunlay o'chirilgan holda ishlaydi. */
@Injectable()
export class PayCoreClientService {
  private readonly logger = new Logger(PayCoreClientService.name);
  private readonly apiKey?: string;
  private readonly base = 'https://supplier.pay-core.ru/v2';

  constructor(private readonly config: ConfigService<Env, true>) {
    this.apiKey = this.config.get('PAYCORE_API_KEY', { infer: true });
  }

  get isEnabled(): boolean {
    return !!this.apiKey;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new PayCoreApiError('DISABLED', "PayCore ulanmagan (PAYCORE_API_KEY sozlanmagan)", 503);
    }

    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...init.headers,
        },
      });
    } catch (err) {
      const message = describeFetchError(err);
      this.logger.error(`PayCore so'rovi bajarilmadi (${path}): ${message}`);
      throw new PayCoreApiError('NETWORK_ERROR', message, 502);
    }

    const json = (await res.json().catch(() => null)) as PayCoreEnvelope<T> | null;
    if (!json || !json.ok) {
      const code = json?.error?.code ?? 'UNKNOWN';
      const message = json?.error?.message ?? `PayCore HTTP ${res.status}`;
      throw new PayCoreApiError(code, message, res.status);
    }
    return json.data as T;
  }

  getHealth() {
    return this.request<{ status: string; service: string; version: string }>('/health');
  }

  getAccount() {
    return this.request<PayCoreAccount>('/account');
  }

  listCategories() {
    return this.request<{ categories: PayCoreCategory[] }>('/catalog/categories');
  }

  listCatalog(category?: string) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<{ category?: string; products: PayCoreProduct[] }>(`/catalog${qs}`);
  }

  checkPubgId(playerId: string) {
    return this.request<{ found: boolean; nickname?: string }>('/checks/pubg-id', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    });
  }

  checkGamePlayer(category: string, playerId: string, serverId?: string) {
    return this.request<{ found: boolean; nickname?: string }>('/checks/game-player', {
      method: 'POST',
      body: JSON.stringify({ category, player_id: playerId, ...(serverId ? { server_id: serverId } : {}) }),
    });
  }

  checkTelegramUser(username: string) {
    return this.request<{ exists: boolean; is_premium: boolean }>('/checks/telegram-user', {
      method: 'POST',
      body: JSON.stringify({ username: username.replace(/^@/, '') }),
    });
  }

  createOrder(body: Record<string, unknown>) {
    return this.request<{ order: PayCoreOrder }>('/orders', { method: 'POST', body: JSON.stringify(body) });
  }

  getOrder(id: number) {
    return this.request<{ order: PayCoreOrder }>(`/orders/${id}`);
  }
}
