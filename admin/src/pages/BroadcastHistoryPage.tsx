import { useEffect, useState } from 'react'
import { getBroadcastHistory, type BroadcastMessageDto } from '../lib/api'
import { formatDate } from '../lib/format'
import { EmptyState, ErrorState, Loading } from '../components/Status'

const STATUS_LABEL: Record<BroadcastMessageDto['status'], string> = {
  sending: 'Yuborilmoqda…',
  sent: 'Yuborildi',
  failed: 'Muvaffaqiyatsiz'
}

const STATUS_BADGE: Record<BroadcastMessageDto['status'], string> = {
  sending: 'badge-neutral',
  sent: 'badge-success',
  failed: 'badge-danger'
}

export function BroadcastHistoryPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<BroadcastMessageDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    getBroadcastHistory().then(setItems).catch(setError)
  }, [])

  if (error) return <ErrorState error={error} />
  if (!items) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>Xabarlar tarixi</h1>
        <button className="btn btn-ghost" onClick={onBack}>
          ← Xabar yuborish
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState text="Hali xabar yuborilmagan" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Xabar</th>
                <th>Rasmlar</th>
                <th>Holat</th>
                <th>Yuborildi</th>
                <th>Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>{m.message}</td>
                  <td>
                    {m.imageUrls.length > 0 ? (
                      <a href={m.imageUrls[0]} target="_blank" rel="noopener">
                        {m.imageUrls.length} ta
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                  </td>
                  <td>
                    {m.sentCount}/{m.totalRecipients}
                    {m.failedCount > 0 && <div className="cell-sub danger-text">{m.failedCount} xato</div>}
                  </td>
                  <td>
                    {formatDate(m.createdAt)}
                    {m.createdByUsername && <div className="cell-sub">@{m.createdByUsername}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
