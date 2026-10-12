import { escapeHtml } from '../../escape'
import { formatSom } from '../../store'
import { iconHtml } from '../../icons'
import { approvePayment, getPendingPayments, rejectPayment, type PaymentDto } from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'
import { openAdminOrderDetail } from '../../admin/orderDetail'

const KIND_LABEL: Record<PaymentDto['kind'], string> = {
  purchase: 'Xarid',
  topup: "Hisob to'ldirish"
}

const METHOD_LABEL: Record<PaymentDto['method'], string> = {
  card: 'Karta',
  atm: 'Bankomat',
  foreign: 'Chet eldan',
  balance: 'Balansdan'
}

export function renderAdminQueue(root: HTMLElement) {
  root.innerHTML = adminShellHtml('queue', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const pending = await getPendingPayments()
    body.innerHTML = listHtml(pending)
    attachActions(root, pending)
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function listHtml(pending: PaymentDto[]): string {
  if (pending.length === 0) {
    return `<div class="empty-state"><div class="icon">${iconHtml('check')}</div><h3>Navbat bo'sh</h3><p>Hozircha kutilayotgan to'lov yo'q</p></div>`
  }
  return `
    <div class="list-card" style="margin-top:14px">
      ${pending
        .map((p) => {
          const info = p.playerInfo
            ? Object.entries(p.playerInfo)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')
            : ''
          const who = p.username ? `@${p.username}` : p.firstName || p.userTelegramId
          const what = p.kind === 'topup' ? KIND_LABEL[p.kind] : p.gameName || p.gameId
          const sub = escapeHtml([who, what, p.packageLabel, METHOD_LABEL[p.method], info].filter(Boolean).join(' · '))
          const thumb = p.receiptUrl
            ? `<a href="${escapeHtml(p.receiptUrl)}" target="_blank" rel="noopener" class="list-row-icon" style="background:var(--card-2) center/cover url('${escapeHtml(p.receiptUrl)}')"></a>`
            : `<div class="list-row-icon" style="background:var(--card-2)">${iconHtml(p.kind === 'topup' ? 'zap' : 'gamepad')}</div>`
          return `
            <div class="order-row" data-order="${p.id}">
              ${thumb}
              <div class="list-row-text">
                <div class="list-row-title">#${p.orderNo} · ${formatSom(p.amount)}</div>
                <div class="list-row-sub">${sub}</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-accent" style="padding:8px 10px" data-approve="${p.id}">${iconHtml('check')}</button>
                <button class="btn btn-soft" style="padding:8px 10px" data-reject="${p.id}">${iconHtml('x')}</button>
              </div>
            </div>
          `
        })
        .join('')}
    </div>
  `
}

function attachActions(root: HTMLElement, pending: PaymentDto[]) {
  root.querySelectorAll<HTMLElement>('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      decide(root, btn.dataset.approve!, 'approve')
    })
  })
  root.querySelectorAll<HTMLElement>('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      decide(root, btn.dataset.reject!, 'reject')
    })
  })
  root.querySelectorAll<HTMLElement>('[data-order]').forEach((rowEl) => {
    rowEl.addEventListener('click', () => {
      const payment = pending.find((p) => p.id === rowEl.dataset.order)
      if (!payment) return
      openAdminOrderDetail(payment, {
        onApprove: () => decide(root, payment.id, 'approve'),
        onReject: () => decide(root, payment.id, 'reject')
      })
    })
  })
}

async function decide(root: HTMLElement, paymentId: string, outcome: 'approve' | 'reject') {
  const buttons = root.querySelectorAll<HTMLButtonElement>(`[data-approve="${paymentId}"], [data-reject="${paymentId}"]`)
  buttons.forEach((b) => (b.disabled = true))
  try {
    if (outcome === 'approve') await approvePayment(paymentId)
    else await rejectPayment(paymentId)
    await load(root)
  } catch (err) {
    buttons.forEach((b) => (b.disabled = false))
    alert(err instanceof Error ? err.message : "Noma'lum xatolik")
  }
}
