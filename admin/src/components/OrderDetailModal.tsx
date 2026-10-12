import type { PaymentDto } from '../lib/api'
import { formatSom, formatDate } from '../lib/format'
import { Modal } from './Modal'

const KIND_LABEL: Record<PaymentDto['kind'], string> = { purchase: 'Xarid', topup: "Hisob to'ldirish" }
const METHOD_LABEL: Record<PaymentDto['method'], string> = { card: 'Karta', atm: 'Bankomat', foreign: 'Chet eldan', balance: 'Balansdan' }
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

export function OrderDetailModal({
  payment: p,
  onClose,
  onApprove,
  onReject,
  onUndo
}: {
  payment: PaymentDto
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
  onUndo?: () => void
}) {
  const who = p.username ? `@${p.username}` : p.firstName || p.userTelegramId
  const what = p.kind === 'topup' ? KIND_LABEL.topup : p.gameName || p.gameId || ''

  return (
    <Modal title={`Buyurtma #${p.orderNo}`} onClose={onClose}>
      <p className="modal-sub">
        {what}
        {p.packageLabel ? ` · ${p.packageLabel}` : ''}
      </p>

      {p.receiptUrl ? (
        <a href={p.receiptUrl} target="_blank" rel="noopener">
          <img src={p.receiptUrl} alt="Chek" className="receipt-preview" />
        </a>
      ) : (
        <div className="hint-box">Chek/screenshot yuklanmagan (balansdan to'lov)</div>
      )}

      <dl className="detail-list">
        <Row label="Holat" value={STATUS_LABEL[p.status]} />
        <Row label="Summa" value={formatSom(p.amount)} />
        {p.matchAmount && <Row label="O'tkazish so'ralgan summa" value={formatSom(p.matchAmount)} />}
        <Row label="Usul" value={METHOD_LABEL[p.method]} />
        <Row label="Foydalanuvchi" value={who} />
        {p.playerInfo && Object.entries(p.playerInfo).map(([k, v]) => <Row key={k} label={k} value={v} />)}
        <Row label="Yaratildi" value={formatDate(p.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
        {p.status !== 'pending_review' && (
          <Row label="Hal qilindi" value={formatDate(p.decidedAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
        )}
        {(p.status === 'completed' || p.status === 'cancelled') && (
          <Row label="Kim tasdiqladi" value={p.decidedBySms ? '🤖 Avtomatik (SMS/notification)' : "Admin (qo'lda)"} />
        )}
        {p.rejectReason && <Row label="Sabab" value={p.rejectReason} danger />}
        {p.supplierStatus && <Row label="Avtomatik yetkazish" value={SUPPLIER_STATUS_LABEL[p.supplierStatus]} danger={p.supplierStatus === 'failed'} />}
        {p.supplierStatus === 'failed' && p.supplierError && <Row label="PayCore xatosi" value={p.supplierError} danger />}
      </dl>

      <div className="modal-actions">
        {onApprove && (
          <button className="btn btn-accent btn-block" onClick={onApprove}>
            Tasdiqlash
          </button>
        )}
        {onReject && (
          <button className="btn btn-soft btn-block danger-text" onClick={onReject}>
            Rad etish
          </button>
        )}
        {onUndo && (
          <button className="btn btn-soft btn-block" onClick={onUndo}>
            O'zgartirish
          </button>
        )}
      </div>
    </Modal>
  )
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`detail-row ${danger ? 'danger-text' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
