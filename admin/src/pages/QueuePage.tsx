import { useEffect, useState } from 'react'
import { approvePayment, getPendingPayments, rejectPayment, type PaymentDto } from '../lib/api'
import { formatSom } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorState, Loading } from '../components/Status'
import { OrderDetailModal } from '../components/OrderDetailModal'

const KIND_LABEL: Record<PaymentDto['kind'], string> = { purchase: 'Xarid', topup: "Hisob to'ldirish" }
const METHOD_LABEL: Record<PaymentDto['method'], string> = { card: 'Karta', atm: 'Bankomat', foreign: 'Chet eldan', balance: 'Balansdan' }

export function QueuePage() {
  const [items, setItems] = useState<PaymentDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PaymentDto | null>(null)
  const toast = useToast()

  async function load() {
    try {
      setItems(await getPendingPayments())
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function decide(id: string, outcome: 'approve' | 'reject') {
    setBusyId(id)
    try {
      if (outcome === 'approve') await approvePayment(id)
      else await rejectPayment(id)
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
        <h1>Navbat</h1>
      </div>
      {items.length === 0 ? (
        <EmptyState text="Navbat bo'sh — hozircha kutilayotgan to'lov yo'q" />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Buyurtma</th>
              <th>Foydalanuvchi</th>
              <th>Nima</th>
              <th>Usul</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const who = p.username ? `@${p.username}` : p.firstName || p.userTelegramId
              const what = p.kind === 'topup' ? KIND_LABEL.topup : [p.gameName || p.gameId, p.packageLabel].filter(Boolean).join(' · ')
              return (
                <tr key={p.id} className="clickable-row" onClick={() => setDetail(p)}>
                  <td>
                    <b>#{p.orderNo}</b>
                    <div className="cell-sub">{formatSom(p.amount)}</div>
                  </td>
                  <td>{who}</td>
                  <td>{what}</td>
                  <td>{METHOD_LABEL[p.method]}</td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-accent btn-sm" disabled={busyId === p.id} onClick={() => decide(p.id, 'approve')}>
                      Tasdiqlash
                    </button>
                    <button className="btn btn-soft btn-sm" disabled={busyId === p.id} onClick={() => decide(p.id, 'reject')}>
                      Rad etish
                    </button>
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
          onApprove={() => decide(detail.id, 'approve')}
          onReject={() => decide(detail.id, 'reject')}
        />
      )}
    </div>
  )
}
