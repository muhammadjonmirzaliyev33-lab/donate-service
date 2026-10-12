import { animate, stagger } from 'motion'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const ITEM_SELECTOR = [
  '.topbar',
  '.balance-card',
  '.profile-card',
  '.section-head',
  '.search-box',
  '.game-tile',
  '.stat-box',
  '.lang-row',
  '.list-card',
  '.list-row',
  '.order-row',
  '.empty-state',
  '.back-header',
  '.game-header',
  '.field-group',
  '.check-btn',
  '.chip-row',
  '.hint-box',
  '.pkg-card',
  '.sticky-bar'
].join(', ')

/** Fades + slides a freshly-mounted screen's content in, staggering its top-level pieces. */
export function revealScreen(root: HTMLElement) {
  const found = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
  const targets = found.length ? found : Array.from(root.children) as HTMLElement[]

  animate(
    targets,
    { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0)'] },
    { duration: 0.75, delay: stagger(0.07, { startDelay: 0.04 }), ease: EASE }
  )
}

/** Small entrance for a single element dropped into the DOM later (sheets, toasts, dynamic rows). */
export function revealElement(el: HTMLElement) {
  animate(
    el,
    { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
    { duration: 0.6, ease: EASE }
  )
}
