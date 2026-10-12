/** MooGold API (https://doc.moogold.com) — xom javob shakllari. */

export interface MoogoldBalance {
  currency: string;
  balance: string;
}

export interface MoogoldProductListItem {
  ID: string;
  post_title: string;
}

export interface MoogoldVariation {
  variation_name: string;
  variation_id: number;
  variation_price: number;
  stock_status: string;
}

export interface MoogoldProductDetail {
  Product_Name: string;
  Image_URL: string;
  Variation: MoogoldVariation[];
}

/** `product/server_list` — { "Server nomi": "server_id", ... } shaklidagi lug'at. */
export type MoogoldServerList = Record<string, string>;

export interface MoogoldValidateResult {
  status: boolean | string;
  message: string;
  username?: string;
}

export interface MoogoldCreateOrderResult {
  status: boolean | string;
  message: string;
  account_details?: {
    player_id?: string;
    server_id?: string;
    order_id?: string;
  };
}

/** MooGold buyurtma holatlari: 'processing' | 'completed' | 'refunded' | 'incorrect-details' va h.k. */
export interface MoogoldOrderDetail {
  order_id: string;
  order_status: string;
  total?: string;
  item?: unknown[];
}
