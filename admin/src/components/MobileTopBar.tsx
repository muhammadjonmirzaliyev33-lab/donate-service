import { Menu } from 'lucide-react'

export function MobileTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div className="mobile-topbar">
      <button className="mobile-menu-btn" onClick={onOpenMenu} aria-label="Menyu">
        <Menu size={20} />
      </button>
      <div className="mobile-topbar-brand">UZDI Admin</div>
    </div>
  )
}
