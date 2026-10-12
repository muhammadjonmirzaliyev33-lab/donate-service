import { useState } from 'react'
import { X } from 'lucide-react'
import { sendBroadcast } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'

const MAX_IMAGES = 5

export function BroadcastPage({ onViewHistory }: { onViewHistory: () => void }) {
  const [message, setMessage] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const toast = useToast()

  function addImages(files: FileList | null) {
    if (!files) return
    const picked = Array.from(files)
    if (images.length + picked.length > MAX_IMAGES) {
      toast(`Ko'pi bilan ${MAX_IMAGES} ta rasm yuklash mumkin`)
    }
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES))
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function send() {
    if (!message.trim()) {
      toast('Xabar matnini kiriting')
      return
    }
    if (!confirm("Xabar botga ulangan barcha foydalanuvchilarga yuboriladi. Bu amalni ortga qaytarib bo'lmaydi. Davom etilsinmi?")) return
    setSending(true)
    try {
      await sendBroadcast(message, images)
      toast('Yuborish boshlandi — foydalanuvchilarga ketmoqda')
      setMessage('')
      setImages([])
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Barchaga xabar yuborish</h1>
        <button className="btn btn-ghost" onClick={onViewHistory}>
          Tarix
        </button>
      </div>
      <label className="field-label">Xabar matni</label>
      <textarea
        className="input textarea"
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="🔥 Aksiya! Bugun barcha PUBG paketlariga 10% chegirma."
      />
      <label className="field-label">Rasmlar (ixtiyoriy, maksimum {MAX_IMAGES} ta)</label>
      <input className="input" type="file" accept="image/*" multiple onChange={(e) => addImages(e.target.files)} />
      {images.length > 0 && (
        <div className="image-preview-row">
          {images.map((file, i) => (
            <div key={i} className="image-preview">
              <img src={URL.createObjectURL(file)} alt="" />
              <button type="button" className="image-preview-remove" onClick={() => removeImage(i)} aria-label="O'chirish">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="hint-box">⚠️ Xabar botga ulangan BARCHA foydalanuvchilarga ketadi. Ehtiyot bo'ling — ortga qaytarib bo'lmaydi.</div>
      <div className="page-actions">
        <button className="btn btn-accent" disabled={sending} onClick={send}>
          {sending ? 'Yuborilmoqda…' : 'Yuborish'}
        </button>
      </div>
    </div>
  )
}
