import { getInitData } from './telegram'

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
    const code = body?.code ?? 'UNKNOWN'
    if (code === 'AUTH_PHONE_NOT_SHARED') window.dispatchEvent(new CustomEvent('phone-required'))
    throw new ApiError(code, body?.message ?? `HTTP ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ---------- Foydalanuvchi ----------

export interface MeDto {
  id: string
  telegramId: string
  username: string | null
  firstName: string | null
  phone: string | null
  language: 'uz' | 'ru'
  balance: number
  cashback: number
}

export function getMe() {
  return request<MeDto>('/users/me')
}

export interface ReferralInvitedDto {
  username: string | null
  firstName: string | null
  rewarded: boolean
  createdAt: string
}

export interface ReferralSummaryDto {
  link: string | null
  invitedCount: number
  totalEarned: number
  invited: ReferralInvitedDto[]
}

export function getMyReferrals() {
  return request<ReferralSummaryDto>('/users/me/referrals')
}

// ---------- Reyting ----------

export interface RatingEntryDto {
  rank: number
  displayName: string
  totalAmount: number
  isMe: boolean
}

export interface RatingResponseDto {
  top: RatingEntryDto[]
  me: RatingEntryDto | null
}

export function getRating() {
  return request<RatingResponseDto>('/rating')
}

// ---------- Promokod ----------

export interface RedeemResultDto {
  bonusAmount: number
  balance: number
}

export function redeemPromoCode(code: string) {
  return request<RedeemResultDto>('/promo-codes/redeem', { method: 'POST', body: JSON.stringify({ code }) })
}

// ---------- Katalog (o'yinlar/paketlar) ----------

export interface GameDto {
  id: string
  name: string
  category: string
  currencyName: string
  gradient: string
  icon: string | null
  requiresServer: boolean
  serverOptions: { label: string; value: string }[] | null
  sortOrder: number
  isActive: boolean
  /** Qanday identifikator so'ralishi — serverda hisoblanadi (ichki supplier sozlamalari frontendga chiqmaydi). */
  playerIdKind: 'numeric' | 'username' | 'none'
}

export interface PackageDto {
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
  icon: string | null
}

export interface GameWithPackagesDto extends GameDto {
  packages: PackageDto[]
}

export function getGames() {
  return request<GameDto[]>('/games')
}

export function getGameDetail(gameId: string) {
  return request<GameWithPackagesDto>(`/games/${gameId}`)
}

export interface VerifyPlayerResult {
  supported: boolean
  found: boolean
  nickname?: string
  alreadyPremium?: boolean
}

/** Xarid oldidan playerId'ni real tekshiradi (o'yin PayCore'ga bog'langan bo'lsa). */
export function verifyPlayer(gameId: string, playerId: string, server?: string) {
  return request<VerifyPlayerResult>(`/games/${gameId}/verify-player`, {
    method: 'POST',
    body: JSON.stringify({ playerId, server })
  })
}

// ---------- To'lov kartalari / sozlamalar ----------

export interface PaymentCardDto {
  id: string
  bankName: string
  cardNumber: string
  holderName: string
}

export function getPaymentCards() {
  return request<PaymentCardDto[]>('/payment-cards')
}

export interface SettingsDto {
  averageProcessingMinutes: number
  supportUsername: string | null
  channelUrl: string | null
  referralFixedBonus: number
  referralPercent: number
}

export function getSettings() {
  return request<SettingsDto>('/settings')
}

// ---------- To'lovlar ----------

export type PayMethod = 'card' | 'atm' | 'foreign' | 'balance'

export interface PaymentDto {
  id: string
  orderNo: number
  userId: string
  kind: 'purchase' | 'topup'
  status: 'pending_review' | 'completed' | 'cancelled' | 'expired'
  method: PayMethod
  amount: number
  matchAmount: number | null
  gameId: string | null
  packageId: string | null
  playerInfo: Record<string, string> | null
  hasReceipt: boolean
  rejectReason: string | null
  createdAt: string
  expiresAt: string | null
  gameName?: string | null
  packageLabel?: string | null
}

export function createTopupPayment(amount: number, method: Exclude<PayMethod, 'balance'>) {
  return request<PaymentDto>('/payments/topup', { method: 'POST', body: JSON.stringify({ amount, method }) })
}

export function createPurchasePayment(params: {
  gameId: string
  packageId: string
  method: PayMethod
  playerInfo: Record<string, string>
}) {
  return request<PaymentDto>('/payments/purchase', { method: 'POST', body: JSON.stringify(params) })
}

export function getPayment(id: string) {
  return request<PaymentDto>(`/payments/${id}`)
}

export function getMyPayments() {
  return request<PaymentDto[]>('/payments/mine')
}

export function uploadReceipt(paymentId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<PaymentDto>(`/payments/${paymentId}/receipt`, { method: 'POST', body: form })
}

// ---------- Bannerlar ----------

export interface BannerDto {
  id: string
  imageUrl: string
  link: string | null
  sortOrder: number
  isActive: boolean
}

export function getBanners() {
  return request<BannerDto[]>('/banners')
}
