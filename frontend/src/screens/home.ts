import { asset } from '../assets'
import { GAMES, somHtml, getState, setBalance, setIdentity, t } from '../store'
import { openPromoCodeSheet } from '../components/promoCode'
import { mountBanners } from '../components/banners'
import { showToast } from '../components/sheet'
import { gameArtHtml, iconHtml } from '../icons'
import { getMe, getGames, getSettings, type GameDto } from '../api'
import { openTelegramLink } from '../telegram'

type Tile = { id: string; name: string; category: string; gradient: string; icon?: string | null }

export function gameTileHtml(g: Tile): string {
  return `
        <div class="game-tile" data-game="${g.id}">
          <div class="game-tile-art" style="background:${g.gradient}">
            ${gameArtHtml(g)}
          </div>
          <div class="game-tile-name">${g.name}</div>
        </div>`
}

export function renderHome(root: HTMLElement) {
  const state = getState()
  root.innerHTML = `
    <div class="topbar">
      <div class="avatar" id="home-avatar">${state.username.slice(0, 1).toUpperCase()}</div>
      <div class="greeting">
        <span>${t('greeting')} 👋</span>
        <b id="home-name">${state.username}</b>
      </div>
      <img class="brand-logo" src="${asset('/images/logo.png')}" alt="UZDI" />
    </div>

    <div class="balance-card">
      <div class="balance-icon">${iconHtml('wallet', '', 22)}</div>
      <div class="balance-info">
        <div class="balance-label">${t('balanceLabel')}</div>
        <div class="balance-amount">${somHtml(state.balance)}</div>
      </div>
      <button class="btn btn-accent" id="act-topup">${iconHtml('plus', '', 14)} ${t('topUp')}</button>
    </div>

    <div class="quick-row">
      <button class="quick-btn" id="act-promo">${iconHtml('ticket', '', 16)} ${t('promoCodesBtn')}</button>
      <button class="quick-btn" id="act-help">${iconHtml('headset', '', 16)} ${t('help')}</button>
    </div>

    <div class="banner-carousel" id="banners"></div>

    <div class="section-head">
      <h2>${t('popularGames')}</h2>
      <button class="link-btn" id="see-all">${t('seeAllShort')}</button>
    </div>
    <div class="game-grid" id="game-grid">
      ${GAMES.map(gameTileHtml).join('')}
    </div>
  `

  root.querySelector('#act-topup')!.addEventListener('click', () => (location.hash = '#/topup'))
  root.querySelector('#act-promo')!.addEventListener('click', () => openPromoCodeSheet())
  root.querySelector('#see-all')!.addEventListener('click', () => (location.hash = '#/games'))

  let supportUsername: string | null = null
  root.querySelector('#act-help')!.addEventListener('click', () => {
    if (supportUsername) openTelegramLink(supportUsername)
    else showToast(t('supportSoon'))
  })
  getSettings()
    .then((s) => (supportUsername = s.supportUsername))
    .catch(() => {})

  mountBanners(root.querySelector<HTMLElement>('#banners')!)

  function attachTiles() {
    root.querySelectorAll<HTMLElement>('[data-game]').forEach((tile) => {
      tile.addEventListener('click', () => (location.hash = `#/game/${tile.dataset.game}`))
    })
  }
  attachTiles()

  // Haqiqiy katalog backenddan — kelguncha lokal (demo) ro'yxat ko'rinib turadi.
  getGames()
    .then((games: GameDto[]) => {
      const grid = root.querySelector('#game-grid')
      if (!grid || games.length === 0) return
      grid.innerHTML = games.map(gameTileHtml).join('')
      attachTiles()
    })
    .catch(() => {
      /* backend ishlamasa lokal demo ro'yxat bilan qolaveradi */
    })

  // Haqiqiy balans backenddan — kelguncha lokal (eski) qiymat ko'rinib turadi.
  getMe()
    .then((me) => {
      const amountEl = root.querySelector('.balance-amount')
      if (amountEl) amountEl.innerHTML = somHtml(me.balance)
      setBalance(me.balance, me.cashback)

      const displayName = me.firstName || me.username || t('defaultUsername')
      const handle = me.username ? `@${me.username}` : ''
      setIdentity({ username: displayName, handle, userId: me.telegramId })
      const nameEl = root.querySelector('#home-name')
      const avatarEl = root.querySelector('#home-avatar')
      if (nameEl) nameEl.textContent = displayName
      if (avatarEl) avatarEl.textContent = displayName.slice(0, 1).toUpperCase()
    })
    .catch(() => {
      /* Telegram tashqarisida (oddiy brauzer) initData yo'q — lokal qiymat bilan qolaveradi */
    })
}
