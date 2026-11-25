import { useCallback, useState, type FormEvent } from 'react'
import MonthPicker from '../finance/MonthPicker'
import TransactionRow from '../finance/TransactionRow'
import Select, { type SelectOption } from '../ui/Select'
import { useRequest } from '../../hooks/useRequest'
import { currentMonth, formatMoney, parseMoneyInput, todayIso } from '../../lib/format'
import { ApiError } from '../../services/apiClient'
import { CARD_BRAND_LABELS, CARD_KIND_LABELS, type Card } from '../../services/cardsService'
import { financeApi, type Category, type Transaction } from '../../services/financeService'
import './cards.css'

type LinkedCardWorkspaceProps = {
  card: Card
  categories: Category[]
  onEdit: () => void
  onToggleArchive: () => void
  onDeleteCard: () => void
  onDataChanged: () => void
}

// Painel para cartões de débito ou benefícios (VR/VA) vinculados a uma conta.
function LinkedCardWorkspace({
  card,
  categories,
  onEdit,
  onToggleArchive,
  onDeleteCard,
  onDataChanged,
}: LinkedCardWorkspaceProps) {
  const [month, setMonth] = useState(currentMonth)
  const [txType, setTxType] = useState<'expense' | 'income'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayIso)
  const [categoryId, setCategoryId] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadTxs = useCallback(
    (signal: AbortSignal) =>
      card.linkedAccountId
        ? financeApi.transactions.list({ month, accountId: card.linkedAccountId }, signal)
        : Promise.resolve([] as Transaction[]),
    [card.linkedAccountId, month],
  )
  const transactions = useRequest(`linked-card:${card.id}:${month}`, loadTxs)

  const filteredCategories = categories.filter((c) => c.kind === txType)
  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Sem categoria' },
    ...filteredCategories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
  ]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!card.linkedAccountId) return setFormError('Este cartão não possui conta vinculada.')
    const amountCents = parseMoneyInput(amount)
    if (amountCents === null) return setFormError('Informe um valor maior que zero.')
    if (!occurredOn) return setFormError('Informe a data.')

    setSaving(true)
    try {
      await financeApi.transactions.create({
        type: txType,
        amountCents,
        description: description.trim() || `${card.name}`,
        occurredOn,
        accountId: card.linkedAccountId,
        categoryId: categoryId || null,
        transferAccountId: null,
      })
      setDescription('')
      setAmount('')
      transactions.reload()
      onDataChanged()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Não foi possível registrar o lançamento.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTx(tx: Transaction) {
    if (!window.confirm('Excluir este lançamento? O saldo da conta vinculada será recalculado.')) return
    try {
      await financeApi.transactions.remove(tx.id)
      transactions.reload()
      onDataChanged()
    } catch {
      setFormError('Não foi possível excluir o lançamento.')
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title">
              {card.name} {card.last4 ? `· •••• ${card.last4}` : ''}
            </h2>
            <p className="page-subtitle" style={{ marginTop: 4 }}>
              {CARD_KIND_LABELS[card.kind]} · {card.issuer ? `${card.issuer} · ` : ''}
              {CARD_BRAND_LABELS[card.brand]} · Conta: <strong>{card.linkedAccountName ?? 'Não vinculada'}</strong>
            </p>
          </div>

          <div className="workspace-actions">
            <MonthPicker month={month} onChange={setMonth} />
            <button type="button" className="btn btn-ghost" onClick={onEdit}>
              Editar
            </button>
            <button type="button" className="btn btn-ghost" onClick={onToggleArchive}>
              {card.isArchived ? 'Reativar' : 'Arquivar'}
            </button>
            <button type="button" className="btn btn-danger" onClick={onDeleteCard}>
              Excluir
            </button>
          </div>
        </div>

        <div className="invoice-summary-grid">
          <div className="invoice-metric">
            <span className="invoice-metric-label">Saldo disponível na conta vinculada</span>
            <span className="invoice-metric-value tone-accent">
              {formatMoney(card.linkedAccountBalanceCents ?? 0)}
            </span>
          </div>
        </div>
      </section>

      {!card.isArchived && card.linkedAccountId && (
        <section className="card">
          <h3 className="card-title">Lançamento rápido no cartão</h3>
          <form className="form" onSubmit={handleSubmit} noValidate>
            {card.kind === 'benefit' && (
              <div className="segmented" role="group" aria-label="Tipo de movimentação">
                <button
                  type="button"
                  aria-pressed={txType === 'expense'}
                  onClick={() => {
                    setTxType('expense')
                    setCategoryId('')
                  }}
                >
                  Uso / Compra
                </button>
                <button
                  type="button"
                  aria-pressed={txType === 'income'}
                  onClick={() => {
                    setTxType('income')
                    setCategoryId('')
                  }}
                >
                  Recarga / Crédito
                </button>
              </div>
            )}

            <div className="form-row">
              <label className="field">
                <span>Descrição</span>
                <input
                  maxLength={200}
                  placeholder={txType === 'expense' ? 'Ex.: Almoço, Mercado' : 'Ex.: Crédito mensal VR'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Valor (R$)</span>
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Data</span>
                <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
              </label>

              <Select
                label="Categoria"
                value={categoryId}
                options={categoryOptions}
                onChange={setCategoryId}
              />
            </div>

            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : txType === 'expense' ? 'Registrar gasto' : 'Registrar recarga'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">Movimentações da conta vinculada</h3>
        {transactions.data?.length === 0 && <p className="empty">Nenhuma movimentação neste mês.</p>}
        {transactions.data?.map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} onDelete={handleDeleteTx} />
        ))}
      </section>
    </div>
  )
}

export default LinkedCardWorkspace
