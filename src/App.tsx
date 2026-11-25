import { useCallback, useEffect, useState } from 'react'
import AppShell, { type AppView } from './components/app/AppShell'
import { AUTH_EXPIRED_EVENT } from './services/apiClient'
import { clearStoredToken, getStoredToken } from './services/authService'
import CardsPage from './pages/CardsPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import OpenFinancePage from './pages/OpenFinancePage'
import RegistryPage from './pages/RegistryPage'
import TransactionsPage from './pages/TransactionsPage'

// Sem roteador: a tela atual fica no estado. Sem token (ou com sessão expirada), mostra o login.
function App() {
  const [authenticated, setAuthenticated] = useState(() => getStoredToken() !== null)
  const [view, setView] = useState<AppView>('home')

  const handleAuthenticated = useCallback(() => setAuthenticated(true), [])

  useEffect(() => {
    const handleExpired = () => setAuthenticated(false)
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [])

  if (!authenticated) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  function handleLogout() {
    clearStoredToken()
    setView('home')
    setAuthenticated(false)
  }

  return (
    <AppShell view={view} onNavigate={setView} onLogout={handleLogout}>
      {view === 'home' && <HomePage onNavigate={setView} />}
      {view === 'transactions' && <TransactionsPage />}
      {view === 'cards' && <CardsPage onNavigate={setView} />}
      {view === 'open-finance' && <OpenFinancePage onNavigate={setView} />}
      {view === 'registry' && <RegistryPage />}
    </AppShell>
  )
}

export default App
