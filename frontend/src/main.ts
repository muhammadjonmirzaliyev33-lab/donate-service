import './style.css'
import { currentHash, parseRoute } from './router'
import { renderBottomNav, attachBottomNav, updateBottomNav, refreshBottomNavLabels, appendAdminTab } from './components/bottomNav'
import { renderHome } from './screens/home'
import { renderGames } from './screens/games'
import { renderGameDetail } from './screens/gameDetail'
import { renderHistory } from './screens/history'
import { renderProfile } from './screens/profile'
import { renderTopUp } from './screens/topup'
import { renderNotFound } from './screens/notFound'
import { renderAdminQueue } from './screens/admin/queue'
import { renderAdminHistory } from './screens/admin/history'
import { renderAdminStats } from './screens/admin/stats'
import { renderAdminUsers } from './screens/admin/users'
import { renderAdminCatalog } from './screens/admin/catalog'
import { renderAdminStock } from './screens/admin/stock'
import { renderAdminCards } from './screens/admin/cards'
import { renderAdminPromo } from './screens/admin/promo'
import { renderAdminBroadcast } from './screens/admin/broadcast'
import { renderAdminBroadcastHistory } from './screens/admin/broadcastHistory'
import { renderAdminSettings } from './screens/admin/settings'
import { checkIsAdmin } from './admin/api'
import { initTelegram } from './telegram'
import { applyTheme, getTheme, subscribe } from './store'
import { revealScreen } from './animations'
import { closeSheet } from './components/sheet'

const ADMIN_ROUTES = new Set([
  'admin-queue',
  'admin-history',
  'admin-stats',
  'admin-users',
  'admin-catalog',
  'admin-stock',
  'admin-cards',
  'admin-promo',
  'admin-broadcast',
  'admin-broadcast-history',
  'admin-settings'
])

initTelegram()

// Telefon raqami botga ulashilmagan bo'lsa backend katalog/to'lovlarni bermaydi — foydalanuvchiga nima qilish kerakligini ko'rsatamiz.
window.addEventListener('phone-required', () => {
  if (document.getElementById('phone-required')) return
  const box = document.createElement('div')
  box.id = 'phone-required'
  box.className = 'phone-required'
  box.innerHTML = `
    <img src="/images/logo.png" alt="UZDI" />
    <h2>Telefon raqamingizni ulashing</h2>
    <p>Botga qaytib <b>/start</b> bosing va "Telefon raqamini ulashish" tugmasini bosing. Keyin ilovani qayta oching.</p>
    <button class="btn btn-accent" id="phone-required-close">Botga qaytish</button>`
  document.body.appendChild(box)
  box.querySelector('#phone-required-close')!.addEventListener('click', () => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { close: () => void } } }).Telegram?.WebApp
    if (tg) tg.close()
    else box.remove()
  })
})
applyTheme(getTheme())
const app = document.getElementById('app')!

const navHolder = document.createElement('div')
navHolder.innerHTML = renderBottomNav(currentHash())
const nav = navHolder.firstElementChild as HTMLElement
document.body.appendChild(nav)
attachBottomNav(nav)

subscribe(() => {
  applyTheme(getTheme())
  refreshBottomNavLabels(nav)
})

// Admin ekanini bir marta tekshiramiz — natija keshlanadi (har navigatsiyada qayta so'ralmaydi).
let adminCheck: Promise<boolean> | null = null
function isAdmin(): Promise<boolean> {
  if (!adminCheck) adminCheck = checkIsAdmin()
  return adminCheck
}
isAdmin().then((ok) => {
  if (ok) appendAdminTab(nav)
})

function render() {
  const hash = currentHash()
  const route = parseRoute(hash)

  closeSheet()

  const screen = document.createElement('div')
  screen.className = 'screen'

  app.innerHTML = ''
  app.appendChild(screen)

  nav.classList.remove('hidden')

  if (ADMIN_ROUTES.has(route.name)) {
    isAdmin().then((ok) => {
      // Boshqa (admin bo'lmagan) foydalanuvchilar uchun "admin huquqi yo'q" o'rniga
      // oddiy 404 — admin panel borligini ham bildirmaymiz.
      if (!ok) {
        renderNotFound(screen)
        revealScreen(screen)
        return
      }
      if (route.name === 'admin-queue') renderAdminQueue(screen)
      else if (route.name === 'admin-history') renderAdminHistory(screen)
      else if (route.name === 'admin-stats') renderAdminStats(screen)
      else if (route.name === 'admin-users') renderAdminUsers(screen)
      else if (route.name === 'admin-catalog') renderAdminCatalog(screen)
      else if (route.name === 'admin-stock') renderAdminStock(screen)
      else if (route.name === 'admin-cards') renderAdminCards(screen)
      else if (route.name === 'admin-promo') renderAdminPromo(screen)
      else if (route.name === 'admin-broadcast') renderAdminBroadcast(screen)
      else if (route.name === 'admin-broadcast-history') renderAdminBroadcastHistory(screen)
      else if (route.name === 'admin-settings') renderAdminSettings(screen)
      updateBottomNav(nav, hash)
      revealScreen(screen)
    })
    return
  }

  if (route.name === 'home') renderHome(screen)
  else if (route.name === 'games') renderGames(screen)
  else if (route.name === 'game') renderGameDetail(screen, route.param!)
  else if (route.name === 'history') renderHistory(screen)
  else if (route.name === 'profile') renderProfile(screen)
  else if (route.name === 'topup') renderTopUp(screen)

  updateBottomNav(nav, hash)
  revealScreen(screen)
}

window.addEventListener('hashchange', render)
render()

// Kirish animatsiyasi — o'rtacha loader vaqti (2s) davomida ko'rsatiladi, keyin so'nib
// ilova ekraniga o'tadi. index.html'da darhol (JS yuklanishini kutmasdan) ko'rinadi.
const SPLASH_DURATION_MS = 2000
setTimeout(() => {
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.classList.add('splash-hidden')
  setTimeout(() => splash.remove(), 450)
}, SPLASH_DURATION_MS)
