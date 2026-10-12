import { escapeHtml } from '../../escape'
import { formatSom } from '../../store'
import { iconHtml } from '../../icons'
import { getPaymentHistory, undoPayment, type PaymentDto } from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'
import { openAdminOrderDetail } from '../../admin/orderDetail'
import { confirmSheet, showToast } from '../../components/sheet'

const KIND_LABEL: Record<PaymentDto['kind'], string> = {
  purchase: 'Xarid',
  topup: "Hisob to'ldirish"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function renderAdminHistory(root: HTMLElement) {
  root.innerHTML = adminShellHtml('history', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const decided = await getPaymentHistory()
    body.innerHTML = listHtml(decided)
    attachActions(root, decided)
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function listHtml(decided: PaymentDto[]): string {
  if (decided.length === 0) {
    return `<div class="empty-state"><div class="icon">${iconHtml('package')}</div><h3>Hali buyurtma yo'q</h3><p>Hal qilingan to'lovlar shu yerda ko'rinadi</p></div>`
  }
  return `
    <div class="list-card" style="margin-top:14px">
      ${decided
        .map((p) => {
          const who = p.username ? `@${p.username}` : p.firstName || p.userTelegramId
          const what = p.kind === 'topup' ? KIND_LABEL[p.kind] : p.gameName || p.gameId
          const approved = p.status === 'completed'
          const expired = p.status === 'expired'
          const sub = escapeHtml([who, what, p.packageLabel, formatDate(p.decidedAt)].filter(Boolean).join(' · '))
          const statusTag = expired
            ? '<span style="color:var(--text-faint)">(muddati o\'tgan)</span>'
            : approved
              ? ''
              : '<span style="color:var(--danger)">(rad etilgan)</span>'
          const thumb = p.receiptUrl
            ? `<a href="${p.receiptUrl}" target="_blank" rel="noopener" class="list-row-icon" style="background:var(--card-2) center/cover url('${p.receiptUrl}')"></a>`
            : `<div class="list-row-icon" style="background:${expired ? 'rgba(255,255,255,.06)' : approved ? 'rgba(127,217,58,.16)' : 'rgba(255,92,122,.16)'}">${iconHtml(expired ? 'clock' : approved ? 'check' : 'x')}</div>`
          return `
            <div class="order-row" data-order="${p.id}">
              ${thumb}
              <div class="list-row-text">
                <div class="list-row-title">#${p.orderNo} · ${formatSom(p.amount)} ${p.decidedBySms ? '<span style="color:var(--accent)">🤖 SMS</span>' : ''} ${p.supplierStatus === 'failed' ? '<span style="color:var(--danger)">⚠️ Yetkazilmadi</span>' : ''} ${statusTag}</div>
                <div class="list-row-sub">${sub}</div>
                ${p.rejectReason ? `<div class="list-row-sub" style="color:var(--danger)">Sabab: ${escapeHtml(p.rejectReason)}</div>` : ''}
              </div>
              ${expired ? '' : `<button class="btn btn-soft" style="padding:8px 10px" data-undo="${p.id}" title="O'zgartirish">${iconHtml('circleOff')}</button>`}
            </div>
          `
        })
        .join('')}
    </div>
  `
}

function attachActions(root: HTMLElement, decided: PaymentDto[]) {
  root.querySelectorAll<HTMLElement>('[data-undo]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      undo(root, btn.dataset.undo!)
    })
  })
  root.querySelectorAll<HTMLElement>('[data-order]').forEach((rowEl) => {
    rowEl.addEventListener('click', () => {
      const payment = decided.find((p) => p.id === rowEl.dataset.order)
      if (!payment) return
      const canUndo = payment.status === 'completed' || payment.status === 'cancelled'
      openAdminOrderDetail(payment, canUndo ? { onUndo: () => undo(root, payment.id) } : {})
    })
  })
}

async function undo(root: HTMLElement, paymentId: string) {
  const ok = await confirmSheet({
    title: "Qayta ko'rib chiqishga qaytarilsinmi?",
    message: "Balans, keshbek va zaxiraga qo'shilgan narsalar orqaga qaytariladi.",
    confirmLabel: 'Qaytarish',
    danger: true
  })
  if (!ok) return
  const btn = root.querySelector<HTMLButtonElement>(`[data-undo="${paymentId}"]`)
  if (btn) btn.disabled = true
  try {
    await undoPayment(paymentId)
    await load(root)
  } catch (err) {
    if (btn) btn.disabled = false
    showToast(err instanceof Error ? err.message : "Noma'lum xatolik")
  }
}
