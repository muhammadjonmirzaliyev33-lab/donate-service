import {
  Clock,
  ClipboardList,
  BarChart3,
  Users,
  Gamepad2,
  Package,
  CreditCard,
  Ticket,
  Megaphone,
  Settings,
  type LucideIcon
} from 'lucide-react'

export type TabId = 'queue' | 'history' | 'stats' | 'users' | 'catalog' | 'stock' | 'cards' | 'promo' | 'broadcast' | 'settings'

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'queue', label: 'Navbat', icon: Clock },
  { id: 'history', label: 'Tarix', icon: ClipboardList },
  { id: 'stats', label: 'Statistika', icon: BarChart3 },
  { id: 'users', label: 'Foydalanuvchilar', icon: Users },
  { id: 'catalog', label: 'Katalog', icon: Gamepad2 },
  { id: 'stock', label: 'Zaxira', icon: Package },
  { id: 'cards', label: 'Kartalar', icon: CreditCard },
  { id: 'promo', label: 'Promokodlar', icon: Ticket },
  { id: 'broadcast', label: 'Xabar yuborish', icon: Megaphone },
  { id: 'settings', label: 'Sozlamalar', icon: Settings }
]
