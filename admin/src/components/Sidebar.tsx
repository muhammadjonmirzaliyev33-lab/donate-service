import { X } from 'lucide-react'
import { TABS, type TabId } from '../lib/tabs'
import { getUsername } from '../lib/auth'

export function Sidebar({
  active,
  onSelect,
  onLogout,
  open,
  onClose
}: {
  active: TabId
  onSelect: (id: TabId) => void
  onLogout: () => void
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">UZDI Admin</div>
          <button className="sidebar-close" onClick={onClose} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`sidebar-link ${tab.id === active ? 'active' : ''}`}
                onClick={() => {
                  onSelect(tab.id)
                  onClose()
                }}
              >
                <Icon className="sidebar-link-icon" size={16} strokeWidth={2} />
                {tab.label}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{getUsername()}</div>
          <button className="btn btn-ghost" onClick={onLogout}>
            Chiqish
          </button>
        </div>
      </aside>
    </>
  )
}
