import { useEffect, useState } from 'react'
import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  getAdminSettings,
  updateBanner,
  updateSettings,
  type AdminBannerDto,
  type AdminSettingsDto
} from '../lib/api'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'
import { ErrorState, Loading } from '../components/Status'

function BannersSection() {
  const [banners, setBanners] = useState<AdminBannerDto[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const load = () =>
    getAdminBanners()
      .then(setBanners)
      .catch((err) => toast(errorMessage(err)))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function add() {
    if (!file) return toast('Avval rasm tanlang')
    setBusy(true)
    try {
      await createBanner(file, link.trim())
      setFile(null)
      setLink('')
      await load()
      toast("Banner qo'shildi")
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(b: AdminBannerDto) {
    try {
      await updateBanner(b.id, { isActive: !b.isActive })
      await load()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  async function remove(b: AdminBannerDto) {
    if (!confirm("Banner o'chirilsinmi?")) return
    try {
      await deleteBanner(b.id)
      await load()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <div>
      <div className="page-head" style={{ marginTop: 24 }}>
        <h2>Bosh sahifa bannerlari</h2>
      </div>
      {banners.map((b) => (
        <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, opacity: b.isActive ? 1 : 0.5 }}>
          <img src={b.imageUrl} alt="" style={{ width: 160, aspectRatio: '16 / 6', objectFit: 'cover', borderRadius: 10 }} />
          <div style={{ flex: 1, fontSize: 12, wordBreak: 'break-all' }}>{b.link || '—'}</div>
          <button className="btn" onClick={() => toggle(b)}>
            {b.isActive ? "Yashirish" : "Ko'rsatish"}
          </button>
          <button className="btn" onClick={() => remove(b)}>
            O'chirish
          </button>
        </div>
      ))}
      <label className="field-label">Yangi banner (rasm, taxminan 16:6)</label>
      <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label className="field-label">Havola (ixtiyoriy — masalan #/game/pubgm yoki https://…)</label>
      <input className="input" value={link} onChange={(e) => setLink(e.target.value)} />
      <div className="page-actions">
        <button className="btn btn-accent" disabled={busy} onClick={add}>
          Banner qo'shish
        </button>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettingsDto | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [supportUsername, setSupportUsername] = useState('')
  const [channelUrl, setChannelUrl] = useState('')
  const [refFixed, setRefFixed] = useState('0')
  const [refPercent, setRefPercent] = useState('0')
  const toast = useToast()

  useEffect(() => {
    getAdminSettings()
      .then((s) => {
        setSettings(s)
        setSupportUsername(s.supportUsername ?? '')
        setChannelUrl(s.channelUrl ?? '')
        setRefFixed(String(s.referralFixedBonus))
        setRefPercent(String(s.referralPercent))
      })
      .catch(setError)
  }, [])

  async function save() {
    const fixed = Number(refFixed)
    const percent = Number(refPercent)
    if (fixed < 0 || percent < 0 || percent > 100) {
      toast("Referral qiymatlarini to'g'ri kiriting")
      return
    }
    try {
      await updateSettings({
        supportUsername: supportUsername.trim() || null,
        channelUrl: channelUrl.trim() || null,
        referralFixedBonus: fixed,
        referralPercent: percent
      })
      toast('Sozlamalar saqlandi')
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  if (error) return <ErrorState error={error} />
  if (!settings) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>Ilova sozlamalari</h1>
      </div>
      <label className="field-label">Support Telegram username (ixtiyoriy)</label>
      <input className="input" value={supportUsername} onChange={(e) => setSupportUsername(e.target.value)} placeholder="@admin_support" />
      <label className="field-label">Telegram kanal manzili (ixtiyoriy)</label>
      <input className="input" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="https://t.me/kanal" />

      <div className="page-head" style={{ marginTop: 24 }}>
        <h2>Referral (do'st taklif qilish)</h2>
      </div>
      <label className="field-label">Fiks bonus (so'm)</label>
      <input className="input" type="number" min={0} value={refFixed} onChange={(e) => setRefFixed(e.target.value)} />
      <label className="field-label">+ foiz (taklif qilinganning birinchi to'lovidan)</label>
      <input className="input" type="number" min={0} max={100} step={0.5} value={refPercent} onChange={(e) => setRefPercent(e.target.value)} />

      <div className="page-actions">
        <button className="btn btn-accent" onClick={save}>
          Saqlash
        </button>
      </div>

      <BannersSection />
    </div>
  )
}
