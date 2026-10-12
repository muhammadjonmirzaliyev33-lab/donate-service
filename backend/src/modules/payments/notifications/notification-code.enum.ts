/**
 * To'lov holati o'zgarganda foydalanuvchiga/adminga yuboriladigan xabar kodlari.
 * Bitta natija (masalan "tasdiqlandi") ikkita joyga ketadi — userga shaxsiy xabar
 * VA admin guruhidagi signal xabarini tahrirlash — shuning uchun matn ikki marta
 * qo'lda yozilmasin deb, har biri shu yerda BITTA marta belgilanadi.
 */
export enum PaymentNotificationCode {
  TOPUP_APPROVED = 'TOPUP_APPROVED',
  PURCHASE_APPROVED = 'PURCHASE_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  ADMIN_ALERT_APPROVED = 'ADMIN_ALERT_APPROVED',
  ADMIN_ALERT_REJECTED = 'ADMIN_ALERT_REJECTED',
  PAYMENT_UNDONE = 'PAYMENT_UNDONE',
}
