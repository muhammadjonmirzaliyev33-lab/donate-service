import { iconHtml } from '../icons'
import { t } from '../store'

type NavIcon = 'home' | 'games' | 'wallet' | 'history' | 'profile' | 'shieldCheck'
type LabelKey = 'navHomeLabel' | 'navGamesLabel' | 'navTopUpLabel' | 'navOrdersLabel' | 'navProfileLabel'

const BASE_TABS: { route: string; icon: NavIcon; labelKey: LabelKey }[] = [
  { route: '#/', icon: 'home', labelKey: 'navHomeLabel' },
  { route: '#/games', icon: 'games', labelKey: 'navGamesLabel' },
  { route: '#/topup', icon: 'wallet', labelKey: 'navTopUpLabel' },
  { route: '#/history', icon: 'history', labelKey: 'navOrdersLabel' },
  { route: '#/profile', icon: 'profile', labelKey: 'navProfileLabel' }
]

const ADMIN_TAB = { route: '#/admin', icon: 'shieldCheck' as NavIcon, label: 'Admin' }

let adminEnabled = false

function currentTabs(): { route: string; icon: NavIcon; label?: string; labelKey?: LabelKey }[] {
  return adminEnabled ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS
}

/**
 * Admin tekshiruvi (async, app yuklangandan keyin) tugagach chaqiriladi — Admin tugmasi
 * mavjud navga qo'shiladi. To'liq qayta render qilmaymiz (indicator DOM referensini
 * buzmaslik uchun), shunchaki bitta yangi tugma qo'shamiz.
 */
export function appendAdminTab(nav: HTMLElement) {
  if (adminEnabled || nav.querySelector('[data-nav="#/admin"]')) return
  adminEnabled = true
  const wrapper = document.createElement('div')
  wrapper.innerHTML = `
    <button class="nav-item ${isActive(ADMIN_TAB.route, location.hash) ? 'active' : ''}" data-nav="${ADMIN_TAB.route}">
      <span class="nav-icon">${iconHtml(ADMIN_TAB.icon)}</span>
      <span data-label>${ADMIN_TAB.label}</span>
    </button>`
  const btn = wrapper.firstElementChild as HTMLElement
  nav.appendChild(btn)
  if (btn.classList.contains('active')) moveIndicator(nav)
}

function isActive(route: string, currentHash: string) {
  return currentHash === route || (route !== '#/' && currentHash.startsWith(route))
}

export function renderBottomNav(currentHash: string): string {
  return `
    <nav class="bottom-nav">
      <div class="nav-indicator"></div>
      ${currentTabs()
        .map(
          (tab) => `
        <button class="nav-item ${isActive(tab.route, currentHash) ? 'active' : ''}" data-nav="${tab.route}">
          <span class="nav-icon">${iconHtml(tab.icon)}</span>
          <span data-label>${tab.labelKey ? t(tab.labelKey) : tab.label}</span>
        </button>`
        )
        .join('')}
    </nav>
  `
}

export function refreshBottomNavLabels(nav: HTMLElement) {
  const items = Array.from(nav.querySelectorAll<HTMLElement>('.nav-item'))
  items.forEach((btn, i) => {
    const label = btn.querySelector<HTMLElement>('[data-label]')
    const tab = currentTabs()[i]
    if (label && tab) label.textContent = tab.labelKey ? t(tab.labelKey) : tab.label || ''
  })
}

function placeIndicator(indicator: HTMLElement, target: HTMLElement, scale = 1) {
  indicator.style.width = `${target.offsetWidth}px`
  indicator.style.height = `${target.offsetHeight}px`
  indicator.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px) scale(${scale})`
}

function moveIndicator(nav: HTMLElement) {
  const active = nav.querySelector<HTMLElement>('.nav-item.active')
  const indicator = nav.querySelector<HTMLElement>('.nav-indicator')
  if (!active || !indicator) return
  placeIndicator(indicator, active)
}

export function attachBottomNav(nav: HTMLElement) {
  const indicator = nav.querySelector<HTMLElement>('.nav-indicator')!

  indicator.style.transition = 'none'
  moveIndicator(nav)
  requestAnimationFrame(() => requestAnimationFrame(() => (indicator.style.transition = '')))

  const items = () => Array.from(nav.querySelectorAll<HTMLElement>('.nav-item'))

  let pressedBtn: HTMLElement | null = null
  let pointerId: number | null = null
  let startX = 0
  let startLeft = 0
  let startTop = 0

  function nearestIndex(centerX: number) {
    const list = items()
    let best = 0
    let bestDist = Infinity
    list.forEach((it, i) => {
      const c = it.offsetLeft + it.offsetWidth / 2
      const d = Math.abs(c - centerX)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    return best
  }

  function highlightPress(target: HTMLElement) {
    items().forEach((it) => it.classList.toggle('pressing', it === target))
  }

  function clearPress() {
    items().forEach((it) => it.classList.remove('pressing'))
  }

  function reset() {
    pressedBtn = null
    pointerId = null
    clearPress()
  }

  nav.addEventListener('pointerdown', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.nav-item')
    if (!btn) return
    pressedBtn = btn
    pointerId = e.pointerId
    startX = e.clientX
    startLeft = btn.offsetLeft
    startTop = btn.offsetTop
    nav.setPointerCapture(e.pointerId)
    highlightPress(btn)

    // Jump the indicator straight to whichever tab was pressed, wherever that is.
    indicator.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), width 0.4s ease, height 0.4s ease'
    placeIndicator(indicator, btn, 1.05)
  })

  nav.addEventListener('pointermove', (e) => {
    if (!pressedBtn || e.pointerId !== pointerId) return
    const dx = e.clientX - startX
    const maxLeft = nav.clientWidth - indicator.offsetWidth
    const newLeft = Math.min(Math.max(startLeft + dx, 0), maxLeft)
    indicator.style.transition = 'none'
    indicator.style.transform = `translate(${newLeft}px, ${startTop}px) scale(1.05)`
    highlightPress(items()[nearestIndex(newLeft + indicator.offsetWidth / 2)])
  })

  function endDrag(e: PointerEvent) {
    if (!pressedBtn || e.pointerId !== pointerId) return
    const dx = e.clientX - startX
    const maxLeft = nav.clientWidth - indicator.offsetWidth
    const newLeft = Math.min(Math.max(startLeft + dx, 0), maxLeft)
    const target = items()[nearestIndex(newLeft + indicator.offsetWidth / 2)]

    indicator.style.transition = ''
    placeIndicator(indicator, target)

    if (target.dataset.nav && !target.classList.contains('active')) {
      location.hash = target.dataset.nav
    }

    reset()
  }

  nav.addEventListener('pointerup', endDrag)
  nav.addEventListener('pointercancel', () => {
    moveIndicator(nav)
    reset()
  })

  window.addEventListener('resize', () => moveIndicator(nav))
}

export function updateBottomNav(nav: HTMLElement, currentHash: string) {
  nav.querySelectorAll<HTMLElement>('.nav-item').forEach((btn) => {
    const route = btn.dataset.nav!
    btn.classList.toggle('active', isActive(route, currentHash))
  })
  moveIndicator(nav)
}
