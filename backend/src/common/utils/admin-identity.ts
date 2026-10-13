/**
 * Admin ekanini tekshiradi. ADMIN_TELEGRAM_IDS'da ikki xil yozuv bo'lishi mumkin:
 * raqamli Telegram ID ("123456789") va @username ("@UZDI_ORG"). Telegram username'ni
 * raqamli id'ga aylantirib beradigan API bermaydi, shuning uchun username bo'yicha
 * tekshiruv kelgan update/initData ichidagi `username` maydoni bilan solishtiriladi.
 *
 * Username'ni Telegram'da egasi istalgan vaqt o'zgartirishi mumkin — shu sabab ishonchli
 * variant raqamli id. Username faqat qulaylik uchun qo'llab-quvvatlanadi.
 */
export function isAdminIdentity(
  user: { id: bigint | number; username?: string | null },
  adminIds: readonly bigint[],
  adminUsernames: readonly string[],
): boolean {
  if (adminIds.includes(BigInt(user.id))) return true;
  const username = user.username?.trim().replace(/^@/, '').toLowerCase();
  return !!username && adminUsernames.includes(username);
}
