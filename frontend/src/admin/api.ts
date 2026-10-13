import { getInitData } from '../telegram'

// VITE_API_URL berilmasa: dev'da lokal backend, prod'da shu domenning o'zi (backend Mini App'ni o'zi beradi).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || (import.meta.env.DEV ? 'http://localhost:8080' : '')

export interface ApiErrorBody {
  statusCode: number
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      'x-telegram-init-data': getInitData(),
      ...options.headers
    }
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(body?.code ?? 'UNKNOWN', body?.message ?? `HTTP ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ---------- Ruxsat tekshiruvi ----------

/** Joriy foydalanuvchi admin ekanini tekshiradi — pastki menyuda Admin tugmasini ko'rsatish/yashirish uchun. */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    await request('/admin/ping')
    return true
  } catch {
    return false
  }
}

// ---------- Statistika ----------

export interface OverviewDto {
  totalUsers: number
  completedCount: number
  totalRevenue: number
  todayRevenue: number
  weekRevenue: number
  pendingCount: number
  cancelledCount: number
}

export interface TopGameDto {
  gameId: string
  name: string
  orders: number
  revenue: number
  unitsSold: number
}

export interface LowStockDto {
  gameId: string
  name: string
  balance: number
}

export function getOverview() {
  return request<OverviewDto>('/admin/stats/overview')
}

export function getTopGames(days = 7) {
  return request<TopGameDto[]>(`/admin/stats/top-games?days=${days}`)
}

export function getLowStock() {
  return request<LowStockDto[]>('/admin/stats/low-stock')
}

// ---------- To'lovlar navbati ----------

export interface PaymentDto {
  id: string
  orderNo: number
  userId: string
  kind: 'purchase' | 'topup'
  status: 'pending_review' | 'completed' | 'cancelled' | 'expired'
  method: 'card' | 'atm' | 'foreign' | 'balance'
  amount: number
  matchAmount: number | null
  gameId: string | null
  packageId: string | null
  playerInfo: Record<string, string> | null
  receiptUrl: string | null
  createdAt: string
  expiresAt: string | null
  userTelegramId: string
  username: string | null
  firstName: string | null
  gameName: string | null
  packageLabel: string | null
  decidedAt: string
  rejectReason: string | null
  decidedBySms: boolean
  supplierStatus: 'processing' | 'completed' | 'failed' | null
  supplierError: string | null
}

export function getPendingPayments() {
  return request<PaymentDto[]>('/admin/payments/pending')
}

/** Buyurtmalar tarixi — kim, qachon, nima olgani (hal qilingan to'lovlar). */
export function getPaymentHistory() {
  return request<PaymentDto[]>('/admin/payments/history')
}

export function approvePayment(id: string) {
  return request<PaymentDto>(`/admin/payments/${id}/approve`, { method: 'POST' })
}

export function rejectPayment(id: string) {
  return request<PaymentDto>(`/admin/payments/${id}/reject`, { method: 'POST' })
}

/** Admin xato bosgan holat uchun — hal qilingan to'lovni yana kutilmoqda holatiga qaytaradi. */
export function undoPayment(id: string) {
  return request<PaymentDto>(`/admin/payments/${id}/undo`, { method: 'POST' })
}

// ---------- Zaxira ----------

export interface GameStockDto {
  gameId: string
  balance: number
  updatedAt: string
}

export function getStockBalances() {
  return request<GameStockDto[]>('/admin/stock')
}

export function depositStock(gameId: string, amount: number, note?: string) {
  return request<GameStockDto>(`/admin/stock/${gameId}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount, note })
  })
}

export interface StockMovementDto {
  id: string
  gameId: string
  kind: 'deposit' | 'sale' | 'adjustment'
  amount: number
  note: string | null
  paymentId: string | null
  createdBy: string | null
  createdAt: string
}

export function getStockMovements(gameId: string, limit = 30) {
  return request<StockMovementDto[]>(`/admin/stock/${gameId}/movements?limit=${limit}`)
}

// ---------- Foydalanuvchilar ----------

export interface AdminUserDto {
  id: string
  telegramId: string
  username: string | null
  firstName: string | null
  phone: string | null
  language: 'uz' | 'ru'
  balance: number
  cashback: number
  ordersCount: number
  totalSpent: number
  createdAt: string
}

export function getUsers() {
  return request<AdminUserDto[]>('/admin/users')
}

// ---------- Katalog (o'yin/paket boshqaruvi) ----------

export interface ServerOption {
  label: string
  value: string
}

export interface AdminGameDto {
  id: string
  name: string
  category: string
  currencyName: string
  gradient: string
  icon: string | null
  requiresServer: boolean
  serverOptions: ServerOption[] | null
  sortOrder: number
  isActive: boolean
  /** paycore: kategoriya slug'i · moogold: product_id · coindrop: game_key */
  supplierCategory: string | null
  supplierProvider: 'paycore' | 'moogold' | 'coindrop'
  /** Faqat moogold: 1 = direct top-up, 2 = eVoucher. */
  supplierOrderCategory: number | null
}

export interface AdminPackageDto {
  id: string
  gameId: string
  label: string
  amount: number
  bonus: number | null
  price: number
  badge: 'x2' | 'top' | null
  groupName: string
  sortOrder: number
  isActive: boolean
  supplierSlug: string | null
  extraQty: number | null
}

export interface AdminGameWithPackagesDto extends AdminGameDto {
  packages: AdminPackageDto[]
}

export function getAdminGames() {
  return request<AdminGameDto[]>('/admin/games')
}

export function getAdminGame(gameId: string) {
  return request<AdminGameWithPackagesDto>(`/admin/games/${gameId}`)
}

export interface CreateGameInput {
  id: string
  name: string
  category?: string
  currencyName: string
  gradient?: string
  requiresServer?: boolean
  isActive?: boolean
  sortOrder?: number
  supplierCategory?: string | null
  supplierProvider?: 'paycore' | 'moogold' | 'coindrop'
  supplierOrderCategory?: number | null
}

export function createGame(input: CreateGameInput) {
  return request<AdminGameDto>('/admin/games', { method: 'POST', body: JSON.stringify(input) })
}

export function updateGame(gameId: string, input: Partial<CreateGameInput>) {
  return request<AdminGameDto>(`/admin/games/${gameId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteGame(gameId: string) {
  return request<void>(`/admin/games/${gameId}`, { method: 'DELETE' })
}

/** O'yin muqovasi rasmini yuklaydi (ixtiyoriy) — natijada icon maydoniga URL yoziladi. */
export function uploadGameImage(gameId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<AdminGameDto>(`/admin/games/${gameId}/image`, { method: 'POST', body: form })
}

export interface CreatePackageInput {
  label: string
  amount: number
  bonus?: number | null
  price: number
  badge?: 'x2' | 'top' | null
  groupName?: string
  isActive?: boolean
  supplierSlug?: string | null
  extraQty?: number | null
}

export function createPackage(gameId: string, input: CreatePackageInput) {
  return request<AdminPackageDto>(`/admin/games/${gameId}/packages`, { method: 'POST', body: JSON.stringify(input) })
}

export function updatePackage(packageId: string, input: Partial<CreatePackageInput>) {
  return request<AdminPackageDto>(`/admin/games/packages/${packageId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deletePackage(packageId: string) {
  return request<void>(`/admin/games/packages/${packageId}`, { method: 'DELETE' })
}

// ---------- PayCore supplier (avtomatik yetkazish) ----------

export interface SupplierAccountDto {
  enabled: boolean
  id?: number
  balance?: string
  currency?: string
  username?: string
  error?: string
}

export interface SupplierCategoryDto {
  slug: string
  title: string
}

export interface SupplierProductDto {
  id: number
  category: string
  slug: string
  denomination?: number
  title: string
  price_usdt: string
  in_stock: number
  enabled: boolean
}

export function getSupplierAccount() {
  return request<SupplierAccountDto>('/admin/supplier/account')
}

export function getSupplierCategories() {
  return request<{ categories: SupplierCategoryDto[] }>('/admin/supplier/categories')
}

export function getSupplierCatalog(category: string) {
  return request<{ products: SupplierProductDto[] }>(`/admin/supplier/catalog?category=${encodeURIComponent(category)}`)
}

// ---------- MooGold supplier ----------

/** MooGold kategoriyalari hujjatda qat'iy ro'yxat sifatida berilgan (API orqali olinmaydi). */
export const MOOGOLD_CATEGORIES: { id: number; title: string }[] = [
  { id: 50, title: 'Direct top-up (o\'yinlar)' },
  { id: 51, title: 'Other Gift Cards' },
  { id: 3563, title: 'Roblox' },
  { id: 993, title: 'Steam' },
  { id: 538, title: 'Google Play' },
  { id: 765, title: 'PSN' },
  { id: 874, title: 'Netflix' },
  { id: 992, title: 'Spotify' },
  { id: 451, title: 'Razer Gold' },
  { id: 1223, title: 'League of Legends' },
  { id: 1261, title: 'Riot Access Code' },
  { id: 2377, title: 'Apex Legends' },
  { id: 3154, title: 'XBox Gift Card' },
  { id: 3737, title: 'Nintendo Gift Card' }
]

export interface MoogoldProductDto {
  ID: string
  post_title: string
}

export interface MoogoldVariationDto {
  variation_name: string
  variation_id: number
  variation_price: number
  stock_status: string
}

export function getMoogoldAccount() {
  return request<SupplierAccountDto>('/admin/supplier/moogold/account')
}

export function getMoogoldProducts(categoryId: number) {
  return request<{ products: MoogoldProductDto[] }>(`/admin/supplier/moogold/products?categoryId=${categoryId}`)
}

export function getMoogoldVariations(productId: string) {
  return request<{ name?: string; variations: MoogoldVariationDto[] }>(
    `/admin/supplier/moogold/product?productId=${encodeURIComponent(productId)}`
  )
}

// ---------- CoinDrop supplier ----------

export interface CoinDropGameDto {
  key: string
  name: string
  category?: string
  id_type: 'numeric' | 'text'
  id_label: string
  amount_based: boolean
  requires_server: boolean
  server_label?: string
  has_validator: boolean
}

export interface CoinDropProductDto {
  id: string
  name: string
  amount: number | null
  price_usd: number
  price_uzs: number
  retail_usd: number
  retail_uzs: number
}

export function getCoinDropAccount() {
  return request<SupplierAccountDto>('/admin/supplier/coindrop/account')
}

export function getCoinDropGames() {
  return request<{ games: CoinDropGameDto[] }>('/admin/supplier/coindrop/games')
}

export function getCoinDropProducts(gameKey: string) {
  return request<{ products: CoinDropProductDto[] }>(`/admin/supplier/coindrop/products?gameKey=${encodeURIComponent(gameKey)}`)
}

// ---------- To'lov kartalari ----------

export interface AdminPaymentCardDto {
  id: string
  bankName: string
  cardNumber: string
  holderName: string
  isActive: boolean
  sortOrder: number
}

export interface CreatePaymentCardInput {
  bankName: string
  cardNumber: string
  holderName: string
  isActive?: boolean
}

export function getAdminPaymentCards() {
  return request<AdminPaymentCardDto[]>('/admin/payment-cards')
}

export function createPaymentCard(input: CreatePaymentCardInput) {
  return request<AdminPaymentCardDto>('/admin/payment-cards', { method: 'POST', body: JSON.stringify(input) })
}

export function updatePaymentCard(id: string, input: Partial<CreatePaymentCardInput>) {
  return request<AdminPaymentCardDto>(`/admin/payment-cards/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deletePaymentCard(id: string) {
  return request<void>(`/admin/payment-cards/${id}`, { method: 'DELETE' })
}

// ---------- Sozlamalar ----------

export interface AdminSettingsDto {
  averageProcessingMinutes: number
  supportUsername: string | null
  channelUrl: string | null
  referralFixedBonus: number
  referralPercent: number
  profileName: string | null
  profileHandle: string | null
  profileId: string | null
}

export function updateSettings(input: Partial<AdminSettingsDto>) {
  return request<AdminSettingsDto>('/admin/settings', { method: 'PATCH', body: JSON.stringify(input) })
}

/** Admin panel sozlamalarni admin endpointidan o'qiydi (`GET /settings` endi Mini App initData'sini talab qiladi). */
export function getAdminSettings() {
  return request<AdminSettingsDto>('/admin/settings')
}

// ---------- Broadcast ----------

export interface BroadcastMessageDto {
  id: string
  message: string
  imageUrls: string[]
  status: 'sending' | 'sent' | 'failed'
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdByUsername: string | null
  createdAt: string
  finishedAt: string | null
}

export function sendBroadcast(message: string, images: File[]) {
  const form = new FormData()
  form.append('message', message)
  images.forEach((file) => form.append('images', file))
  return request<{ id: string; started: boolean }>('/admin/broadcast', { method: 'POST', body: form })
}

export function getBroadcastHistory() {
  return request<BroadcastMessageDto[]>('/admin/broadcast/history')
}

// ---------- Promokodlar ----------

export interface AdminPromoCodeDto {
  id: string
  code: string
  bonusAmount: number
  expiresAt: string | null
  isActive: boolean
  redemptionsCount: number
  createdAt: string
}

export interface CreatePromoCodeInput {
  code: string
  bonusAmount: number
  expiresAt?: string | null
}

export function getAdminPromoCodes() {
  return request<AdminPromoCodeDto[]>('/admin/promo-codes')
}

export function createPromoCode(input: CreatePromoCodeInput) {
  return request<AdminPromoCodeDto>('/admin/promo-codes', { method: 'POST', body: JSON.stringify(input) })
}

export function updatePromoCode(id: string, input: Partial<{ isActive: boolean; expiresAt: string | null; bonusAmount: number }>) {
  return request<AdminPromoCodeDto>(`/admin/promo-codes/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deletePromoCode(id: string) {
  return request<void>(`/admin/promo-codes/${id}`, { method: 'DELETE' })
}
