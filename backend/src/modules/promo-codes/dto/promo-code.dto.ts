export interface PromoCodeRow {
  id: string;
  code: string;
  bonus_amount: string;
  expires_at: Date | null;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminPromoCodeDto {
  id: string;
  code: string;
  bonusAmount: number;
  expiresAt: string | null;
  isActive: boolean;
  redemptionsCount: number;
  createdAt: string;
}

export function toAdminPromoCodeDto(row: PromoCodeRow & { redemptions_count?: string | number }): AdminPromoCodeDto {
  return {
    id: row.id,
    code: row.code,
    bonusAmount: Number(row.bonus_amount),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    isActive: row.is_active,
    redemptionsCount: Number(row.redemptions_count ?? 0),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export interface RedeemResultDto {
  bonusAmount: number;
  balance: number;
}
