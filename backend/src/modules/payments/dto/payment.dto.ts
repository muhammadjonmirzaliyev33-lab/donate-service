export type PaymentKind = 'purchase' | 'topup';
export type PaymentStatus = 'pending_review' | 'completed' | 'cancelled' | 'expired';
export type PaymentMethod = 'card' | 'atm' | 'foreign' | 'balance';

export interface PaymentRow {
  id: string;
  order_no: number;
  user_id: string;
  kind: PaymentKind;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: string;
  match_amount: string | null;
  game_id: string | null;
  package_id: string | null;
  player_info: Record<string, string> | null;
  admin_id: string | null;
  telegram_alert_message_id: string | null;
  telegram_alert_is_photo: boolean;
  receipt_message_id: string | null;
  receipt_url: string | null;
  reject_reason: string | null;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
  supplier_order_id: string | null;
  supplier_provider: 'paycore' | 'moogold' | 'coindrop' | null;
  supplier_status: 'processing' | 'completed' | 'failed' | null;
  supplier_details: Record<string, unknown> | null;
  supplier_error: string | null;
}

/** Admin ekranlari uchun — user/game/package bilan JOIN qilingan qator (PaymentsRepository). */
export interface PaymentDetailRow extends PaymentRow {
  user_telegram_id: string;
  user_username: string | null;
  user_first_name: string | null;
  game_name: string | null;
  package_label: string | null;
}

export interface PaymentDto {
  id: string;
  orderNo: number;
  userId: string;
  kind: PaymentKind;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  /** User o'tkazishi kerak bo'lgan ANIQ summa (amount + noyob offset) — faqat karta/bankomat/chet
   * el usullarida bor; balansdan to'lovda va eski (offset ajratilmagan) yozuvlarda null. */
  matchAmount: number | null;
  gameId: string | null;
  packageId: string | null;
  playerInfo: Record<string, string> | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  rejectReason: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  supplierStatus: 'processing' | 'completed' | 'failed' | null;
  supplierDetails: Record<string, unknown> | null;
  supplierError: string | null;
}

export function toPaymentDto(row: PaymentRow): PaymentDto {
  return {
    id: row.id,
    orderNo: row.order_no,
    userId: row.user_id,
    kind: row.kind,
    status: row.status,
    method: row.method,
    amount: Number(row.amount),
    matchAmount: row.match_amount === null ? null : Number(row.match_amount),
    gameId: row.game_id,
    packageId: row.package_id,
    playerInfo: row.player_info,
    hasReceipt: row.receipt_message_id !== null,
    receiptUrl: row.receipt_url,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    supplierStatus: row.supplier_status,
    supplierDetails: row.supplier_details,
    supplierError: row.supplier_error,
  };
}

/** Admin ekranlari uchun — kim (user), qaysi o'yin/paket ekanini ham o'z ichiga oladi. */
export interface PaymentDetailDto extends PaymentDto {
  userTelegramId: string;
  username: string | null;
  firstName: string | null;
  gameName: string | null;
  packageLabel: string | null;
  decidedAt: Date;
  /** SMS/notification orqali avtomatik tasdiqlangan bo'lsa true (admin_id=0, PaymentMatcherService'ning shartli qiymati). */
  decidedBySms: boolean;
}

export function toPaymentDetailDto(row: PaymentDetailRow): PaymentDetailDto {
  return {
    ...toPaymentDto(row),
    userTelegramId: row.user_telegram_id,
    username: row.user_username,
    firstName: row.user_first_name,
    gameName: row.game_name,
    packageLabel: row.package_label,
    decidedAt: row.updated_at,
    decidedBySms: row.admin_id === '0',
  };
}
