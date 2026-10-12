import { escapeHtml } from '../escape'
import { formatSom } from '../store'
import { iconHtml } from '../icons'
import { openSheet, closeSheet } from '../components/sheet'
import type { PaymentDto } from './api'

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

const STATUS_LABEL: Record<PaymentDto['status'], string> = {
  pending_review: 'Kutilmoqda',
  completed: 'Tasdiqlangan',
  cancelled: 'Rad etilgan',
  expired: 'Muddati tugagan'
}

const SUPPLIER_STATUS_LABEL: Record<NonNullable<PaymentDto['supplierStatus']>, string> = {
  processing: '⏳ PayCore: kutilmoqda',
  completed: '✅ PayCore: yetkazildi',
  failed: '❌ PayCore: yetkazilmadi'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function row(title: string, sub: string, danger = false): string {
  return `
    <div class="list-row">
      <div class="list-row-text">
        <div class="list-row-title" ${danger ? 'style="color:var(--danger)"' : ''}>${escapeHtml(title)}</div>
        <div class="list-row-sub" ${danger ? 'style="color:var(--danger)"' : ''}>${escapeHtml(sub)}</div>
      </div>
    </div>
  `
}

/** Navbat va tarix ekranlarida karta bosilganda — buyurtmaning TO'LIQ ma'lumotini (rasm, vaqt, playerId va h.k.) bitta joyda ko'rsatadi. */
export function openAdminOrderDetail(
  p: PaymentDto,
  actions: { onApprove?: () => void; onReject?: () => void; onUndo?: () => void } = {}
) {
  const who = p.username ? `@${p.username}` : p.firstName || p.userTelegramId
  const what = p.kind === 'topup' ? KIND_LABEL.topup : p.gameName || p.gameId || ''

  const playerRows = p.playerInfo ? Object.entries(p.playerInfo).map(([k, v]) => row(k, v)).join('') : ''

  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('receipt')} Buyurtma #${p.orderNo}</div>
    <div class="sheet-sub">${escapeHtml(what + (p.packageLabel ? ' · ' + p.packageLabel : ''))}</div>

    ${
      p.receiptUrl
        ? `<a href="${escapeHtml(p.receiptUrl)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(p.receiptUrl)}" alt="Chek" style="width:100%;border-radius:14px;margin:14px 0;display:block;object-fit:cover;max-height:320px" />
          </a>`
        : `<div class="hint-box" style="margin:14px 0">Chek/screenshot yuklanmagan (balansdan to'lov)</div>`
    }

    <div class="list-card">
      ${row('Holat', STATUS_LABEL[p.status])}
      ${row('Summa', formatSom(p.amount))}
      ${p.matchAmount ? row("O'tkazish so'ralgan summa", formatSom(p.matchAmount)) : ''}
      ${row('Usul', METHOD_LABEL[p.method])}
      ${row('Foydalanuvchi', who)}
      ${playerRows}
      ${row('Yaratildi', formatDate(p.createdAt))}
      ${p.status !== 'pending_review' ? row('Hal qilindi', formatDate(p.decidedAt)) : ''}
      ${p.status === 'completed' || p.status === 'cancelled' ? row('Kim tasdiqladi', p.decidedBySms ? "🤖 SMS orqali avtomatik" : 'Admin (qo\'lda)') : ''}
      ${p.rejectReason ? row('Sabab', p.rejectReason, true) : ''}
      ${p.supplierStatus ? row('Avtomatik yetkazish', SUPPLIER_STATUS_LABEL[p.supplierStatus], p.supplierStatus === 'failed') : ''}
      ${p.supplierStatus === 'failed' && p.supplierError ? row('PayCore xatosi', p.supplierError, true) : ''}
    </div>

    <div class="sheet-actions">
      ${actions.onApprove ? `<button class="btn btn-accent btn-block" id="detail-approve">${iconHtml('check')} Tasdiqlash</button>` : ''}
      ${actions.onReject ? `<button class="btn btn-soft btn-block" id="detail-reject" style="color:var(--danger)">${iconHtml('x')} Rad etish</button>` : ''}
      ${actions.onUndo ? `<button class="btn btn-soft btn-block" id="detail-undo">${iconHtml('circleOff')} O'zgartirish</button>` : ''}
      <button class="btn btn-soft btn-block" id="close-sheet">Yopish</button>
    </div>
  `

  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)
  overlay.querySelector('#detail-approve')?.addEventListener('click', () => {
    closeSheet()
    actions.onApprove!()
  })
  overlay.querySelector('#detail-reject')?.addEventListener('click', () => {
    closeSheet()
    actions.onReject!()
  })
  overlay.querySelector('#detail-undo')?.addEventListener('click', () => {
    closeSheet()
    actions.onUndo!()
  })
}
