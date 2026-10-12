import { iconHtml } from '../icons'

export type AdminTab = 'queue' | 'history' | 'stats' | 'users' | 'catalog' | 'stock' | 'cards' | 'promo' | 'broadcast' | 'settings'

const TABS: { tab: AdminTab; label: string; hash: string }[] = [
  { tab: 'queue', label: 'Navbat', hash: '#/admin' },
  { tab: 'history', label: 'Buyurtmalar', hash: '#/admin/history' },
  { tab: 'stats', label: 'Statistika', hash: '#/admin/stats' },
  { tab: 'users', label: 'Userlar', hash: '#/admin/users' },
  { tab: 'catalog', label: 'Katalog', hash: '#/admin/catalog' },
  { tab: 'stock', label: 'Zaxira', hash: '#/admin/stock' },
  { tab: 'cards', label: 'Kartalar', hash: '#/admin/cards' },
  { tab: 'promo', label: 'Promokodlar', hash: '#/admin/promo' },
  { tab: 'broadcast', label: 'Xabar', hash: '#/admin/broadcast' },
  { tab: 'settings', label: 'Sozlamalar', hash: '#/admin/settings' }
]

/** Har bir admin sahifasi shu qobiq ichida ochiladi — sarlavha + bo'limlar orasida sakrash tablari. */
export function adminShellHtml(active: AdminTab, bodyHtml: string): string {
  return `
    <div class="topbar">
      <div class="brand">
        <div class="brand-icon">${iconHtml('layoutDashboard')}</div>
        <div class="brand-titles">
          <h1>Admin panel</h1>
          <p>Boshqaruv</p>
        </div>
      </div>
    </div>
    <div class="tab-row" id="admin-tab-row">
      ${TABS.map((t) => `<a class="chip ${t.tab === active ? 'active' : ''}" href="${t.hash}">${t.label}</a>`).join('')}
    </div>
    <div id="admin-body" style="padding-bottom:24px">${bodyHtml}</div>
  `
}

/**
 * `root.innerHTML = adminShellHtml(...)` bilan bir qatorda chaqiriladi — faol tab
 * (masalan "Sozlamalar", tab qatorida oxirida) har doim ko'rinadigan qilib scroll
 * qilinadi. Aks holda qator boshidan (masalan "Navbat"dan) boshlanib turib qoladi va
 * foydalanuvchiga xuddi "yana navbatga qaytib ketganday" tuyuladi.
 */
export function scrollActiveAdminTabIntoView(root: ParentNode) {
  const active = root.querySelector<HTMLElement>('#admin-tab-row .chip.active')
  active?.scrollIntoView({ block: 'nearest', inline: 'center' })
}

export const ADMIN_LOADING_HTML = `<div class="empty-state"><p>Yuklanmoqda…</p></div>`

export function adminErrorHtml(err: unknown): string {
  const code = (err as { code?: string })?.code
  if (code === 'AUTH_NOT_ADMIN') {
    return `<div class="empty-state"><div class="icon">${iconHtml('circleAlert')}</div><h3>Admin huquqi yo'q</h3><p>Bu bo'lim faqat adminlar uchun.</p></div>`
  }
  if (typeof code === 'string' && code.startsWith('AUTH_')) {
    return `<div class="empty-state"><div class="icon">${iconHtml('circleAlert')}</div><h3>Kirish rad etildi</h3><p>Bu sahifa faqat Telegram Mini App ichida ochilganda ishlaydi.</p></div>`
  }
  return `<div class="empty-state"><div class="icon">${iconHtml('circleAlert')}</div><h3>Xatolik yuz berdi</h3><p>${err instanceof Error ? err.message : String(err)}</p></div>`
}
