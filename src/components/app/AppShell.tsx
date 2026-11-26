import { useRef, type ReactNode } from 'react'
import { useCardLight } from '../../hooks/useCardLight'
import '../../styles/app.css'
import AppBackground from './AppBackground'

export type AppView = 'home' | 'transactions' | 'cards' | 'open-finance' | 'registry'

type NavItem = {
  view: AppView
  label: string
  mobileLabel: string
  icon: ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    view: 'home',
    label: 'Início',
    mobileLabel: 'Início',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.5 12 3.5l8.5 7" />
        <path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5" />
      </svg>
    ),
  },
  {
    view: 'transactions',
    label: 'Lançamentos',
    mobileLabel: 'Extrato',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7h11" />
        <path d="m14 4 4 3-4 3" />
        <path d="M17 17H6" />
        <path d="m10 14-4 3 4 3" />
      </svg>
    ),
  },
  {
    view: 'cards',
    label: 'Cartões',
    mobileLabel: 'Cartões',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="M3 10h18" />
        <path d="M7 14.5h4" />
      </svg>
    ),
  },
  {
    view: 'open-finance',
    label: 'Open Finance',
    mobileLabel: 'Bancos',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 9.5 12 4.5l8.5 5" />
        <path d="M5.5 10v8" />
        <path d="M10 10v8" />
        <path d="M14 10v8" />
        <path d="M18.5 10v8" />
        <path d="M3.5 18.5h17" />
      </svg>
    ),
  },
  {
    view: 'registry',
    label: 'Cadastros',
    mobileLabel: 'Cadastros',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" />
      </svg>
    ),
  },
]

type AppShellProps = {
  view: AppView
  onNavigate: (view: AppView) => void
  onLogout: () => void
  children: ReactNode
}

// Moldura do aplicativo logado: fundo animado, cabeçalho desktop, barra inferior no mobile e área de conteúdo.
function AppShell({ view, onNavigate, onLogout, children }: AppShellProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useCardLight(rootRef)

  function handleSelect(nextView: AppView) {
    onNavigate(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app" ref={rootRef}>
      <AppBackground />

      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 17.5 9.2 12l3.6 3.2L20 7.5" />
              <path d="M14.8 7.5H20v5.2" />
            </svg>
          </span>
          <span>
            personal<span className="app-brand-highlight">control</span>
          </span>
        </div>

        <nav className="app-nav" aria-label="Principal">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              type="button"
              aria-current={view === item.view ? 'page' : undefined}
              onClick={() => handleSelect(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="btn btn-ghost app-logout-btn" onClick={onLogout}>
          Sair
        </button>
      </header>

      <main className="app-main">{children}</main>

      <nav className="app-tabbar" aria-label="Navegação móvel">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            type="button"
            className="app-tabbar-item"
            aria-current={view === item.view ? 'page' : undefined}
            onClick={() => handleSelect(item.view)}
          >
            <span className="app-tabbar-icon">{item.icon}</span>
            <span className="app-tabbar-label">{item.mobileLabel}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default AppShell
