import { currentLocale, t } from '../store'
import { iconHtml } from '../icons'
import { getMyPayments, type PaymentDto } from '../api'
import { formatSom } from '../store'

type Tab = 'orders' | 'tx'

const STATUS_LABEL_KEY: Record<PaymentDto['status'], 'completedTab' | 'pendingTab' | 'cancelledTab' | 'expiredStatus'> = {
  completed: 'completedTab',
  pending_review: 'pendingTab',
  cancelled: 'cancelledTab',
  expired: 'expiredStatus'
}

const STATUS_CLASS: Record<PaymentDto['status'], string> = {
  completed: 'completed',
  pending_review: 'pending',
  cancelled: 'cancelled',
  expired: 'cancelled'
}

const METHOD_LABEL_KEY: Record<string, 'methodBalance' | 'methodCard' | 'methodAtm' | 'methodForeign'> = {
  balance: 'methodBalance',
  card: 'methodCard',
  atm: 'methodAtm',
  foreign: 'methodForeign'
}

export function renderHistory(root: HTMLElement) {
  let tab: Tab = 'orders'
  let payments: PaymentDto[] = []
  let loading = true

  function methodLabel(m: string) {
    const key = METHOD_LABEL_KEY[m]
    return key ? t(key) : m
  }

  function items() {
    return payments.filter((p) => (tab === 'orders' ? p.kind === 'purchase' : p.kind === 'topup'))
  }

  function html(): string {
    const list = items()
    return `
      <div class="page-title">${t('ordersTitle')}</div>
      <div class="seg-tabs">
        ${(['orders', 'tx'] as Tab[])
        .map((tb) => `<button class="seg-tab ${tb === tab ? 'active' : ''}" data-tab="${tb}">${t(tb === 'orders' ? 'ordersTabOrders' : 'ordersTabTx')}</button>`)
        .join('')}
      </div>
      ${loading
        ? `<div class="empty-state"><p>${t('loadingText')}</p></div>`
        : list.length === 0
          ? `<div class="empty-state">
              <div class="icon">${iconHtml('history', '', 30)}</div>
              <h3>${t(tab === 'orders' ? 'noOrdersTitle' : 'noTxTitle')}</h3>
              <p>${t(tab === 'orders' ? 'noOrdersSub' : 'noTxSub')}</p>
            </div>`
          : `<div class="list-card">
              ${list
            .map((p) => {
              const title = p.kind === 'topup' ? t('topUpOrderTitle') : [p.gameName, p.packageLabel].filter(Boolean).join(' · ')
              const sub = `${new Date(p.createdAt).toLocaleString(currentLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${methodLabel(p.method)}`
              return `
                <div class="order-row">
                  <div class="list-row-icon" style="background:var(--card-2)">${iconHtml(p.kind === 'topup' ? 'zap' : 'gamepad')}</div>
                  <div class="list-row-text">
                    <div class="list-row-title">${title}</div>
                    <div class="list-row-sub">${sub}</div>
                    ${p.status === 'cancelled' && p.rejectReason ? `<div class="list-row-sub" style="color:var(--danger)">${t('rejectReasonLabel')}: ${p.rejectReason}</div>` : ''}
                  </div>
                  <div style="text-align:right">
                    <div style="font-weight:800;font-size:13.5px;margin-bottom:4px">${formatSom(p.amount)}</div>
                    <span class="status-badge ${STATUS_CLASS[p.status]}">${t(STATUS_LABEL_KEY[p.status])}</span>
                  </div>
                </div>`
            })
            .join('')}
            </div>`
      }
    `
  }

  function mount() {
    root.innerHTML = html()
    root.querySelectorAll<HTMLElement>('[data-tab]').forEach((chip) => {
      chip.addEventListener('click', () => {
        tab = chip.dataset.tab as Tab
        mount()
      })
    })
  }

  mount()

  getMyPayments()
    .then((rows) => {
      payments = rows
      loading = false
      mount()
    })
    .catch(() => {
      loading = false
      mount()
    })
}
