import { useEffect, useState } from 'react'
import { createPromoCode, deletePromoCode, getAdminPromoCodes, updatePromoCode, type AdminPromoCodeDto } from '../lib/api'
import { formatSom } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { EmptyState, ErrorState, Loading } from '../components/Status'

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Muddatsiz'
  const d = new Date(expiresAt)
  const expired = d.getTime() <= Date.now()
  const text = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return expired ? `Muddati tugagan (${text})` : `${text} gacha`
}

export function PromoPage() {
  const [codes, setCodes] = useState<AdminPromoCodeDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState<AdminPromoCodeDto | 'new' | null>(null)

  function load() {
    getAdminPromoCodes().then(setCodes).catch(setError)
  }

  useEffect(load, [])

  if (error) return <ErrorState error={error} />
  if (!codes) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>Promokodlar ({codes.length})</h1>
        <button className="btn btn-accent" onClick={() => setEditing('new')}>
          + Yangi
        </button>
      </div>
      {codes.length === 0 ? (
        <EmptyState text="Hali promokod yaratilmagan" />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Bonus</th>
              <th>Ishlatilgan</th>
              <th>Muddat</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="clickable-row" onClick={() => setEditing(c)}>
                <td>
                  <b>{c.code}</b>
                </td>
                <td>+{formatSom(c.bonusAmount)}</td>
                <td>{c.redemptionsCount} marta</td>
                <td>{formatExpiry(c.expiresAt)}</td>
                <td>{c.isActive ? <span className="badge badge-success">Faol</span> : <span className="badge badge-neutral">Nofaol</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {editing && (
        <PromoFormModal
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

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function PromoFormModal({ existing, onClose, onSaved }: { existing?: AdminPromoCodeDto; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(existing?.code ?? '')
  const [amount, setAmount] = useState(String(existing?.bonusAmount ?? ''))
  const [expires, setExpires] = useState(toDateInputValue(existing?.expiresAt ?? null))
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)
  const toast = useToast()

  async function save() {
    const n = Number(amount)
    if (!n || n <= 0) {
      toast("To'g'ri summa kiriting")
      return
    }
    const expiresAt = expires ? new Date(`${expires}T23:59:59`).toISOString() : null
    try {
      if (existing) {
        await updatePromoCode(existing.id, { bonusAmount: n, expiresAt, isActive })
      } else {
        if (!/^[A-Za-z0-9_-]{3,40}$/.test(code)) {
          toast("Kod 3-40 belgi, faqat harf/raqam/'_'/'-' bo'lishi kerak")
          return
        }
        await createPromoCode({ code, bonusAmount: n, expiresAt })
      }
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  async function remove() {
    if (!existing) return
    if (!confirm("Promokodni o'chirish kerakmi?")) return
    try {
      await deletePromoCode(existing.id)
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <Modal title={existing ? 'Promokodni tahrirlash' : 'Yangi promokod'} onClose={onClose}>
      <label className="field-label">Kod</label>
      <input
        className="input"
        value={code}
        disabled={!!existing}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="WELCOME10000"
      />
      <label className="field-label">Bonus summasi (so'm)</label>
      <input className="input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label className="field-label">Tugash sanasi (ixtiyoriy)</label>
      <input className="input" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      {existing ? (
        <label className="checkbox-row">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Faol
        </label>
      ) : (
        <div className="hint-box">Har bir foydalanuvchi bu kodni faqat bir marta ishlata oladi.</div>
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
