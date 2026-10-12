/**
 * DEMO build kirish nuqtasi (vite.demo.config.ts). Haqiqiy Mini App kodi o'zgarishsiz ishlaydi,
 * faqat backend o'rniga oldindan yozib olingan javoblar (demo-mocks.json) beriladi.
 * To'lovlar haqiqiy emas — buyurtmalar faqat brauzer xotirasida yaratiladi.
 */
import mocksRaw from '../demo-mocks.json'
import logo from './logo.webp?inline'

type Mock = { status: number; body: unknown }
const mocks = mocksRaw as unknown as Record<string, Mock>

// ---------- rasmlar (HTML ichiga joylangan) ----------
const covers = import.meta.glob('../../public/games/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<
  string,
  string
>
const assets: Record<string, string> = { '/images/logo.png': logo, '/images/loader_logo.png': logo }
for (const [file, data] of Object.entries(covers)) assets[`/games/${file.split('/').pop()}`] = data
;(window as unknown as { __DEMO_ASSETS: Record<string, string> }).__DEMO_ASSETS = assets

const splashImg = document.querySelector<HTMLImageElement>('#splash img')
if (splashImg) splashImg.src = logo

// ---------- soxta backend ----------
interface Pkg {
  id: string
  price: number
}
interface Payment {
  id: string
  orderNo: number
  status: string
  method: string
  amount: number
  matchAmount: number | null
  kind: string
  gameId: string | null
  packageId: string | null
  hasReceipt: boolean
  [k: string]: unknown
}

const me = mocks['/users/me'].body as { balance: number; [k: string]: unknown }
const mine = (mocks['/payments/mine'].body as Payment[]) ?? []
const byId = new Map<string, Payment>(mine.map((p) => [p.id, p]))
let nextOrderNo = Math.max(100, ...mine.map((p) => p.orderNo + 1))

const realFetch = window.fetch.bind(window)

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function createPayment(kind: 'purchase' | 'topup', body: Record<string, unknown>): Response {
  let amount = Number(body.amount ?? 0)
  if (kind === 'purchase') {
    const game = mocks[`/games/${body.gameId}`]?.body as { packages?: Pkg[] } | undefined
    const pkg = game?.packages?.find((p) => p.id === body.packageId)
    if (!pkg) return json({ code: 'CATALOG_PACKAGE_NOT_FOUND', message: 'Paket topilmadi' }, 404)
    amount = pkg.price
  }
  const isBalance = body.method === 'balance'
  if (isBalance) {
    if (me.balance < amount) return json({ code: 'PAYMENTS_INSUFFICIENT_BALANCE', message: "Balans yetarli emas" }, 400)
    me.balance -= amount
  }
  const now = new Date()
  const payment: Payment = {
    id: crypto.randomUUID(),
    orderNo: nextOrderNo++,
    userId: me.id,
    kind,
    status: isBalance ? 'completed' : 'pending_review',
    method: String(body.method),
    amount,
    matchAmount: isBalance ? null : Math.floor(amount / 100) * 100 + 10 + Math.floor(Math.random() * 90),
    gameId: (body.gameId as string) ?? null,
    packageId: (body.packageId as string) ?? null,
    playerInfo: body.playerInfo ?? null,
    hasReceipt: false,
    receiptUrl: null,
    rejectReason: null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
    supplierStatus: null,
    supplierDetails: null,
    supplierError: null,
  }
  byId.set(payment.id, payment)
  mine.unshift(payment)
  return json(payment, 201)
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  // Faqat ilovaning o'z API so'rovlari (nisbiy yo'l) ushlanadi; shriftlar va h.k. odatdagidek.
  if (!url.startsWith('/')) return realFetch(input, init)

  const path = url.split('?')[0]
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {}
  await new Promise((r) => setTimeout(r, 150)) // tarmoq kechikishiga o'xshatish

  if (method === 'GET' && mocks[path]) return json(mocks[path].body, mocks[path].status)
  if (path === '/admin/ping') return json({ code: 'AUTH_NOT_ADMIN', message: 'Admin emas' }, 403)
  if (/^\/games\/[^/]+\/verify-player$/.test(path)) return json({ supported: true, found: true, nickname: 'DemoPlayer' })
  if (path === '/payments/purchase' && method === 'POST') return createPayment('purchase', body)
  if (path === '/payments/topup' && method === 'POST') return createPayment('topup', body)

  const receipt = /^\/payments\/([^/]+)\/receipt$/.exec(path)
  if (receipt) {
    const p = byId.get(receipt[1])
    if (!p) return json({ code: 'PAYMENTS_NOT_FOUND', message: 'Topilmadi' }, 404)
    p.hasReceipt = true
    return json(p)
  }
  const one = /^\/payments\/([^/]+)$/.exec(path)
  if (one && method === 'GET') {
    const p = byId.get(one[1])
    return p ? json(p) : json({ code: 'PAYMENTS_NOT_FOUND', message: 'Topilmadi' }, 404)
  }
  if (path === '/promo-codes/redeem') return json({ code: 'PROMO_CODE_NOT_FOUND', message: 'Demo rejimida promokod ishlamaydi' }, 404)

  return json({ code: 'DEMO', message: 'Demo rejimida mavjud emas' }, 404)
}

// ---------- "DEMO" belgisi ----------
const ribbon = document.createElement('div')
ribbon.textContent = "DEMO · to'lovlar haqiqiy emas"
ribbon.setAttribute(
  'style',
  'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;background:#ffb020;color:#1a1200;' +
    'font:700 11px/1 system-ui,sans-serif;padding:5px 10px;border-radius:0 0 8px 8px;letter-spacing:.02em;pointer-events:none'
)
document.body.appendChild(ribbon)

void import('../main')
