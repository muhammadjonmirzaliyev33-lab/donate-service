import { useEffect, useState } from 'react'
import { depositStock, getStockBalances, getStockMovements, type GameStockDto, type StockMovementDto } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { EmptyState, ErrorState, Loading } from '../components/Status'

const MOVEMENT_LABEL: Record<StockMovementDto['kind'], string> = { deposit: 'Kirim', sale: 'Sotildi', adjustment: 'Tuzatish' }

export function StockPage() {
  const [balances, setBalances] = useState<GameStockDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [depositGameId, setDepositGameId] = useState<string | null>(null)
  const [historyGameId, setHistoryGameId] = useState<string | null>(null)

  function load() {
    getStockBalances().then(setBalances).catch(setError)
  }

  useEffect(load, [])

  if (error) return <ErrorState error={error} />
  if (!balances) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>O'yin zaxiralari</h1>
      </div>
      {balances.length === 0 ? (
        <EmptyState text="Hali o'yin qo'shilmagan" />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>O'yin</th>
              <th>Qoldiq</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.gameId} className="clickable-row" onClick={() => setHistoryGameId(b.gameId)}>
                <td>{b.gameId}</td>
                <td>
                  <span className={`badge ${b.balance <= 0 ? 'badge-danger' : 'badge-neutral'}`}>{b.balance}</span>
                </td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-soft btn-sm" onClick={() => setDepositGameId(b.gameId)}>
                    + Kirim
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {depositGameId && (
        <DepositModal
          gameId={depositGameId}
          onClose={() => setDepositGameId(null)}
          onSaved={() => {
            setDepositGameId(null)
            load()
          }}
        />
      )}
      {historyGameId && <HistoryModal gameId={historyGameId} onClose={() => setHistoryGameId(null)} />}
    </div>
  )
}

function DepositModal({ gameId, onClose, onSaved }: { gameId: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const toast = useToast()

  async function save() {
    const n = Number(amount)
    if (!n || n <= 0) {
      toast("To'g'ri miqdor kiriting")
      return
    }
    try {
      await depositStock(gameId, n, note.trim() || undefined)
      toast('Zaxira toldirildi')
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <Modal title={`Zaxira kirim — ${gameId}`} onClose={onClose}>
      <label className="field-label">Miqdor (dona)</label>
      <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
      <label className="field-label">Izoh (ixtiyoriy)</label>
      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="1 000 000 so'mga olindi" />
      <div className="modal-actions">
        <button className="btn btn-accent btn-block" onClick={save}>
          Saqlash
        </button>
      </div>
    </Modal>
  )
}

function HistoryModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [movements, setMovements] = useState<StockMovementDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    getStockMovements(gameId, 30).then(setMovements).catch(setError)
  }, [gameId])

  return (
    <Modal title={`Tarix — ${gameId}`} onClose={onClose}>
      {error ? (
        <ErrorState error={error} />
      ) : !movements ? (
        <Loading />
      ) : movements.length === 0 ? (
        <EmptyState text="Hali harakat yo'q" />
      ) : (
        <div className="movement-list">
          {movements.map((m) => (
            <div key={m.id} className="movement-row">
              <span>
                {MOVEMENT_LABEL[m.kind]}
                {m.note ? ` · ${m.note}` : ''}
              </span>
              <b className={m.amount >= 0 ? 'success-text' : 'danger-text'}>
                {m.amount >= 0 ? '+' : ''}
                {m.amount}
              </b>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
