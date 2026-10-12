export interface Package {
  id: string
  label: string // "50+50", "5", "1320 UC"
  amount: number // base units (diamonds/UC/etc)
  bonus?: number
  price: number // so'm
  badge?: 'x2' | 'top' | null
  group?: string // filter group: "Olmoslar" | "Propusklar" | "UC" | "Prime" ...
}

export interface Game {
  id: string
  name: string
  category: string // subtitle e.g. "Olmoslar / Diamonds"
  emoji: string
  gradient: string // css gradient for the tile art
  regions?: string[]
  filters?: string[] // e.g. ["Barchasi","Olmoslar","Propusklar"]
  requiresServer?: boolean
  packages: Package[]
}

export type OrderStatus = 'completed' | 'pending' | 'cancelled'
export type PayMethod = 'balance' | 'card' | 'atm' | 'foreign'

export interface Order {
  id: string
  gameId: string
  gameName: string
  packageLabel: string
  playerId?: string
  server?: string
  price: number
  method: PayMethod
  status: OrderStatus
  createdAt: number
}

export interface SavedId {
  playerId: string
  server?: string
  region?: string
}

export interface TopUpTx {
  id: string
  amount: number
  method: PayMethod
  status: OrderStatus
  createdAt: number
}

export interface AppState {
  balance: number
  cashback: number
  phone: string | null
  username: string
  handle: string
  userId: string
  language: 'uz' | 'ru'
  theme: 'dark' | 'light'
  savedIds: Record<string, SavedId>
  orders: Order[]
  topups: TopUpTx[]
}
