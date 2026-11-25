import { useRef, type ReactNode } from 'react'
import { useCardLight } from '../../hooks/useCardLight'
import '../../styles/app.css'
import AppBackground from './AppBackground'

export type AppView = 'home' | 'transactions' | 'cards' | 'open-finance' | 'registry'

const NAV_ITEMS: { view: AppView; label: string }[] = [
  { view: 'home', label: 'Início' },
  { view: 'transactions', label: 'Lançamentos' },
  { view: 'cards', label: 'Cartões' },
  { view: 'open-finance', label: 'Open Finance' },
  { view: 'registry', label: 'Cadastros' },
]

type AppShellProps = {
  view: AppView
  onNavigate: (view: AppView) => void
  onLogout: () => void
  children: ReactNode
}

// Moldura do aplicativo logado: fundo animado, cabeçalho com navegação e área de conteúdo.
function AppShell({ view, onNavigate, onLogout, children }: AppShellProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useCardLight(rootRef)

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
              onClick={() => onNavigate(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="btn btn-ghost" onClick={onLogout}>
          Sair
        </button>
      </header>

      <main className="app-main">{children}</main>
    </div>
  )
}

export default AppShell
