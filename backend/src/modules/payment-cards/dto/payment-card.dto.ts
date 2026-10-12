export interface PaymentCardRow {
  id: string;
  bank_name: string;
  card_number: string;
  holder_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentCardDto {
  id: string;
  bankName: string;
  cardNumber: string;
  holderName: string;
  isActive: boolean;
  sortOrder: number;
}

export function toPaymentCardDto(row: PaymentCardRow): PaymentCardDto {
  return {
    id: row.id,
    bankName: row.bank_name,
    cardNumber: row.card_number,
    holderName: row.holder_name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}
