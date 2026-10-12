export interface ServerOption {
  label: string;
  value: string;
}

export interface GameRow {
  id: string;
  name: string;
  category: string;
  currency_name: string;
  gradient: string;
  icon: string | null;
  requires_server: boolean;
  server_options: ServerOption[] | null;
  sort_order: number;
  is_active: boolean;
  supplier_category: string | null;
  supplier_provider: 'paycore' | 'moogold' | 'coindrop';
  supplier_order_category: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface GameDto {
  id: string;
  name: string;
  category: string;
  currencyName: string;
  gradient: string;
  icon: string | null;
  requiresServer: boolean;
  serverOptions: ServerOption[] | null;
  sortOrder: number;
  isActive: boolean;
  /** paycore: kategoriya slug'i · moogold: product_id · coindrop: game_key */
  supplierCategory: string | null;
  supplierProvider: 'paycore' | 'moogold' | 'coindrop';
  /** Faqat moogold: 1 = direct top-up, 2 = eVoucher. */
  supplierOrderCategory: number | null;
}

/**
 * Foydalanuvchi tomoniga chiqadigan shakl — ichki yetkazib beruvchi sozlamalari
 * (qaysi provayder, qaysi kategoriya/mahsulot bilan bog'langani) bu yerda YO'Q.
 * Frontendga faqat "qanday identifikator so'ralsin" degan xulosa kerak, shuning
 * uchun uni `playerIdKind` sifatida serverda hisoblab beramiz.
 */
export interface PublicGameDto {
  id: string;
  name: string;
  category: string;
  currencyName: string;
  gradient: string;
  icon: string | null;
  requiresServer: boolean;
  serverOptions: ServerOption[] | null;
  sortOrder: number;
  isActive: boolean;
  /** 'numeric' — o'yin ID raqami · 'username' — Telegram username · 'none' — umuman so'ralmaydi (VPN). */
  playerIdKind: 'numeric' | 'username' | 'none';
}

const USERNAME_CATEGORIES = new Set(['telegram-stars', 'telegram-premium']);
const NO_ACCOUNT_CATEGORIES = new Set(['vpn']);

function playerIdKindOf(row: GameRow): PublicGameDto['playerIdKind'] {
  // Bu xulosa faqat PayCore kategoriyalariga bog'liq — MooGold o'yinlari doim raqamli ID.
  if (row.supplier_provider === 'moogold') return 'numeric';
  if (NO_ACCOUNT_CATEGORIES.has(row.supplier_category ?? '')) return 'none';
  if (USERNAME_CATEGORIES.has(row.supplier_category ?? '')) return 'username';
  return 'numeric';
}

export function toPublicGameDto(row: GameRow): PublicGameDto {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    currencyName: row.currency_name,
    gradient: row.gradient,
    icon: row.icon,
    requiresServer: row.requires_server,
    serverOptions: row.server_options,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    playerIdKind: playerIdKindOf(row),
  };
}

export function toGameDto(row: GameRow): GameDto {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    currencyName: row.currency_name,
    gradient: row.gradient,
    icon: row.icon,
    requiresServer: row.requires_server,
    serverOptions: row.server_options,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    supplierCategory: row.supplier_category,
    supplierProvider: row.supplier_provider ?? 'paycore',
    supplierOrderCategory: row.supplier_order_category,
  };
}
