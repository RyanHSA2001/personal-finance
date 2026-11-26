import { useCallback, useEffect, useState } from 'react'
import AppBackground from './components/app/AppBackground'
import AppShell, { type AppView } from './components/app/AppShell'
import { AUTH_EXPIRED_EVENT } from './services/apiClient'
import {
  clearAccessToken,
  getIsAdmin,
  logout,
  refreshSession,
  subscribeAuthBroadcast,
} from './services/authService'
import AdminPage from './pages/AdminPage'
import CardsPage from './pages/CardsPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import OpenFinancePage from './pages/OpenFinancePage'
import RegistryPage from './pages/RegistryPage'
import TransactionsPage from './pages/TransactionsPage'

type AuthState = 'checking' | 'authenticated' | 'unauthenticated'

// Sem roteador: a tela atual fica no estado. Na abertura, tenta restaurar a sessão pelo cookie HttpOnly.
function App() {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [isAdmin, setIsAdmin] = useState(false)
  const [view, setView] = useState<AppView>('home')

  const handleAuthenticated = useCallback(() => {
    setIsAdmin(getIsAdmin())
    setAuthState('authenticated')
  }, [])

  useEffect(() => {
    let active = true

    refreshSession().then((session) => {
      if (!active) return
      setIsAdmin(Boolean(session?.isAdmin))
      setAuthState(session ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleExpired = () => {
      clearAccessToken()
      setIsAdmin(false)
      setView('home')
      setAuthState('unauthenticated')
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    const unsubscribeBroadcast = subscribeAuthBroadcast((type) => {
      if (type === 'logout') {
        handleExpired()
      } else if (type === 'login') {
        refreshSession().then((session) => {
          if (session) {
            setIsAdmin(Boolean(session.isAdmin))
            setAuthState('authenticated')
          }
        })
      }
    })

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
      unsubscribeBroadcast()
    }
  }, [])

  if (authState === 'checking') {
    return (
      <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <AppBackground />
        <p className="page-subtitle" style={{ position: 'relative', zIndex: 1 }}>
          Verificando sessão…
        </p>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  async function handleLogout() {
    await logout()
    setIsAdmin(false)
    setView('home')
    setAuthState('unauthenticated')
  }

  return (
    <AppShell view={view} isAdmin={isAdmin} onNavigate={setView} onLogout={handleLogout}>
      {view === 'home' && <HomePage onNavigate={setView} />}
      {view === 'transactions' && <TransactionsPage />}
      {view === 'cards' && <CardsPage onNavigate={setView} />}
      {view === 'open-finance' && <OpenFinancePage onNavigate={setView} />}
      {view === 'registry' && <RegistryPage />}
      {view === 'admin' && isAdmin && <AdminPage />}
    </AppShell>
  )
}

export default App
