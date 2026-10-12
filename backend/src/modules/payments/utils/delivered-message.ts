/**
 * PayCore buyurtmasi 'completed' bo'lganda buyuvchiga yuboriladigan xabar — odatda umumiy
 * matn, lekin VPN kabi kategoriyalarda `details` ichida foydalanuvchiga zarur bo'lgan narsa
 * (masalan `subscription_url`) bo'lsa — shuni ham xabarga qo'shib yuboradi.
 */
export function buildDeliveredMessage(orderNo: number, details: Record<string, unknown> | null | undefined): string {
  const base = `✅ Buyurtma #${orderNo} avtomatik yetkazib berildi!`;
  const subscriptionUrl = details && typeof details.subscription_url === 'string' ? details.subscription_url : null;
  if (!subscriptionUrl) return base;
  return `${base}\n\n🔗 VPN havolangiz:\n<code>${subscriptionUrl}</code>\n\nShu havolani VPN ilovangizga (masalan V2Box, Hiddify) import qiling.`;
}
