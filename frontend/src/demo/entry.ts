/**
 * Backend'siz build (vite.demo.config.ts) kirish nuqtasi. Mini App kodi o'zgarishsiz ishlaydi,
 * backend o'rniga brauzer ichidagi kichik "server" javob beradi: boshlang'ich holat haqiqiy
 * backend'dan yozib olingan (demo-mocks.json), o'zgarishlar (buyurtma, tasdiqlash, karta, promokod,
 * sozlamalar, zaxira) shu brauzerning localStorage'ida saqlanadi. Hech qanday pul harakati yo'q.
 */
import mocksRaw from '../demo-mocks.json'
import logo from './logo.webp?inline'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type Mock = { status: number; body: any } // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------- rasmlar (HTML ichiga joylangan) ----------
const covers = import.meta.glob('../../public/games/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<
  string,
  string
>
const assets: Record<string, string> = { '/images/logo.png': logo, '/images/loader_logo.png': logo }
for (const [file, data] of Object.entries(covers)) assets[`/games/${file.split('/').pop()}`] = data
const bannerImgs = import.meta.glob('../../public/banners/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<
  string,
  string
>
for (const [file, data] of Object.entries(bannerImgs)) assets[`/banners/${file.split('/').pop()}`] = data
;(window as unknown as { __DEMO_ASSETS: Record<string, string> }).__DEMO_ASSETS = assets
const splashImg = document.querySelector<HTMLImageElement>('#splash img')
if (splashImg) splashImg.src = logo

// ---------- holat ----------
const STORAGE_KEY = 'uzdi-local-state-v1'
const initial = mocksRaw as unknown as Record<string, Mock>

function loadState(): Record<string, Mock> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as Record<string, Mock>
  } catch {
    /* localStorage yopiq bo'lishi mumkin — boshlang'ich holat bilan ishlaymiz */
  }
  return structuredClone(initial)
}
const db = loadState()
let redeemed: string[] = (db.__redeemed?.body as string[]) ?? []

function save() {
  db.__redeemed = { status: 200, body: redeemed }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* saqlab bo'lmasa — sessiya davomida xotirada qoladi */
  }
}

const body = (path: string) => db[path]?.body
const me = () => body('/users/me') as Json
const uid = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

function json(data: unknown, status = 200): Response {
  return new Response(data === undefined ? null : JSON.stringify(data), {
    status: data === undefined ? 204 : status,
    headers: { 'content-type': 'application/json' },
  })
}
const err = (code: string, message: string, status = 400) => json({ code, message, statusCode: status }, status)

function findPackage(gameId: string, packageId: string): Json | undefined {
  return (body(`/games/${gameId}`)?.packages as Json[] | undefined)?.find((p) => p.id === packageId)
}

/** Buyurtma ikki joyda turadi: userning tarixida va admin navbati/tarixida — ikkalasini birga yangilaymiz. */
function allPaymentLists(): Json[][] {
  return [body('/payments/mine'), body('/admin/payments/pending'), body('/admin/payments/history')].filter(Boolean)
}
function findPayment(id: string): Json | undefined {
  for (const list of allPaymentLists()) {
    const p = list.find((x) => x.id === id)
    if (p) return p
  }
  return undefined
}
function updatePayment(id: string, patch: Json) {
  for (const list of allPaymentLists()) for (const p of list) if (p.id === id) Object.assign(p, patch)
}
function moveToHistory(id: string) {
  const pending = body('/admin/payments/pending') as Json[]
  const i = pending.findIndex((p) => p.id === id)
  if (i >= 0) (body('/admin/payments/history') as Json[]).unshift(pending.splice(i, 1)[0])
}

function adjustStock(gameId: string, delta: number, note: string) {
  const item = (body('/admin/stock') as Json[]).find((s) => s.gameId === gameId)
  if (item) {
    item.balance += delta
    item.updatedAt = nowIso()
  }
  const key = `/admin/stock/${gameId}/movements?limit=30`
  db[key] ??= { status: 200, body: [] }
  ;(db[key].body as Json[]).unshift({ id: uid(), gameId, delta, note, createdAt: nowIso(), type: delta > 0 ? 'deposit' : 'sale' })
  const games = body('/games') as Json[]
  db['/admin/stats/low-stock'].body = (body('/admin/stock') as Json[])
    .filter((s) => s.balance <= 0)
    .map((s) => ({ gameId: s.gameId, name: games.find((g) => g.id === s.gameId)?.name ?? s.gameId, balance: s.balance }))
}

function refreshOverview() {
  const history = body('/admin/payments/history') as Json[]
  const done = history.filter((p) => p.status === 'completed')
  const today = new Date().toDateString()
  Object.assign(body('/admin/stats/overview'), {
    completedCount: done.length,
    totalRevenue: done.reduce((s, p) => s + p.amount, 0),
    todayRevenue: done.filter((p) => new Date(p.decidedAt).toDateString() === today).reduce((s, p) => s + p.amount, 0),
    pendingCount: (body('/admin/payments/pending') as Json[]).length,
  })
}

let nextOrderNo =
  1 + Math.max(1000, ...allPaymentLists().flat().map((p) => Number(p.orderNo) || 0))

function createPayment(kind: 'purchase' | 'topup', input: Json): Response {
  const user = me()
  let amount = Number(input.amount ?? 0)
  let pkg: Json | undefined
  let game: Json | undefined
  if (kind === 'purchase') {
    game = body(`/games/${input.gameId}`)
    pkg = findPackage(input.gameId, input.packageId)
    if (!game || !pkg) return err('CATALOG_PACKAGE_NOT_FOUND', 'Paket topilmadi', 404)
    amount = pkg.price
  }
  const isBalance = input.method === 'balance'
  if (isBalance && user.balance < amount) return err('PAYMENTS_INSUFFICIENT_BALANCE', 'Balans yetarli emas')
  if (!isBalance && !(body('/payment-cards') as Json[]).length) {
    return err('PAYMENT_CARDS_EMPTY', "To'lov kartasi hali qo'shilmagan. Admin paneldan karta qo'shing.")
  }

  const created = nowIso()
  const payment: Json = {
    id: uid(),
    orderNo: nextOrderNo++,
    userId: user.id,
    kind,
    status: isBalance ? 'completed' : 'pending_review',
    method: input.method,
    amount,
    matchAmount: isBalance ? null : Math.floor(amount / 100) * 100 + 10 + Math.floor(Math.random() * 90),
    gameId: input.gameId ?? null,
    packageId: input.packageId ?? null,
    playerInfo: input.playerInfo ?? null,
    hasReceipt: false,
    receiptUrl: null,
    rejectReason: null,
    createdAt: created,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    decidedAt: isBalance ? created : created,
    decidedBySms: false,
    supplierStatus: null,
    supplierDetails: null,
    supplierError: null,
    userTelegramId: user.telegramId,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    gameName: game?.name ?? null,
    packageLabel: pkg?.label ?? null,
  }
  ;(body('/payments/mine') as Json[]).unshift(payment)
  if (isBalance) {
    user.balance -= amount
    ;(body('/admin/payments/history') as Json[]).unshift({ ...payment })
    if (pkg) adjustStock(payment.gameId, -(pkg.amount + (pkg.bonus ?? 0)), `Buyurtma #${payment.orderNo}`)
  } else {
    ;(body('/admin/payments/pending') as Json[]).push({ ...payment })
  }
  refreshOverview()
  save()
  return json(payment, 201)
}

function decide(id: string, outcome: 'approve' | 'reject' | 'undo'): Response {
  const p = findPayment(id)
  if (!p) return err('PAYMENTS_NOT_FOUND', 'Buyurtma topilmadi', 404)
  const user = me()
  const pkg = p.gameId && p.packageId ? findPackage(p.gameId, p.packageId) : undefined
  const units = pkg ? pkg.amount + (pkg.bonus ?? 0) : 0

  if (outcome === 'undo') {
    if (p.status === 'completed') {
      if (p.kind === 'topup') user.balance = Math.max(0, user.balance - p.amount)
      else if (pkg) adjustStock(p.gameId, units, `Buyurtma #${p.orderNo} qaytarildi`)
    }
    updatePayment(id, { status: 'pending_review', rejectReason: null })
    const history = body('/admin/payments/history') as Json[]
    const i = history.findIndex((x) => x.id === id)
    if (i >= 0) (body('/admin/payments/pending') as Json[]).push(history.splice(i, 1)[0])
  } else {
    if (p.status !== 'pending_review') return err('PAYMENTS_ALREADY_DECIDED', 'Bu buyurtma allaqachon hal qilingan', 409)
    const approved = outcome === 'approve'
    if (approved) {
      if (p.kind === 'topup') user.balance += p.amount
      else if (pkg) adjustStock(p.gameId, -units, `Buyurtma #${p.orderNo}`)
    }
    updatePayment(id, { status: approved ? 'completed' : 'cancelled', decidedAt: nowIso() })
    moveToHistory(id)
  }
  refreshOverview()
  save()
  return json(findPayment(id))
}

/** Oddiy ro'yxat (kartalar, promokodlar): POST qo'shadi, PATCH birlashtiradi, DELETE o'chiradi. */
function crud(listPath: string, method: string, id: string | undefined, input: Json, defaults: () => Json): Response {
  const list = body(listPath) as Json[]
  if (method === 'POST' && !id) {
    const item = { ...defaults(), ...input }
    list.push(item)
    save()
    return json(item, 201)
  }
  const item = list.find((x) => x.id === id)
  if (!item) return err('NOT_FOUND', 'Topilmadi', 404)
  if (method === 'PATCH') Object.assign(item, input)
  if (method === 'DELETE') list.splice(list.indexOf(item), 1)
  save()
  return method === 'DELETE' ? json(undefined) : json(item)
}

function syncPublicCards() {
  db['/payment-cards'].body = (body('/admin/payment-cards') as Json[])
    .filter((c) => c.isActive)
    .map(({ id, bankName, cardNumber, holderName }) => ({ id, bankName, cardNumber, holderName }))
}

function updateGame(gameId: string, input: Json): Response {
  const targets = [
    (body('/games') as Json[]).find((g) => g.id === gameId),
    (body('/admin/games') as Json[]).find((g) => g.id === gameId),
    body(`/games/${gameId}`),
    body(`/admin/games/${gameId}`),
  ].filter(Boolean) as Json[]
  if (!targets.length) return err('CATALOG_GAME_NOT_FOUND', "O'yin topilmadi", 404)
  for (const t of targets) Object.assign(t, input)
  save()
  return json(body(`/admin/games/${gameId}`) ?? targets[0])
}

function packageOp(method: string, packageId: string | undefined, gameId: string | undefined, input: Json): Response {
  const detailPaths = Object.keys(db).filter((k) => /^\/(admin\/)?games\/[^/]+$/.test(k) && !k.endsWith('/games'))
  if (method === 'POST' && gameId) {
    const pkg = { id: uid(), gameId, bonus: null, badge: null, groupName: 'Barchasi', sortOrder: 0, isActive: true, icon: null, ...input }
    for (const k of detailPaths) if (body(k)?.id === gameId) (body(k).packages as Json[]).push({ ...pkg })
    save()
    return json(pkg, 201)
  }
  let result: Json | undefined
  for (const k of detailPaths) {
    const pkgs = body(k)?.packages as Json[] | undefined
    const i = pkgs?.findIndex((p) => p.id === packageId) ?? -1
    if (!pkgs || i < 0) continue
    if (method === 'DELETE') pkgs.splice(i, 1)
    else result = Object.assign(pkgs[i], input)
  }
  save()
  return method === 'DELETE' ? json(undefined) : result ? json(result) : err('NOT_FOUND', 'Paket topilmadi', 404)
}

// ---------- so'rovlarni ushlash ----------
const realFetch = window.fetch.bind(window)

async function handle(path: string, query: string, method: string, input: Json): Promise<Response> {
  const full = path + query
  if (method === 'GET') {
    if (db[full]) return json(db[full].body, db[full].status)
    if (db[path]) return json(db[path].body, db[path].status)
    if (path.includes('/movements')) return json([])
  }

  if (/^\/games\/[^/]+\/verify-player$/.test(path)) return json({ supported: false, found: false })
  if (path === '/payments/purchase') return createPayment('purchase', input)
  if (path === '/payments/topup') return createPayment('topup', input)

  let m = /^\/payments\/([^/]+)\/receipt$/.exec(path)
  if (m) {
    updatePayment(m[1], { hasReceipt: true })
    save()
    return json(findPayment(m[1]))
  }
  m = /^\/payments\/([^/]+)$/.exec(path)
  if (m) {
    const p = findPayment(m[1])
    return p ? json(p) : err('PAYMENTS_NOT_FOUND', 'Buyurtma topilmadi', 404)
  }

  if (path === '/promo-codes/redeem') {
    const code = String(input.code ?? '').trim().toUpperCase()
    const promo = (body('/admin/promo-codes') as Json[]).find((p) => p.code === code)
    if (!promo) return err('PROMO_CODE_NOT_FOUND', 'Bunday promokod topilmadi', 404)
    if (!promo.isActive) return err('PROMO_CODE_INACTIVE', 'Promokod faol emas')
    if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) return err('PROMO_CODE_EXPIRED', "Promokod muddati o'tgan")
    if (redeemed.includes(promo.id)) return err('PROMO_CODE_ALREADY_REDEEMED', 'Bu promokodni allaqachon ishlatgansiz', 409)
    redeemed.push(promo.id)
    promo.redemptionsCount = (promo.redemptionsCount ?? 0) + 1
    me().balance += promo.bonusAmount
    save()
    return json({ bonusAmount: promo.bonusAmount, balance: me().balance })
  }

  m = /^\/admin\/payments\/([^/]+)\/(approve|reject|undo)$/.exec(path)
  if (m) return decide(m[1], m[2] as 'approve' | 'reject' | 'undo')

  m = /^\/admin\/stock\/([^/]+)\/deposit$/.exec(path)
  if (m) {
    adjustStock(m[1], Number(input.amount) || 0, input.note || 'Kirim')
    save()
    return json((body('/admin/stock') as Json[]).find((s) => s.gameId === m![1]))
  }

  m = /^\/admin\/payment-cards(?:\/([^/]+))?$/.exec(path)
  if (m) {
    const res = crud('/admin/payment-cards', method, m[1], input, () => ({ id: uid(), isActive: true, sortOrder: 0 }))
    syncPublicCards()
    save()
    return res
  }

  m = /^\/admin\/promo-codes(?:\/([^/]+))?$/.exec(path)
  if (m) {
    if (input.code) input.code = String(input.code).trim().toUpperCase()
    return crud('/admin/promo-codes', method, m[1], input, () => ({
      id: uid(),
      isActive: true,
      expiresAt: null,
      redemptionsCount: 0,
      createdAt: nowIso(),
    }))
  }

  if (path === '/admin/settings' && method === 'PATCH') {
    Object.assign(body('/admin/settings'), input)
    Object.assign(body('/settings'), input)
    save()
    return json(body('/admin/settings'))
  }

  m = /^\/admin\/games\/packages\/([^/]+)$/.exec(path)
  if (m) return packageOp(method, m[1], undefined, input)
  m = /^\/admin\/games\/([^/]+)\/packages$/.exec(path)
  if (m) return packageOp('POST', undefined, m[1], input)
  m = /^\/admin\/games\/([^/]+)$/.exec(path)
  if (m && method === 'PATCH') return updateGame(m[1], input)

  if (path === '/admin/broadcast') return err('UNAVAILABLE', "Xabar yuborish bot serveri ulanganda ishlaydi", 503)
  if (/\/image$/.test(path)) return err('UNAVAILABLE', 'Rasm yuklash bot serveri ulanganda ishlaydi', 503)

  return err('UNAVAILABLE', 'Bu amal bot serveri ulanganda ishlaydi', 503)
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  // Faqat ilovaning o'z API so'rovlari (nisbiy yo'l) ushlanadi; shriftlar va h.k. odatdagidek.
  if (!url.startsWith('/')) return realFetch(input, init)
  const q = url.indexOf('?')
  const path = q >= 0 ? url.slice(0, q) : url
  const query = q >= 0 ? url.slice(q) : ''
  const method = (init?.method ?? 'GET').toUpperCase()
  let data: Json = {}
  if (typeof init?.body === 'string') {
    try {
      data = JSON.parse(init.body) as Json
    } catch {
      data = {}
    }
  }
  await new Promise((r) => setTimeout(r, 120))
  return handle(path, query, method, data)
}

void import('../main')
