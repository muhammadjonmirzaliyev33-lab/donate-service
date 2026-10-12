import { useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical, Plus } from 'lucide-react'
import {
  createGame,
  createPackage,
  deleteGame,
  deletePackage,
  getAdminGame,
  getAdminGames,
  getSupplierAccount,
  getSupplierCatalog,
  getSupplierCategories,
  getMoogoldAccount,
  getMoogoldProducts,
  getMoogoldVariations,
  getCoinDropAccount,
  getCoinDropGames,
  getCoinDropProducts,
  updateGame,
  updatePackage,
  uploadGameImage,
  uploadPackageImage,
  MOOGOLD_CATEGORIES,
  type AdminGameDto,
  type AdminGameWithPackagesDto,
  type AdminPackageDto,
  type MoogoldProductDto,
  type MoogoldVariationDto,
  type CoinDropGameDto,
  type CoinDropProductDto,
  type SupplierCategoryDto,
  type SupplierProductDto
} from '../lib/api'
import { formatSom } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { GameArt } from '../components/GameArt'
import { EmptyState, ErrorState, Loading } from '../components/Status'
import { useGameDragReorder } from '../lib/useGameDragReorder'

function describeSupplier(
  name: string,
  account: { enabled: boolean; balance?: string; currency?: string; error?: string } | null
): string {
  if (!account) return `${name}: holatini olib bo'lmadi`
  if (!account.enabled) return `${name}: ulanmagan`
  if (account.error) return `${name}: xato — ${account.error}`
  return `${name}: ${account.balance} ${account.currency}`
}

export function CatalogPage() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  if (selectedGameId) {
    return <GameDetail gameId={selectedGameId} onBack={() => setSelectedGameId(null)} />
  }
  return <GamesList onSelect={setSelectedGameId} />
}

function GamesList({ onSelect }: { onSelect: (gameId: string) => void }) {
  const [games, setGames] = useState<AdminGameDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [supplierStatus, setSupplierStatus] = useState('PayCore holati tekshirilmoqda…')
  const [editing, setEditing] = useState<AdminGameDto | 'new' | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const originalOrder = useRef('')
  const toast = useToast()

  function load() {
    getAdminGames().then((g) => {
      setGames(g)
      originalOrder.current = g.map((x) => x.id).join(',')
      setDirty(false)
    }).catch(setError)
  }

  useEffect(load, [])

  useEffect(() => {
    Promise.all([
      getSupplierAccount().catch(() => null),
      getMoogoldAccount().catch(() => null),
      getCoinDropAccount().catch(() => null)
    ]).then(([paycore, moogold, coindrop]) =>
      setSupplierStatus(`${describeSupplier('PayCore', paycore)} · ${describeSupplier('MooGold', moogold)} · ${describeSupplier('CoinDrop', coindrop)}`)
    )
  }, [])

  const checkDirty = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const current = Array.from(el.querySelectorAll<HTMLElement>('[data-game]'))
      .map((r) => r.dataset.game)
      .join(',')
    setDirty(current !== originalOrder.current)
  }, [])

  useGameDragReorder(listRef, games?.map((g) => g.id) ?? [], onSelect, checkDirty)

  async function saveOrder() {
    const el = listRef.current
    if (!el) return
    const orderedIds = Array.from(el.querySelectorAll<HTMLElement>('[data-game]')).map((r) => r.dataset.game!)
    setSaving(true)
    try {
      await Promise.all(orderedIds.map((id, i) => updateGame(id, { sortOrder: i })))
      toast('Tartib saqlandi')
      load()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorState error={error} />
  if (!games) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>O'yinlar ({games.length})</h1>
        <button className="btn btn-accent" onClick={() => setEditing('new')}>
          <Plus size={16} /> Yangi
        </button>
      </div>
      <div className="hint-box">{supplierStatus}</div>
      {games.length > 1 && (
        <div className="hint-box">O'yinni bosib ~yarim soniya ushlab turing, keyin tepaga/pastga sudrab tartibini o'zgartiring</div>
      )}
      {games.length === 0 ? (
        <EmptyState text="Hali o'yin qo'shilmagan" />
      ) : (
        <div className="list-card" ref={listRef}>
          {games.map((g) => (
            <div className="list-row" key={g.id} data-game={g.id}>
              <div className="list-row-icon" style={{ background: g.gradient }}>
                <GameArt game={g} />
              </div>
              <div className="list-row-text">
                <div className="list-row-title">
                  {g.name} {!g.isActive && <span className="badge badge-neutral">Nofaol</span>}
                </div>
                <div className="list-row-sub">{g.category || g.currencyName}</div>
              </div>
              <div className="drag-handle">
                <GripVertical size={18} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="page-actions">
        <button className="btn btn-accent" disabled={!dirty || saving} onClick={saveOrder}>
          {saving ? 'Saqlanmoqda…' : 'Tartibni saqlash'}
        </button>
      </div>
      {editing && (
        <GameFormModal
          existing={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(newId) => {
            setEditing(null)
            load()
            if (newId) onSelect(newId)
          }}
        />
      )}
    </div>
  )
}

function GameDetail({ gameId, onBack }: { gameId: string; onBack: () => void }) {
  const [game, setGame] = useState<AdminGameWithPackagesDto | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [editingGame, setEditingGame] = useState(false)
  const [editingPkg, setEditingPkg] = useState<AdminPackageDto | 'new' | null>(null)
  const toast = useToast()

  function load() {
    getAdminGame(gameId).then(setGame).catch(setError)
  }

  useEffect(load, [gameId])

  async function toggleActive() {
    if (!game) return
    try {
      await updateGame(game.id, { isActive: !game.isActive })
      load()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  if (error) return <ErrorState error={error} />
  if (!game) return <Loading />

  return (
    <div>
      <div className="back-header">
        <button className="back-btn" onClick={onBack}>
          ← O'yinlar
        </button>
      </div>

      <div className="game-header">
        <div className="game-header-art" style={{ background: game.gradient }}>
          <GameArt game={game} size={26} />
        </div>
        <div>
          <div className="game-header-name">{game.name}</div>
          <div className="game-header-cat">{game.category || game.currencyName}</div>
        </div>
      </div>

      <div className="page-actions" style={{ marginTop: 0, marginBottom: 20 }}>
        <button className="btn btn-soft" style={{ flex: 1 }} onClick={() => setEditingGame(true)}>
          Tahrirlash
        </button>
        <button className="btn btn-soft" style={{ flex: 1 }} onClick={toggleActive}>
          {game.isActive ? "O'chirish" : 'Yoqish'}
        </button>
      </div>

      <div className="page-head">
        <h2>Paketlar ({game.packages.length})</h2>
        <button className="btn btn-accent" onClick={() => setEditingPkg('new')}>
          <Plus size={16} /> Yangi
        </button>
      </div>
      {game.packages.length === 0 ? (
        <EmptyState text="Hali paket qo'shilmagan" />
      ) : (
        <div className="pkg-grid">
          {game.packages.map((p) => (
            <div key={p.id} className={`pkg-card ${p.isActive ? '' : 'inactive'}`} onClick={() => setEditingPkg(p)}>
              <div className="pkg-amount">{p.label}</div>
              {p.bonus ? <div className="pkg-bonus">+{p.bonus} bonus</div> : null}
              <div className="pkg-price">{formatSom(p.price)}</div>
            </div>
          ))}
        </div>
      )}

      {editingGame && (
        <GameFormModal
          existing={game}
          onClose={() => setEditingGame(false)}
          onSaved={() => {
            setEditingGame(false)
            load()
          }}
          onDeleted={onBack}
        />
      )}
      {editingPkg && (
        <PackageFormModal
          game={game}
          existing={editingPkg === 'new' ? undefined : editingPkg}
          onClose={() => setEditingPkg(null)}
          onSaved={() => {
            setEditingPkg(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function GameFormModal({
  existing,
  onClose,
  onSaved,
  onDeleted
}: {
  existing?: AdminGameDto
  onClose: () => void
  onSaved: (newId?: string) => void
  onDeleted?: () => void
}) {
  const [id, setId] = useState('')
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [currencyName, setCurrencyName] = useState(existing?.currencyName ?? '')
  const [requiresServer, setRequiresServer] = useState(existing?.requiresServer ?? false)
  const [supplierCategory, setSupplierCategory] = useState(existing?.supplierCategory ?? '')
  const [categories, setCategories] = useState<SupplierCategoryDto[] | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [provider, setProvider] = useState<'paycore' | 'moogold' | 'coindrop'>(existing?.supplierProvider ?? 'paycore')
  const [mgCategoryId, setMgCategoryId] = useState(MOOGOLD_CATEGORIES[0].id)
  const [mgProducts, setMgProducts] = useState<MoogoldProductDto[] | null>(null)
  const [mgOrderCategory, setMgOrderCategory] = useState(existing?.supplierOrderCategory ?? 1)
  const [cdGames, setCdGames] = useState<CoinDropGameDto[] | null>(null)
  const toast = useToast()

  useEffect(() => {
    getSupplierCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (provider !== 'moogold') return
    setMgProducts(null)
    getMoogoldProducts(mgCategoryId)
      .then(({ products }) => setMgProducts(products))
      .catch(() => setMgProducts([]))
  }, [provider, mgCategoryId])

  useEffect(() => {
    if (provider !== 'coindrop') return
    getCoinDropGames()
      .then(({ games }) => setCdGames(games))
      .catch(() => setCdGames([]))
  }, [provider])

  async function save() {
    if (!name.trim() || !currencyName.trim()) {
      toast('Nomi va valyuta nomini kiriting')
      return
    }
    const supplierFields = {
      supplierCategory: supplierCategory || null,
      supplierProvider: provider,
      supplierOrderCategory: provider === 'moogold' ? mgOrderCategory : null
    }
    try {
      if (existing) {
        await updateGame(existing.id, { name, category, currencyName, requiresServer, ...supplierFields })
        if (imageFile) await uploadGameImage(existing.id, imageFile)
        onSaved()
      } else {
        if (!/^[a-z0-9_]+$/.test(id)) {
          toast("ID faqat kichik lotin harflar, raqam va '_' bo'lishi kerak")
          return
        }
        await createGame({ id, name, category, currencyName, requiresServer, ...supplierFields })
        if (imageFile) await uploadGameImage(id, imageFile)
        onSaved(id)
      }
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  async function remove() {
    if (!existing) return
    if (!confirm(`"${existing.name}" va uning barcha paketlari butunlay o'chiriladi. Davom etilsinmi?`)) return
    try {
      await deleteGame(existing.id)
      onDeleted?.()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <Modal title={existing ? "O'yinni tahrirlash" : "Yangi o'yin"} onClose={onClose}>
      {!existing && (
        <>
          <label className="field-label">ID (slug, masalan "pubgm")</label>
          <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="pubgm" />
        </>
      )}
      <label className="field-label">Nomi</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="PUBG Mobile" />
      <label className="field-label">Kategoriya (ekranda ko'rinadi)</label>
      <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="UC / Diamonds" />
      <label className="field-label">Valyuta nomi</label>
      <input className="input" value={currencyName} onChange={(e) => setCurrencyName(e.target.value)} placeholder="UC" />
      <label className="checkbox-row">
        <input type="checkbox" checked={requiresServer} onChange={(e) => setRequiresServer(e.target.checked)} /> Server ID talab qilinadi
      </label>
      <label className="field-label">Yetkazib beruvchi</label>
      <select
        className="input"
        value={provider}
        onChange={(e) => {
          setProvider(e.target.value as 'paycore' | 'moogold' | 'coindrop')
          setSupplierCategory('')
        }}
      >
        <option value="paycore">PayCore</option>
        <option value="moogold">MooGold</option>
        <option value="coindrop">CoinDrop</option>
      </select>

      {provider === 'coindrop' && (
        <>
          <label className="field-label">CoinDrop o'yini</label>
          <select className="input" value={supplierCategory} onChange={(e) => setSupplierCategory(e.target.value)} disabled={!cdGames}>
            <option value="">{cdGames ? "— Bog'lanmagan (qo'lda yetkaziladi) —" : 'Yuklanmoqda…'}</option>
            {cdGames?.map((g) => (
              <option key={g.key} value={g.key}>
                {g.name} {g.requires_server ? `(${g.server_label || 'server'})` : ''}
              </option>
            ))}
          </select>
        </>
      )}

      {provider === 'paycore' && (
        <>
          <label className="field-label">PayCore kategoriyasi (ixtiyoriy)</label>
          <select className="input" value={supplierCategory} onChange={(e) => setSupplierCategory(e.target.value)} disabled={!categories}>
            <option value="">— Bog'lanmagan (qo'lda yetkaziladi) —</option>
            {categories?.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </>
      )}
      {provider === 'moogold' && (
        <>
          <label className="field-label">MooGold bo'limi</label>
          <select className="input" value={mgCategoryId} onChange={(e) => setMgCategoryId(Number(e.target.value))}>
            {MOOGOLD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <label className="field-label">MooGold o'yini (mahsulot)</label>
          <select className="input" value={supplierCategory} onChange={(e) => setSupplierCategory(e.target.value)} disabled={!mgProducts}>
            <option value="">{mgProducts ? "— Bog'lanmagan (qo'lda yetkaziladi) —" : 'Yuklanmoqda…'}</option>
            {mgProducts?.map((p) => (
              <option key={p.ID} value={p.ID}>
                {p.post_title}
              </option>
            ))}
          </select>
          <label className="field-label">Buyurtma turi</label>
          <select className="input" value={mgOrderCategory} onChange={(e) => setMgOrderCategory(Number(e.target.value))}>
            <option value={1}>1 — Direct Top Up</option>
            <option value={2}>2 — eVoucher</option>
          </select>
        </>
      )}
      <label className="field-label">Muqova rasmi (ixtiyoriy)</label>
      {existing?.icon?.startsWith('http') && <img src={existing.icon} alt="" className="game-cover-preview" />}
      <input className="input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
      <div className="modal-actions">
        <button className="btn btn-accent btn-block" onClick={save}>
          Saqlash
        </button>
        {existing && (
          <button className="btn btn-soft btn-block danger-text" onClick={remove}>
            Butunlay o'chirish
          </button>
        )}
      </div>
    </Modal>
  )
}

function PackageFormModal({
  game,
  existing,
  onClose,
  onSaved
}: {
  game: AdminGameWithPackagesDto
  existing?: AdminPackageDto
  onClose: () => void
  onSaved: () => void
}) {
  // VPN'da PayCore katalogida alohida slug yo'q (parametrik: oy+qurilma bilan buyurtma
  // qilinadi) — shuning uchun bu o'yin uchun "Miqdor" maydoni oy sonini bildiradi va
  // qo'shimcha "Qurilmalar soni" maydoni chiqadi, PayCore mahsulot tanlovi esa yashiriladi.
  const isVpn = game.supplierCategory === 'vpn'
  const [label, setLabel] = useState(existing?.label ?? '')
  const [amount, setAmount] = useState(String(existing?.amount ?? ''))
  const [price, setPrice] = useState(String(existing?.price ?? ''))
  const [groupName, setGroupName] = useState(existing?.groupName ?? 'Barchasi')
  const [supplierSlug, setSupplierSlug] = useState(existing?.supplierSlug ?? '')
  const [extraQty, setExtraQty] = useState(String(existing?.extraQty ?? 1))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [products, setProducts] = useState<SupplierProductDto[] | null>(null)
  const [variations, setVariations] = useState<MoogoldVariationDto[] | null>(null)
  const [cdProducts, setCdProducts] = useState<CoinDropProductDto[] | null>(null)
  const isMoogold = game.supplierProvider === 'moogold'
  const isCoinDrop = game.supplierProvider === 'coindrop'
  const toast = useToast()

  useEffect(() => {
    if (!game.supplierCategory || isVpn) return
    if (isMoogold) {
      // MooGold'da paket = mahsulotning varianti (variation_id).
      getMoogoldVariations(game.supplierCategory)
        .then(({ variations }) => setVariations(variations))
        .catch(() => setVariations([]))
      return
    }
    if (isCoinDrop) {
      getCoinDropProducts(game.supplierCategory)
        .then(({ products }) => setCdProducts(products))
        .catch(() => setCdProducts([]))
      return
    }
    getSupplierCatalog(game.supplierCategory)
      .then(({ products }) => setProducts(products))
      .catch(() => setProducts([]))
  }, [game.supplierCategory, isVpn, isMoogold, isCoinDrop])

  async function save() {
    const amountN = Number(amount)
    const priceN = Number(price)
    if (!label.trim() || !amountN || !priceN) {
      toast("Nomi, miqdor va narxni to'g'ri kiriting")
      return
    }
    const extraQtyN = isVpn ? Number(extraQty) || 1 : null
    try {
      if (existing) {
        await updatePackage(existing.id, { label, amount: amountN, price: priceN, groupName, supplierSlug: supplierSlug || null, extraQty: extraQtyN })
        if (imageFile) await uploadPackageImage(existing.id, imageFile)
      } else {
        const created = await createPackage(game.id, { label, amount: amountN, price: priceN, groupName, supplierSlug: supplierSlug || null, extraQty: extraQtyN })
        if (imageFile) await uploadPackageImage(created.id, imageFile)
      }
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  async function remove() {
    if (!existing) return
    if (!confirm("Paketni o'chirish kerakmi?")) return
    try {
      await deletePackage(existing.id)
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <Modal title={existing ? 'Paketni tahrirlash' : 'Yangi paket'} onClose={onClose}>
      <label className="field-label">Nomi (masalan "{isVpn ? '3 oy / 2 qurilma' : '60 UC'}")</label>
      <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
      <div className="field-row">
        <input
          className="input"
          type="number"
          placeholder={isVpn ? 'Oy soni (1/3/6/12)' : 'Miqdor'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input className="input" type="number" placeholder="Narx (so'm)" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      {isVpn && (
        <>
          <label className="field-label">Qurilmalar soni</label>
          <input className="input" type="number" min={1} value={extraQty} onChange={(e) => setExtraQty(e.target.value)} />
        </>
      )}
      <label className="field-label">Guruh (filter chip nomi)</label>
      <input className="input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Barchasi" />
      <label className="field-label">Paket rasmi (ixtiyoriy)</label>
      {existing?.icon?.startsWith('http') && <img src={existing.icon} alt="" style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 8 }} />}
      <input className="input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
      {!isVpn &&
        (!game.supplierCategory ? (
          <div className="hint-box">Avval o'yin sozlamalarida yetkazib beruvchi va mahsulotni tanlang</div>
        ) : isMoogold ? (
          <>
            <label className="field-label">MooGold varianti (ixtiyoriy)</label>
            <select className="input" value={supplierSlug} onChange={(e) => setSupplierSlug(e.target.value)} disabled={!variations}>
              <option value="">{variations ? "— Bog'lanmagan (qo'lda yetkaziladi) —" : 'Yuklanmoqda…'}</option>
              {variations?.map((v) => (
                <option key={v.variation_id} value={String(v.variation_id)}>
                  {v.variation_name} — {v.variation_price} USD
                  {v.stock_status && v.stock_status !== 'instock' ? ' (tugagan)' : ''}
                </option>
              ))}
            </select>
          </>
        ) : isCoinDrop ? (
          <>
            <label className="field-label">CoinDrop mahsuloti (ixtiyoriy — bo'sh qoldirsangiz, "Miqdor" maydoni amount sifatida yuboriladi)</label>
            <select className="input" value={supplierSlug} onChange={(e) => setSupplierSlug(e.target.value)} disabled={!cdProducts}>
              <option value="">{cdProducts ? "— Bog'lanmagan / miqdor asosida —" : 'Yuklanmoqda…'}</option>
              {cdProducts?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price_usd} USD
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="field-label">PayCore mahsuloti (ixtiyoriy)</label>
            <select className="input" value={supplierSlug} onChange={(e) => setSupplierSlug(e.target.value)} disabled={!products}>
              <option value="">— Bog'lanmagan (qo'lda yetkaziladi) —</option>
              {products?.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title} — {p.price_usdt} USDT{p.in_stock <= 0 ? ' (tugagan)' : ''}
                </option>
              ))}
            </select>
          </>
        ))}
      <div className="modal-actions">
        <button className="btn btn-accent btn-block" onClick={save}>
          Saqlash
        </button>
        {existing && (
          <button className="btn btn-soft btn-block danger-text" onClick={remove}>
            Paketni o'chirish
          </button>
        )}
      </div>
    </Modal>
  )
}
