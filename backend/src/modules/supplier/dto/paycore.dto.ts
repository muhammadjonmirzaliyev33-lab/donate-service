/** PayCore Supplier API v2 (https://supplier.pay-core.ru/docs) — xom javob shakllari. */

export interface PayCoreAccount {
  id: number;
  balance: string;
  currency: string;
  username: string;
}

export interface PayCoreCategory {
  slug: string;
  title: string;
}

export interface PayCoreProduct {
  id: number;
  category: string;
  slug: string;
  denomination?: number;
  title: string;
  price_usdt: string;
  in_stock: number;
  enabled: boolean;
}

export type PayCoreOrderStatus = 'processing' | 'completed' | 'failed';

export interface PayCoreOrder {
  id: number;
  category: string;
  slug?: string;
  status: PayCoreOrderStatus;
  amount_usdt: string;
  created_at?: string;
  details?: Record<string, unknown>;
}
