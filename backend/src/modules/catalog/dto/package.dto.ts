export interface PackageRow {
  id: string;
  game_id: string;
  label: string;
  amount: string;
  bonus: string | null;
  price: string;
  badge: 'x2' | 'top' | null;
  group_name: string;
  sort_order: number;
  is_active: boolean;
  supplier_slug: string | null;
  extra_qty: number | null;
  icon: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PackageDto {
  id: string;
  gameId: string;
  label: string;
  amount: number;
  bonus: number | null;
  price: number;
  badge: 'x2' | 'top' | null;
  groupName: string;
  sortOrder: number;
  isActive: boolean;
  supplierSlug: string | null;
  /** Faqat 'vpn' kategoriyasi uchun — qurilmalar soni (PayCore order body'dagi `devices`). */
  extraQty: number | null;
  /** Paket rasmi (Cloudinary URL) — ixtiyoriy. */
  icon: string | null;
}

/** Foydalanuvchi tomoniga chiqadigan shakl — yetkazib beruvchidagi mahsulot identifikatori (supplierSlug) bu yerda YO'Q. */
export type PublicPackageDto = Omit<PackageDto, 'supplierSlug' | 'extraQty'>;

export function toPublicPackageDto(row: PackageRow): PublicPackageDto {
  const { supplierSlug: _slug, extraQty: _extra, ...rest } = toPackageDto(row);
  return rest;
}

export function toPackageDto(row: PackageRow): PackageDto {
  return {
    id: row.id,
    gameId: row.game_id,
    label: row.label,
    amount: Number(row.amount),
    bonus: row.bonus === null ? null : Number(row.bonus),
    price: Number(row.price),
    badge: row.badge,
    groupName: row.group_name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    supplierSlug: row.supplier_slug,
    extraQty: row.extra_qty,
    icon: row.icon,
  };
}
