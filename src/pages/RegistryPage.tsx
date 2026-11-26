import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
import Select, { type SelectOption } from '../components/ui/Select'
import { ApiError, AUTH_EXPIRED_EVENT, sessionApi } from '../services/apiClient'
import { clearAccessToken, notifyAuthBroadcast, type ActiveSession } from '../services/authService'
import { formatMoney, parseMoneyInput, parseSignedMoneyInput, currentMonth } from '../lib/format'
import { useRequest } from '../hooks/useRequest'
import {
  ACCOUNT_KIND_LABELS,
  financeApi,
  type AccountKind,
  type CategoryKind,
} from '../services/financeService'

// Cadastros: contas, categorias, orçamentos e controle de sessões ativas.
function RegistryPage() {
  const [categoriesVersion, setCategoriesVersion] = useState(0)
  const notifyCategoriesChanged = useCallback(() => setCategoriesVersion((version) => version + 1), [])

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadastros</h1>
          <p className="page-subtitle">Organize suas contas, categorias, limites de gasto e sessões ativas.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <AccountsPanel />
        <CategoriesPanel onChanged={notifyCategoriesChanged} />
      </div>

      <BudgetsPanel categoriesVersion={categoriesVersion} />
      <SessionsPanel />
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      {children}
    </section>
  )
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

// ---------- Contas ----------

const ACCOUNT_KIND_OPTIONS: SelectOption[] = (Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map((kind) => ({
  value: kind,
  label: ACCOUNT_KIND_LABELS[kind],
}))

function AccountsPanel() {
  const load = useCallback((signal: AbortSignal) => financeApi.accounts.list(signal), [])
  const { data, error, reload } = useRequest('accounts', load)

  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('checking')
  const [initialBalance, setInitialBalance] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!name.trim()) return setFormError('Informe o nome da conta.')

    const balance = initialBalance.trim() ? parseSignedMoneyInput(initialBalance) : 0
    if (balance === null) return setFormError('Saldo inicial inválido. Use vírgula para os centavos.')

    setSaving(true)
    try {
      await financeApi.accounts.create({ name: name.trim(), kind, initialBalanceCents: balance })
      setName('')
      setInitialBalance('')
      reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível criar a conta.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, accountName: string) {
    const confirmed = window.confirm(
      `Excluir a conta "${accountName}"? Todos os lançamentos dela também serão apagados. Essa ação não pode ser desfeita.`,
    )
    if (!confirmed) return

    try {
      await financeApi.accounts.remove(id)
      reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível excluir a conta.'))
    }
  }

  return (
    <Panel title="Contas">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <label className="field">
            <span>Nome</span>
            <input maxLength={80} placeholder="Ex.: Nubank, Carteira" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <Select label="Tipo" value={kind} options={ACCOUNT_KIND_OPTIONS} onChange={(value) => setKind(value as AccountKind)} />
          <label className="field">
            <span>Saldo inicial</span>
            <input inputMode="decimal" placeholder="0,00" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
          </label>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Adicionar conta
          </button>
        </div>
      </form>

      {error && !data && <p className="form-error">{error}</p>}
      <ul className="list" style={{ marginTop: 20 }}>
        {data?.length === 0 && <p className="empty">Nenhuma conta ainda.</p>}
        {data?.map((account) => (
          <li key={account.id} className="list-item">
            <div className="list-item-main">
              <span className="list-item-title">{account.name}</span>
              <span className="list-item-meta">{ACCOUNT_KIND_LABELS[account.kind]}</span>
            </div>
            <span className="list-item-amount">{formatMoney(account.balanceCents)}</span>
            <button
              type="button"
              className="btn btn-icon btn-danger"
              aria-label={`Excluir conta ${account.name}`}
              onClick={() => handleDelete(account.id, account.name)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// ---------- Categorias ----------

const CATEGORY_KIND_OPTIONS: SelectOption[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
]

function CategoriesPanel({ onChanged }: { onChanged: () => void }) {
  const load = useCallback((signal: AbortSignal) => financeApi.categories.list(signal), [])
  const { data, error, reload } = useRequest('categories', load)

  const [name, setName] = useState('')
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [color, setColor] = useState('#a78bfa')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!name.trim()) return setFormError('Informe o nome da categoria.')

    setSaving(true)
    try {
      await financeApi.categories.create({ name: name.trim(), kind, color })
      setName('')
      reload()
      onChanged()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível criar a categoria.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, categoryName: string) {
    const confirmed = window.confirm(
      `Excluir a categoria "${categoryName}"? Os lançamentos dela ficam sem categoria.`,
    )
    if (!confirmed) return

    try {
      await financeApi.categories.remove(id)
      reload()
      onChanged()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível excluir a categoria.'))
    }
  }

  const incomes = data?.filter((category) => category.kind === 'income') ?? []
  const expenses = data?.filter((category) => category.kind === 'expense') ?? []

  return (
    <Panel title="Categorias">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <label className="field">
            <span>Nome</span>
            <input maxLength={60} placeholder="Ex.: Academia" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <Select label="Tipo" value={kind} options={CATEGORY_KIND_OPTIONS} onChange={(value) => setKind(value as CategoryKind)} />
          <label className="field">
            <span>Cor</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Adicionar categoria
          </button>
        </div>
      </form>

      {error && !data && <p className="form-error">{error}</p>}

      {[
        { title: 'Despesas', items: expenses },
        { title: 'Receitas', items: incomes },
      ].map((group) => (
        <div key={group.title} style={{ marginTop: 20 }}>
          <span className="list-group-title">{group.title}</span>
          <ul className="list">
            {group.items.map((category) => (
              <li key={category.id} className="list-item">
                <span className="dot" style={{ background: category.color }} aria-hidden="true" />
                <span className="list-item-main">
                  <span className="list-item-title">{category.name}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-icon btn-danger"
                  aria-label={`Excluir categoria ${category.name}`}
                  onClick={() => handleDelete(category.id, category.name)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  )
}

// ---------- Orçamentos ----------

function BudgetsPanel({ categoriesVersion }: { categoriesVersion: number }) {
  const month = currentMonth()
  const loadBudgets = useCallback((signal: AbortSignal) => financeApi.budgets.list(month, signal), [month])
  const loadCategories = useCallback((signal: AbortSignal) => financeApi.categories.list(signal), [])

  const budgets = useRequest(`budgets:${month}:${categoriesVersion}`, loadBudgets)
  const categories = useRequest(`categories:${categoriesVersion}`, loadCategories)

  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const expenseCategories = categories.data?.filter((category) => category.kind === 'expense') ?? []
  const categoryOptions: SelectOption[] = expenseCategories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color,
  }))
  const selectedCategory = expenseCategories.some((category) => category.id === categoryId)
    ? categoryId
    : (expenseCategories[0]?.id ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const monthlyLimitCents = parseMoneyInput(limit)
    if (!selectedCategory) return setFormError('Crie uma categoria de despesa antes.')
    if (monthlyLimitCents === null) return setFormError('Informe um limite maior que zero.')

    setSaving(true)
    try {
      await financeApi.budgets.upsert({ categoryId: selectedCategory, monthlyLimitCents })
      setLimit('')
      budgets.reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível salvar o orçamento.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await financeApi.budgets.remove(id)
      budgets.reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível excluir o orçamento.'))
    }
  }

  return (
    <Panel title="Orçamentos mensais">
      <p className="page-subtitle">Defina quanto pode gastar por categoria. O progresso aparece na tela inicial.</p>

      <form className="form" style={{ marginTop: 20 }} onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <Select
            label="Categoria de despesa"
            value={selectedCategory}
            options={categoryOptions}
            placeholder="Sem categorias de despesa"
            onChange={setCategoryId}
          />
          <label className="field">
            <span>Limite mensal</span>
            <input inputMode="decimal" placeholder="0,00" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </label>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !selectedCategory}>
            Salvar limite
          </button>
        </div>
      </form>

      <ul className="list" style={{ marginTop: 20 }}>
        {budgets.data?.length === 0 && <p className="empty">Nenhum orçamento definido.</p>}
        {budgets.data?.map((budget) => (
          <li key={budget.id} className="list-item">
            <span className="dot" style={{ background: budget.categoryColor }} aria-hidden="true" />
            <div className="list-item-main">
              <span className="list-item-title">{budget.categoryName}</span>
              <span className="list-item-meta">
                Limite {formatMoney(budget.monthlyLimitCents)} · gasto {formatMoney(budget.spentCents)} no mês
              </span>
            </div>
            <button
              type="button"
              className="btn btn-icon btn-danger"
              aria-label={`Excluir orçamento de ${budget.categoryName}`}
              onClick={() => handleDelete(budget.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// ---------- Sessões ativas ----------

function describeDevice(userAgent: string): string {
  if (!userAgent) return 'Dispositivo desconhecido'

  const browser =
    /Edg\//i.test(userAgent) ? 'Edge'
      : /OPR\//i.test(userAgent) ? 'Opera'
        : /Chrome\//i.test(userAgent) ? 'Chrome'
          : /Firefox\//i.test(userAgent) ? 'Firefox'
            : /Safari\//i.test(userAgent) ? 'Safari'
              : 'Navegador'

  const os =
    /Windows/i.test(userAgent) ? 'Windows'
      : /Android/i.test(userAgent) ? 'Android'
        : /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS'
          : /Mac OS X/i.test(userAgent) ? 'macOS'
            : /Linux/i.test(userAgent) ? 'Linux'
              : 'Outro sistema'

  return `${browser} · ${os}`
}

function formatDateTime(isoUtc: string): string {
  const date = new Date(isoUtc)
  if (Number.isNaN(date.getTime())) return isoUtc
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SessionsPanel() {
  const load = useCallback((signal: AbortSignal) => sessionApi.list(signal), [])
  const { data, error, reload } = useRequest('sessions', load)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  const otherSessionsCount = data?.filter((session) => !session.isCurrent).length ?? 0

  async function handleRevoke(session: ActiveSession) {
    if (session.isCurrent) {
      const confirmed = window.confirm('Encerrar esta sessão atual? Você será desconectado.')
      if (!confirmed) return
    }

    setActionError('')
    setBusy(true)
    try {
      await sessionApi.revoke(session.id)
      if (session.isCurrent) {
        clearAccessToken()
        notifyAuthBroadcast('logout')
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
      } else {
        reload()
      }
    } catch (caught) {
      setActionError(errorMessage(caught, 'Não foi possível encerrar a sessão.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleLogoutOthers() {
    const confirmed = window.confirm('Encerrar todas as outras sessões ativas em outros dispositivos?')
    if (!confirmed) return

    setActionError('')
    setBusy(true)
    try {
      await sessionApi.logoutAll(true)
      reload()
    } catch (caught) {
      setActionError(errorMessage(caught, 'Não foi possível encerrar as outras sessões.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleLogoutAll() {
    const confirmed = window.confirm('Sair de todos os dispositivos, incluindo este agora?')
    if (!confirmed) return

    setActionError('')
    setBusy(true)
    try {
      await sessionApi.logoutAll(false)
    } catch (caught) {
      setActionError(errorMessage(caught, 'Não foi possível encerrar todas as sessões.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Sessões ativas">
      <p className="page-subtitle">
        Dispositivos conectados à sua conta. Você pode encerrar sessões remotamente a qualquer momento.
      </p>

      <div className="form-actions" style={{ marginTop: 16, gap: 10, flexWrap: 'wrap' }}>
        {otherSessionsCount > 0 && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={handleLogoutOthers}>
            Encerrar outras sessões ({otherSessionsCount})
          </button>
        )}
        <button type="button" className="btn btn-danger" disabled={busy} onClick={handleLogoutAll}>
          Sair de todos os dispositivos
        </button>
      </div>

      {(actionError || (error && !data)) && (
        <p className="form-error" role="alert" style={{ marginTop: 12 }}>
          {actionError || error}
        </p>
      )}

      <ul className="list" style={{ marginTop: 20 }}>
        {data?.length === 0 && <p className="empty">Nenhuma sessão ativa encontrada.</p>}
        {data?.map((session) => (
          <li key={session.id} className="list-item">
            <div className="list-item-main">
              <span className="list-item-title">
                {describeDevice(session.userAgent)}
                {session.isCurrent ? ' (Sessão atual)' : ''}
              </span>
              <span className="list-item-meta">
                {session.ipAddress ? `IP ${session.ipAddress} · ` : ''}
                Último uso: {formatDateTime(session.lastUsedAtUtc)} · Criada em: {formatDateTime(session.createdAtUtc)}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => handleRevoke(session)}
            >
              Encerrar
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export default RegistryPage
