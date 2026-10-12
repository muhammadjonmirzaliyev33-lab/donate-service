import { useEffect, useState } from 'react'
import { getPaymentHistory, undoPayment, type PaymentDto } from '../lib/api'
import { formatSom, formatDate } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorState, Loading } from '../components/Status'
import { OrderDetailModal } from '../components/OrderDetailModal'

const KIND_LABEL: Record<PaymentDto['kind'], string> = { purchase: 'Xarid', topup: "Hisob to'ldirish" }

function statusTag(p: PaymentDto): { text: string; className: string } {
  if (p.status === 'expired') return { text: "Muddati o'tgan", className: 'badge-neutral' }
  if (p.status === 'completed') return { text: 'Tasdiqlangan', className: 'badge-success' }
  return { text: 'Rad etilgan', className: 'badge-danger' }
}

export function HistoryPage() {
  const [items, setItems] = useState<PaymentDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PaymentDto | null>(null)
  const toast = useToast()

  async function load() {
    try {
      setItems(await getPaymentHistory())
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function undo(id: string) {
    if (!confirm("Qayta ko'rib chiqishga qaytarilsinmi? Balans, keshbek va zaxiraga qo'shilgan narsalar orqaga qaytariladi.")) return
    setBusyId(id)
    try {
      await undoPayment(id)
      setDetail(null)
      await load()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <ErrorState error={error} />
  if (!items) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>Tarix</h1>
      </div>
      {items.length === 0 ? (
        <EmptyState text="Hali buyurtma yo'q" />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Buyurtma</th>
              <th>Foydalanuvchi</th>
              <th>Nima</th>
              <th>Holat</th>
              <th>Vaqt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const who = p.username ? `@${p.username}` : p.firstName || p.userTelegramId
              const what = p.kind === 'topup' ? KIND_LABEL.topup : [p.gameName || p.gameId, p.packageLabel].filter(Boolean).join(' · ')
              const tag = statusTag(p)
              const canUndo = p.status === 'completed' || p.status === 'cancelled'
              return (
                <tr key={p.id} className="clickable-row" onClick={() => setDetail(p)}>
                  <td>
                    <b>#{p.orderNo}</b>
                    <div className="cell-sub">{formatSom(p.amount)}</div>
                  </td>
                  <td>{who}</td>
                  <td>{what}</td>
                  <td>
                    <span className={`badge ${tag.className}`}>{tag.text}</span>
                    {p.decidedBySms && <span className="badge badge-neutral">🤖 auto</span>}
                    {p.supplierStatus === 'failed' && <span className="badge badge-danger">⚠️ Yetkazilmadi</span>}
                    {p.rejectReason && <div className="cell-sub danger-text">{p.rejectReason}</div>}
                  </td>
                  <td>{formatDate(p.decidedAt)}</td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    {!canUndo ? null : (
                      <button className="btn btn-soft btn-sm" disabled={busyId === p.id} onClick={() => undo(p.id)}>
                        O'zgartirish
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
      {detail && (
        <OrderDetailModal
          payment={detail}
          onClose={() => setDetail(null)}
          onUndo={detail.status === 'completed' || detail.status === 'cancelled' ? () => undo(detail.id) : undefined}
        />
      )}
    </div>
  )
}
