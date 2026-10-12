import { useEffect, useRef, useState } from 'react'
import { clearUsername, setUsername } from './lib/auth'
import { logout as apiLogout, refresh, setUnauthorizedHandler } from './lib/api'
import { ToastProvider } from './components/Toast'
import { Sidebar } from './components/Sidebar'
import { MobileTopBar } from './components/MobileTopBar'
import { LoginPage } from './pages/LoginPage'
import { QueuePage } from './pages/QueuePage'
import { HistoryPage } from './pages/HistoryPage'
import { StatsPage } from './pages/StatsPage'
import { UsersPage } from './pages/UsersPage'
import { CatalogPage } from './pages/CatalogPage'
import { StockPage } from './pages/StockPage'
import { CardsPage } from './pages/CardsPage'
import { PromoPage } from './pages/PromoPage'
import { BroadcastPage } from './pages/BroadcastPage'
import { BroadcastHistoryPage } from './pages/BroadcastHistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import type { TabId } from './lib/tabs'

const REFRESH_INTERVAL_MS = 14 * 60 * 1000

type AuthState = 'checking' | 'in' | 'out'

function AdminApp() {
  const [auth, setAuth] = useState<AuthState>('checking')
  const [tab, setTab] = useState<TabId>('queue')
  const [menuOpen, setMenuOpen] = useState(false)
  const [broadcastHistory, setBroadcastHistory] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearUsername()
      setAuth('out')
    })
    // Access token httpOnly cookie'da — sahifa qayta ochilganda haliyam amaldami yo'qmi
    // bilib bo'lmaydi, shu sabab har mount'da bitta marta refresh chaqirib tekshiramiz
    // (refresh cookie hali amalda bo'lsa yangi access token beriladi, aks holda 401).
    refresh()
      .then(({ username }) => {
        setUsername(username)
        setAuth('in')
      })
      .catch(() => {
        clearUsername()
        setAuth('out')
      })
  }, [])

  useEffect(() => {
    if (auth !== 'in') return
    intervalRef.current = window.setInterval(() => {
      refresh().catch(() => {
        clearUsername()
        setAuth('out')
      })
    }, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [auth])

  if (auth === 'checking') {
    return <div className="login-screen" />
  }

  if (auth === 'out') {
    return (
      <LoginPage
        onLoggedIn={(username) => {
          setUsername(username)
          setAuth('in')
        }}
      />
    )
  }

  async function logout() {
    try {
      await apiLogout()
    } finally {
      clearUsername()
      setAuth('out')
    }
  }

  return (
    <div className="admin-shell">
      <MobileTopBar onOpenMenu={() => setMenuOpen(true)} />
      <Sidebar
        active={tab}
        onSelect={(id) => {
          setTab(id)
          setBroadcastHistory(false)
        }}
        onLogout={logout}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <main className="admin-content">
        {tab === 'queue' && <QueuePage />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'stats' && <StatsPage />}
        {tab === 'users' && <UsersPage />}
        {tab === 'catalog' && <CatalogPage />}
        {tab === 'stock' && <StockPage />}
        {tab === 'cards' && <CardsPage />}
        {tab === 'promo' && <PromoPage />}
        {tab === 'broadcast' &&
          (broadcastHistory ? (
            <BroadcastHistoryPage onBack={() => setBroadcastHistory(false)} />
          ) : (
            <BroadcastPage onViewHistory={() => setBroadcastHistory(true)} />
          ))}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AdminApp />
    </ToastProvider>
  )
}
