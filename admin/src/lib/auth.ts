const USERNAME_KEY = 'komakpay_admin_username'

/**
 * Haqiqiy autentifikatsiya butunlay httpOnly cookie orqali (JS o'qiy olmaydi) — bu yerda
 * faqat "oldin kirilgan edi" degan UI signali sifatida username saqlanadi (optimistic
 * render: sahifa qayta ochilganda darhol login ekranini ko'rsatmaslik uchun), haqiqiy
 * sessiya emas. Har doim App.tsx mount bo'lganda /admin-auth/refresh orqali tekshiriladi.
 */
export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}

export function setUsername(username: string): void {
  localStorage.setItem(USERNAME_KEY, username)
}

export function clearUsername(): void {
  localStorage.removeItem(USERNAME_KEY)
}
