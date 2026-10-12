import { PaymentNotificationCode } from './notification-code.enum';

interface NotificationParams {
  amountText: string;
  reason?: string | null;
  adminLabel?: string;
}

/** Har bir kodning yagona matn manbai — shu joydan boshqa hech qayerda takrorlanmaydi. */
const PAYMENT_NOTIFICATION_TEXT: Record<PaymentNotificationCode, (params: NotificationParams) => string> = {
  [PaymentNotificationCode.TOPUP_APPROVED]: ({ amountText }) => `✅ Hisobingiz to'ldirildi: ${amountText}`,
  [PaymentNotificationCode.PURCHASE_APPROVED]: ({ amountText }) =>
    `✅ To'lovingiz tasdiqlandi (${amountText}). Buyurtmangiz tez orada yetkaziladi.`,
  [PaymentNotificationCode.PAYMENT_REJECTED]: ({ amountText, reason }) =>
    `❌ To'lovingiz rad etildi (${amountText}).${reason ? `\nSabab: ${reason}` : ''} Savol bo'lsa admin bilan bog'laning.`,
  [PaymentNotificationCode.ADMIN_ALERT_APPROVED]: ({ adminLabel }) => `✅ Tasdiqlandi${adminLabel ? ` — ${adminLabel}` : ''}`,
  [PaymentNotificationCode.ADMIN_ALERT_REJECTED]: ({ reason, adminLabel }) =>
    `❌ Rad etildi${adminLabel ? ` — ${adminLabel}` : ''}${reason ? `\nSabab: ${reason}` : ''}`,
  [PaymentNotificationCode.PAYMENT_UNDONE]: () => "🔄 To'lovingiz qayta ko'rib chiqilmoqda, tez orada admin qayta hal qiladi.",
};

export function getPaymentNotificationText(
  code: PaymentNotificationCode,
  params: NotificationParams = { amountText: '' },
): string {
  return PAYMENT_NOTIFICATION_TEXT[code](params);
}
