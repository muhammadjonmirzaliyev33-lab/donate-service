export interface UserRow {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  phone: string | null;
  language: 'uz' | 'ru';
  balance: string;
  cashback: string;
  referred_by: string | null;
  referral_rewarded_at: Date | null;
  referral_reward_amount: string | null;
  referral_reward_payment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserDto {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  phone: string | null;
  /** Frontend shu maydonga qarab "telefon ulashish" ekranini ko'rsatadi (`phone !== null` bilan bir xil, lekin aniqroq). */
  phoneShared: boolean;
  language: 'uz' | 'ru';
  balance: number;
  cashback: number;
}

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    username: row.username,
    firstName: row.first_name,
    phone: row.phone,
    phoneShared: row.phone !== null,
    language: row.language,
    balance: Number(row.balance),
    cashback: Number(row.cashback),
  };
}

export interface AdminUserDto extends UserDto {
  ordersCount: number;
  totalSpent: number;
  createdAt: Date;
}

export function toAdminUserDto(row: UserRow & { orders_count: string; total_spent: string }): AdminUserDto {
  return {
    ...toUserDto(row),
    ordersCount: Number(row.orders_count),
    totalSpent: Number(row.total_spent),
    createdAt: row.created_at,
  };
}

export interface ReferralInvitedRow {
  username: string | null;
  first_name: string | null;
  referral_rewarded_at: Date | null;
  referral_reward_amount: string | null;
  created_at: Date;
}

export interface ReferralInvitedDto {
  username: string | null;
  firstName: string | null;
  rewarded: boolean;
  createdAt: Date;
}

export interface ReferralSummaryDto {
  link: string | null;
  invitedCount: number;
  totalEarned: number;
  invited: ReferralInvitedDto[];
}
