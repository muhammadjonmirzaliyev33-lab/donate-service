import { somHtml, getState, setBalance, t } from '../store'
import { openTopUpSheet } from '../components/paymentFlow'
import { showToast } from '../components/sheet'
import { iconHtml } from '../icons'
import { getMe, getSettings } from '../api'
import { openTelegramLink } from '../telegram'

const METHODS = [
  { id: 'card', name: 'UZCARD', sub: 'methodUzcardSub', mark: 'U' },
  { id: 'card', name: 'HUMO', sub: 'methodUzcardSub', mark: 'H' },
  { id: 'atm', name: 'BANKOMAT', sub: 'methodAtmSub', mark: 'ATM' },
  { id: 'foreign', name: 'INTERNATIONAL', sub: 'payMethodForeignSub', mark: 'VISA' }
] as const

export function renderTopUp(root: HTMLElement) {
  const state = getState()
  root.innerHTML = `
    <div class="page-title">${t('topUpScreenTitle')}</div>

    <div class="balance-card big">
      <div class="balance-info">
        <div class="balance-label">${t('balanceLabel')}</div>
        <div class="balance-amount">${somHtml(state.balance)}</div>
      </div>
    </div>

    <div class="sub-head">${t('paymentMethodTitle')}</div>
    <div class="method-grid">
      ${METHODS.map(
        (m, i) => `
        <div class="method-card" data-i="${i}">
          <div class="method-mark m-${m.id}">${m.mark}</div>
          <div class="method-text">
            <b>${m.name}</b>
            <span>${t(m.sub)}</span>
          </div>
        </div>`
      ).join('')}
    </div>
    <div class="method-note"><span>${t('minTopUpNote')}</span></div>

    <div class="sub-head caps">${t('guidesHeader')}</div>
    <div class="guide-list">
      <div class="guide-row" id="guide">
        <div class="guide-icon">${iconHtml('play', '', 18)}</div>
        <div class="guide-text">
          <b>${t('howToTopUp')}</b>
          <span>${t('videoGuideSub')}</span>
        </div>
        ${iconHtml('chevronRight', 'guide-chevron', 16)}
      </div>
    </div>
  `

  root.querySelectorAll<HTMLElement>('[data-i]').forEach((el) => {
    el.addEventListener('click', () => openTopUpSheet(METHODS[Number(el.dataset.i)].id))
  })

  let supportUsername: string | null = null
  root.querySelector('#guide')!.addEventListener('click', () => {
    if (supportUsername) openTelegramLink(supportUsername)
    else showToast(t('supportSoon'))
  })
  getSettings()
    .then((s) => (supportUsername = s.channelUrl || s.supportUsername))
    .catch(() => {})

  getMe()
    .then((me) => {
      const el = root.querySelector('.balance-amount')
      if (el) el.innerHTML = somHtml(me.balance)
      setBalance(me.balance, me.cashback)
    })
    .catch(() => {})
}
