/** CoinDrop API (https://coindrop.uz/api-docs) — xom javob shakllari. */

export interface CoinDropAccount {
  id: number;
  name: string;
  email: string;
  api_enabled: boolean;
  balance_usd: number;
  balance_uzs: number;
  retail_markup_pct: number;
  personal_discount_pct: number;
  total_discount_pct: number;
  has_validator: boolean;
}

export interface CoinDropBalance {
  balance_usd: number;
  balance_uzs: number;
  name: string;
}

/** `/games` — har bir o'yin uchun formani qanday qurish kerakligini bildiruvchi flaglar. */
export interface CoinDropGame {
  key: string;
  name: string;
  image_url?: string;
  category?: string;
  popular?: boolean;
  id_type: 'numeric' | 'text';
  id_label: string;
  amount_based: boolean;
  requires_server: boolean;
  server_label?: string;
  has_validator: boolean;
}

export interface CoinDropProduct {
  id: string;
  name: string;
  amount: number | null;
  price_usd: number;
  price_uzs: number;
  retail_usd: number;
  retail_uzs: number;
  image?: string;
}

export interface CoinDropProductsMeta {
  id_type: 'numeric' | 'text';
  id_label: string;
  amount_based: boolean;
  requires_server: boolean;
  server_label?: string;
  has_validator: boolean;
}

export interface CoinDropValidateResult {
  success: boolean;
  valid: boolean;
  player_id?: string;
  username?: string;
  premium?: boolean;
  message?: string;
}

/** `/orders` (POST) javobi — buyurtma odatda shu javobning o'zida yakunlanadi (~30s ichida). */
export interface CoinDropCreateOrderResult {
  success: boolean;
  order_id: number;
  status: 'processing' | 'delivered' | 'failed';
  game_key: string;
  product_name?: string;
  player_id?: string;
  amount_usd?: number;
  amount_uzs?: number;
  message?: string;
}

export interface CoinDropOrderDetail {
  id: number;
  game_key: string;
  product_name?: string;
  player_id?: string;
  server_id?: string;
  amount_usd?: number;
  amount_uzs?: number;
  status: 'processing' | 'delivered' | 'failed';
  external_ref?: string;
  created_at?: string;
  updated_at?: string;
}
