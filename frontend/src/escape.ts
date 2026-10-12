/** Foydalanuvchi kiritgan matnni (playerId, ism, username, sabab va h.k.) innerHTML'ga xavfsiz qo'yish uchun. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
