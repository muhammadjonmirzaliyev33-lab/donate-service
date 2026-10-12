import { useEffect, useState } from 'react'
import { createPaymentCard, deletePaymentCard, getAdminPaymentCards, updatePaymentCard, type AdminPaymentCardDto } from '../lib/api'
import { formatCardDisplay } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { EmptyState, ErrorState, Loading } from '../components/Status'

export function CardsPage() {
  const [cards, setCards] = useState<AdminPaymentCardDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState<AdminPaymentCardDto | 'new' | null>(null)

  function load() {
    getAdminPaymentCards().then(setCards).catch(setError)
  }

  useEffect(load, [])

  if (error) return <ErrorState error={error} />
  if (!cards) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>To'lov kartalari ({cards.length})</h1>
        <button className="btn btn-accent" onClick={() => setEditing('new')}>
          + Yangi
        </button>
      </div>
      {cards.length === 0 ? (
        <EmptyState text="Hali karta qo'shilmagan. Foydalanuvchi to'lov ekranida karta ko'rsatilmaydi." />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bank</th>
              <th>Karta</th>
              <th>Egasi</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="clickable-row" onClick={() => setEditing(c)}>
                <td>{c.bankName}</td>
                <td>{formatCardDisplay(c.cardNumber)}</td>
                <td>{c.holderName}</td>
                <td>{c.isActive ? <span className="badge badge-success">Faol</span> : <span className="badge badge-neutral">Nofaol</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {editing && (
        <CardFormModal
          existing={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function CardFormModal({ existing, onClose, onSaved }: { existing?: AdminPaymentCardDto; onClose: () => void; onSaved: () => void }) {
  const [bankName, setBankName] = useState(existing?.bankName ?? '')
  const [cardNumber, setCardNumber] = useState(existing ? formatCardDisplay(existing.cardNumber) : '')
  const [holderName, setHolderName] = useState(existing?.holderName ?? '')
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)
  const toast = useToast()

  async function save() {
    const digits = cardNumber.replace(/\D/g, '')
    if (!bankName.trim() || !digits || !holderName.trim()) {
      toast("Barcha maydonlarni to'ldiring")
      return
    }
    if (digits.length !== 16) {
      toast("Karta raqami 16 ta raqamdan iborat bo'lishi kerak")
      return
    }
    try {
      if (existing) await updatePaymentCard(existing.id, { bankName, cardNumber: digits, holderName, isActive })
      else await createPaymentCard({ bankName, cardNumber: digits, holderName })
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  async function remove() {
    if (!existing) return
    if (!confirm("Kartani o'chirish kerakmi?")) return
    try {
      await deletePaymentCard(existing.id)
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <Modal title={existing ? 'Kartani tahrirlash' : 'Yangi karta'} onClose={onClose}>
      <label className="field-label">Bank/xizmat nomi</label>
      <input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Kapitalbank" />
      <label className="field-label">Karta raqami (16 ta raqam)</label>
      <input className="input" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="8600 1234 5678 9012" />
      <label className="field-label">Egasining ismi</label>
      <input className="input" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Elbek X." />
      {existing && (
        <label className="checkbox-row">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Faol (userga ko'rsatiladi)
        </label>
      )}
      <div className="modal-actions">
        <button className="btn btn-accent btn-block" onClick={save}>
          Saqlash
        </button>
        {existing && (
          <button className="btn btn-soft btn-block danger-text" onClick={remove}>
            O'chirish
          </button>
        )}
      </div>
    </Modal>
  )
}
