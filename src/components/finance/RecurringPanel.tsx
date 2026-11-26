import { useCallback, useState, type FormEvent } from 'react'
import Select, { type SelectOption } from '../ui/Select'
import { useRequest } from '../../hooks/useRequest'
import { formatMoney, parseMoneyInput } from '../../lib/format'
import { ApiError } from '../../services/apiClient'
import {
  ACCOUNT_KIND_LABELS,
  financeApi,
  type Account,
  type Category,
  type RecurringItem,
} from '../../services/financeService'

type RecurringPanelProps = {
  month: string
  accounts: Account[]
  categories: Category[]
  onApplied: () => void
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

// Painel de contas fixas / lançamentos recorrentes (salário, aluguel, internet, streaming...).
function RecurringPanel({ month, accounts, categories, onApplied }: RecurringPanelProps) {
  const load = useCallback((signal: AbortSignal) => financeApi.recurring.list(month, signal), [month])
  const { data, error, reload } = useRequest(`recurring:${month}`, load)

  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('10')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState('')

  const selectedAccount = accounts.some((a) => a.id === accountId) ? accountId : (accounts[0]?.id ?? '')
  const filteredCategories = categories.filter((c) => c.kind === type)
  const selectedCategory = filteredCategories.some((c) => c.id === categoryId) ? categoryId : ''

  const accountOptions: SelectOption[] = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    meta: ACCOUNT_KIND_LABELS[a.kind],
  }))

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Sem categoria' },
    ...filteredCategories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
  ]

  const items = data ?? []
  const pendingCount = items.filter((i) => !i.appliedInMonth).length

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setFeedback('')

    if (!name.trim()) return setFormError('Informe o nome do lançamento fixo.')
    const amountCents = parseMoneyInput(amount)
    if (amountCents === null) return setFormError('Informe um valor maior que zero.')
    const day = Number.parseInt(dayOfMonth, 10)
    if (!Number.isFinite(day) || day < 1 || day > 31) return setFormError('Informe um dia entre 1 e 31.')
    if (!selectedAccount) return setFormError('Cadastre uma conta antes.')

    setBusy(true)
    try {
      await financeApi.recurring.create({
        name: name.trim(),
        type,
        amountCents,
        dayOfMonth: day,
        accountId: selectedAccount,
        categoryId: selectedCategory || null,
      })
      setName('')
      setAmount('')
      setShowForm(false)
      setFeedback('Lançamento fixo salvo! Você já pode aplicá-lo no mês.')
      reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível salvar o lançamento fixo.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleApplyAll() {
    setFormError('')
    setFeedback('')
    setBusy(true)
    try {
      const result = await financeApi.recurring.applyMonth(month)
      const label = result.applied === 1 ? '1 lançamento fixo gerado' : `${result.applied} lançamentos fixos gerados`
      setFeedback(`${label} para este mês.`)
      reload()
      onApplied()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível aplicar os lançamentos fixos.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleApplyOne(item: RecurringItem) {
    setFormError('')
    setFeedback('')
    setBusy(true)
    try {
      await financeApi.recurring.applyOne(item.id, month)
      setFeedback(`"${item.name}" lançado no mês.`)
      reload()
      onApplied()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível lançar este item.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item: RecurringItem) {
    if (!window.confirm(`Remover "${item.name}" dos lançamentos fixos?`)) return
    setFormError('')
    setFeedback('')
    setBusy(true)
    try {
      await financeApi.recurring.remove(item.id)
      reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível remover o item fixo.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Contas fixas e recorrentes</h2>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Cadastre salário, aluguel, internet e assinaturas uma vez e lance tudo no mês com 1 clique.
          </p>
        </div>
        <div className="workspace-actions">
          {pendingCount > 0 && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={handleApplyAll}>
              Lançar {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Fechar' : '+ Novo fixo'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="form" style={{ marginBottom: 20 }} onSubmit={handleCreate} noValidate>
          <div className="segmented" role="group" aria-label="Tipo de lançamento fixo">
            <button type="button" aria-pressed={type === 'expense'} onClick={() => setType('expense')}>
              Despesa fixa
            </button>
            <button type="button" aria-pressed={type === 'income'} onClick={() => setType('income')}>
              Receita fixa
            </button>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Descrição</span>
              <input
                maxLength={120}
                placeholder={type === 'expense' ? 'Ex.: Internet, Aluguel, Academia' : 'Ex.: Salário'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Valor (R$)</span>
              <input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="field">
              <span>Dia do mês</span>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <Select label="Conta" value={selectedAccount} options={accountOptions} onChange={setAccountId} />
            <Select label="Categoria" value={selectedCategory} options={categoryOptions} onChange={setCategoryId} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || accounts.length === 0}>
              Salvar lançamento fixo
            </button>
          </div>
        </form>
      )}

      {formError && <p className="form-error" role="alert" style={{ marginBottom: 12 }}>{formError}</p>}
      {feedback && <p className="form-success" role="status" style={{ marginBottom: 12 }}>{feedback}</p>}
      {error && !data && <p className="form-error">{error}</p>}

      {items.length === 0 ? (
        <p className="empty">Nenhum lançamento fixo cadastrado ainda.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id} className="list-item">
              {item.categoryColor && <span className="dot" style={{ background: item.categoryColor }} aria-hidden="true" />}
              <div className="list-item-main">
                <span className="list-item-title">{item.name}</span>
                <span className="list-item-meta">
                  Dia {String(item.dayOfMonth).padStart(2, '0')} · {item.accountName}
                  {item.categoryName ? ` · ${item.categoryName}` : ''}
                </span>
              </div>
              <span className={`list-item-amount ${item.type === 'income' ? 'tone-positive' : ''}`}>
                {item.type === 'income' ? '+' : '-'}{formatMoney(item.amountCents)}
              </span>
              {item.appliedInMonth ? (
                <span className="chip tone-positive">Lançado</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 34, padding: '0 10px', fontSize: 13 }}
                  disabled={busy}
                  onClick={() => handleApplyOne(item)}
                >
                  Lançar
                </button>
              )}
              <button
                type="button"
                className="btn btn-icon btn-danger"
                disabled={busy}
                aria-label={`Remover fixo ${item.name}`}
                onClick={() => handleDelete(item)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default RecurringPanel
