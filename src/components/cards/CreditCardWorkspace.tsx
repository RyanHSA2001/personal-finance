import { useCallback, useState, type FormEvent } from 'react'
import MonthPicker from '../finance/MonthPicker'
import Select, { type SelectOption } from '../ui/Select'
import { useRequest } from '../../hooks/useRequest'
import { formatDate, formatMoney, monthLabel, parseMoneyInput, todayIso } from '../../lib/format'
import { ApiError } from '../../services/apiClient'
import {
  CARD_BRAND_LABELS,
  INVOICE_STATUS_LABELS,
  cardsApi,
  computeBillingMonth,
  type Card,
  type CardTransaction,
  type CardTransactionType,
} from '../../services/cardsService'
import type { Account, Category } from '../../services/financeService'
import './cards.css'

type CreditCardWorkspaceProps = {
  card: Card
  accounts: Account[]
  categories: Category[]
  onEdit: () => void
  onToggleArchive: () => void
  onDeleteCard: () => void
  onDataChanged: () => void
}

function CreditCardWorkspace({
  card,
  accounts,
  categories,
  onEdit,
  onToggleArchive,
  onDeleteCard,
  onDataChanged,
}: CreditCardWorkspaceProps) {
  const [month, setMonth] = useState(() => card.currentInvoiceMonth ?? todayIso().slice(0, 7))
  const [actionError, setActionError] = useState('')

  // Carrega a fatura do mês selecionado
  const loadInvoice = useCallback(
    (signal: AbortSignal) => cardsApi.invoice(card.id, month, signal),
    [card.id, month],
  )
  const invoice = useRequest(`invoice:${card.id}:${month}`, loadInvoice)

  // Formulário de nova compra / estorno
  const [txType, setTxType] = useState<CardTransactionType>('purchase')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayIso)
  const [categoryId, setCategoryId] = useState('')
  const [installments, setInstallments] = useState('1')
  const [txError, setTxError] = useState('')
  const [txSaving, setTxSaving] = useState(false)

  // Pagamento de fatura inline (total ou parcial)
  const bankAccounts = accounts.filter((a) => a.kind !== 'credit_card')
  const [showPayBox, setShowPayBox] = useState(false)
  const [payAccountId, setPayAccountId] = useState(
    card.defaultPaymentAccountId ?? bankAccounts[0]?.id ?? '',
  )
  const [payDate, setPayDate] = useState(todayIso)
  const [payAmount, setPayAmount] = useState('')
  const [paySaving, setPaySaving] = useState(false)

  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Sem categoria' },
    ...expenseCategories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
  ]

  const payAccountOptions: SelectOption[] = bankAccounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${formatMoney(a.balanceCents)})`,
  }))

  const parsedAmount = parseMoneyInput(amount)
  const parsedInstallments = txType === 'purchase' ? Math.max(1, Math.min(48, Number(installments) || 1)) : 1
  const computedFirstMonth = card.closingDay ? computeBillingMonth(occurredOn, card.closingDay) : month

  const limit = card.creditLimitCents ?? 0
  const usageRatio = limit > 0 ? Math.max(0, card.usedLimitCents / limit) : 0
  const barTone = usageRatio >= 1 ? 'is-over' : usageRatio >= 0.8 ? 'is-warning' : ''

  async function handleAddTx(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTxError('')

    if (parsedAmount === null) return setTxError('Informe um valor maior que zero.')
    if (!occurredOn) return setTxError('Informe a data da compra.')

    setTxSaving(true)
    try {
      const created = await cardsApi.addTransaction(card.id, {
        type: txType,
        totalAmountCents: parsedAmount,
        description: description.trim(),
        occurredOn,
        categoryId: categoryId || null,
        installments: parsedInstallments,
      })
      setDescription('')
      setAmount('')
      setInstallments('1')
      // Se a compra caiu em outra fatura (ex.: após fechamento), navega para ela para dar feedback imediato.
      if (created.firstBillingMonth !== month) {
        setMonth(created.firstBillingMonth)
      } else {
        invoice.reload()
      }
      onDataChanged()
    } catch (caught) {
      setTxError(caught instanceof ApiError ? caught.message : 'Não foi possível registrar o lançamento.')
    } finally {
      setTxSaving(false)
    }
  }

  async function handleDeleteTx(tx: CardTransaction, scope: 'single' | 'group') {
    const msg =
      scope === 'group'
        ? `Excluir todas as ${tx.installmentTotal} parcelas de "${tx.description || 'Compra'}"?`
        : 'Excluir este lançamento da fatura?'
    if (!window.confirm(msg)) return

    setActionError('')
    try {
      await cardsApi.removeTransaction(card.id, tx.id, scope)
      invoice.reload()
      onDataChanged()
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível excluir o lançamento.')
    }
  }

  async function handlePayInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError('')

    if (!payAccountId) return setActionError('Selecione a conta para debitar o pagamento.')
    if (!payDate) return setActionError('Informe a data do pagamento.')

    const parsedPayCents = parseMoneyInput(payAmount)
    if (parsedPayCents === null) return setActionError('Informe um valor de pagamento maior que zero.')

    setPaySaving(true)
    try {
      await cardsApi.payInvoice(card.id, month, {
        accountId: payAccountId,
        paidOn: payDate,
        amountCents: parsedPayCents,
      })
      setShowPayBox(false)
      setPayAmount('')
      invoice.reload()
      onDataChanged()
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível pagar a fatura.')
    } finally {
      setPaySaving(false)
    }
  }

  async function handleDeletePayment(paymentId: string, amountCents: number) {
    if (
      !window.confirm(
        `Estornar o pagamento de ${formatMoney(amountCents)}? O débito correspondente na conta bancária também será removido.`,
      )
    ) {
      return
    }

    setActionError('')
    try {
      await cardsApi.removeInvoicePayment(card.id, month, paymentId)
      invoice.reload()
      onDataChanged()
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível estornar o pagamento.')
    }
  }

  async function handleUnpayInvoice() {
    if (!window.confirm('Estornar todos os pagamentos desta fatura? Os débitos na conta bancária também serão removidos.')) {
      return
    }

    setActionError('')
    try {
      await cardsApi.unpayInvoice(card.id, month)
      invoice.reload()
      onDataChanged()
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível estornar o pagamento.')
    }
  }

  const inv = invoice.data

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title">
              {card.name} {card.last4 ? `· •••• ${card.last4}` : ''}
            </h2>
            <p className="page-subtitle" style={{ marginTop: 4 }}>
              {card.issuer ? `${card.issuer} · ` : ''}
              {CARD_BRAND_LABELS[card.brand]} · Fecha dia {card.closingDay} · Vence dia {card.dueDay}
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

        {/* Barra de limite do cartão */}
        <div style={{ marginBottom: 18 }}>
          <div className="budget-head">
            <span>
              Limite comprometido: <strong>{formatMoney(card.usedLimitCents)}</strong>
            </span>
            <span className="budget-values">
              Disponível {formatMoney(card.availableLimitCents)} / {formatMoney(limit)}
            </span>
          </div>
          <div className="progress">
            <div className={`progress-bar ${barTone}`} style={{ width: `${Math.min(usageRatio * 100, 100)}%` }} />
          </div>
        </div>

        {actionError && (
          <p className="form-error" role="alert" style={{ marginBottom: 14 }}>
            {actionError}
          </p>
        )}

        {invoice.loading && !inv && <p className="empty">Carregando fatura...</p>}
        {invoice.error && !inv && <p className="form-error">{invoice.error}</p>}

        {inv && (
          <div className="stack" style={{ gap: 16 }}>
            <div className="invoice-summary-grid">
              <div className="invoice-metric">
                <span className="invoice-metric-label">Fatura de {monthLabel(inv.billingMonth)}</span>
                <span className="invoice-metric-value">
                  {formatMoney(inv.status === 'paid' ? inv.totalCents : inv.remainingCents)}
                </span>
                {inv.status !== 'paid' && (inv.paidAmountCents ?? 0) > 0 && (
                  <span className="field-hint">Total original: {formatMoney(inv.totalCents)}</span>
                )}
              </div>
              <div className="invoice-metric">
                <span className="invoice-metric-label">Status</span>
                <span>
                  <span className={`status-badge is-${inv.status}`}>{INVOICE_STATUS_LABELS[inv.status]}</span>
                </span>
              </div>
              <div className="invoice-metric">
                <span className="invoice-metric-label">Fechamento</span>
                <span className="invoice-metric-value" style={{ fontSize: 15 }}>
                  {formatDate(inv.closingDate)}
                </span>
              </div>
              <div className="invoice-metric">
                <span className="invoice-metric-label">Vencimento</span>
                <span className="invoice-metric-value" style={{ fontSize: 15 }}>
                  {formatDate(inv.dueDate)}
                </span>
              </div>
            </div>

            {inv.payments.length > 0 && (
              <div className="paid-banner" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span>
                    {inv.status === 'paid' ? (
                      <>
                        Fatura quitada — total pago:{' '}
                        <strong>{formatMoney(inv.paidAmountCents ?? inv.totalCents)}</strong>.
                      </>
                    ) : (
                      <>
                        Pago parcialmente: <strong>{formatMoney(inv.paidAmountCents ?? 0)}</strong> · Restante:{' '}
                        <strong>{formatMoney(inv.remainingCents)}</strong>
                      </>
                    )}
                  </span>
                  {inv.payments.length > 1 && (
                    <button type="button" className="btn btn-ghost" onClick={handleUnpayInvoice}>
                      Estornar todos
                    </button>
                  )}
                </div>

                <ul className="list" style={{ margin: 0 }}>
                  {inv.payments.map((p) => (
                    <li key={p.id} className="list-item" style={{ padding: '8px 0' }}>
                      <div className="list-item-main">
                        <span className="list-item-title">{formatMoney(p.amountCents)}</span>
                        <span className="list-item-meta">
                          Pago em {formatDate(p.paidOn)}
                          {p.accountName ? ` · via ${p.accountName}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ minHeight: 32, padding: '0 10px', fontSize: 12 }}
                        onClick={() => handleDeletePayment(p.id, p.amountCents)}
                      >
                        Estornar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {inv.remainingCents > 0 && (
              <div>
                {!showPayBox ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setPayAmount((inv.remainingCents / 100).toFixed(2).replace('.', ','))
                      setShowPayBox(true)
                    }}
                    disabled={bankAccounts.length === 0}
                  >
                    {inv.payments.length > 0
                      ? `Pagar restante (${formatMoney(inv.remainingCents)})`
                      : `Pagar fatura (${formatMoney(inv.remainingCents)})`}
                  </button>
                ) : (
                  <form className="form pay-box" onSubmit={handlePayInvoice} noValidate>
                    <div className="form-row">
                      <label className="field">
                        <span>Valor a pagar (total ou parcial)</span>
                        <input
                          inputMode="decimal"
                          placeholder="0,00"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                      </label>
                      <Select
                        label="Conta de pagamento"
                        value={payAccountId}
                        options={payAccountOptions}
                        placeholder="Sem contas disponíveis"
                        onChange={setPayAccountId}
                      />
                      <label className="field">
                        <span>Data do pagamento</span>
                        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                      </label>
                    </div>
                    <span className="field-hint">
                      Restante da fatura: <strong>{formatMoney(inv.remainingCents)}</strong>. Você pode informar um valor
                      menor para pagamento parcial — o limite correspondente será liberado imediatamente sem duplicar
                      despesas nos gráficos.
                    </span>
                    <div className="form-actions" style={{ gap: 8 }}>
                      <button type="submit" className="btn btn-primary" disabled={paySaving}>
                        {paySaving ? 'Pagando...' : 'Confirmar pagamento'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowPayBox(false)}
                        disabled={paySaving}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {!card.isArchived && (
        <section className="card">
          <h3 className="card-title">Registrar no cartão</h3>
          <form className="form" onSubmit={handleAddTx} noValidate>
            <div className="segmented" role="group" aria-label="Tipo de lançamento no cartão">
              <button
                type="button"
                aria-pressed={txType === 'purchase'}
                onClick={() => setTxType('purchase')}
              >
                Compra
              </button>
              <button
                type="button"
                aria-pressed={txType === 'refund'}
                onClick={() => {
                  setTxType('refund')
                  setInstallments('1')
                }}
              >
                Estorno / Crédito
              </button>
            </div>

            <div className="form-row">
              <label className="field">
                <span>Descrição</span>
                <input
                  maxLength={200}
                  placeholder={txType === 'purchase' ? 'Ex.: Mercado, Notebook' : 'Ex.: Estorno loja'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <label className="field">
                <span>{txType === 'purchase' && parsedInstallments > 1 ? 'Valor total (R$)' : 'Valor (R$)'}</span>
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
            </div>

            <div className="form-row">
              <Select
                label="Categoria"
                value={categoryId}
                options={categoryOptions}
                onChange={setCategoryId}
              />

              {txType === 'purchase' && (
                <label className="field">
                  <span>Parcelas (1 a 48)</span>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                  />
                </label>
              )}
            </div>

            <span className="field-hint">
              Entra na fatura de <strong>{monthLabel(computedFirstMonth)}</strong>
              {txType === 'purchase' && parsedInstallments > 1 && parsedAmount !== null
                ? ` · ${parsedInstallments}x de ${formatMoney(Math.floor(parsedAmount / parsedInstallments))}`
                : ''}
            </span>

            {txError && (
              <p className="form-error" role="alert">
                {txError}
              </p>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={txSaving}>
                {txSaving
                  ? 'Salvando...'
                  : txType === 'purchase'
                    ? parsedInstallments > 1
                      ? `Lançar em ${parsedInstallments}x`
                      : 'Lançar compra'
                    : 'Registrar estorno'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">Lançamentos da fatura ({inv ? inv.items.length : 0})</h3>

        {inv && inv.items.length === 0 && (
          <p className="empty">Nenhum lançamento nesta fatura.</p>
        )}

        {inv?.items.map((item) => {
          const isRefund = item.type === 'refund'
          const isInstallment = item.installmentTotal > 1

          return (
            <div key={item.id} className="transaction-row">
              <span
                className="dot"
                style={{ background: item.categoryColor ?? (isRefund ? '#34d399' : '#64748b') }}
                aria-hidden="true"
              />
              <div className="transaction-main">
                <span className="transaction-title">
                  {item.description || (isRefund ? 'Estorno' : 'Compra no cartão')}
                </span>
                <div className="transaction-meta">
                  <span>{formatDate(item.occurredOn)}</span>
                  {item.categoryName && <span className="chip">{item.categoryName}</span>}
                  {isInstallment && (
                    <span className="chip">
                      Parcela {item.installmentNumber}/{item.installmentTotal}
                    </span>
                  )}
                  {isRefund && <span className="chip">Estorno</span>}
                </div>
              </div>

              <span className={`transaction-amount ${isRefund ? 'is-income' : 'is-expense'}`}>
                {isRefund ? '+' : '-'} {formatMoney(item.amountCents)}
              </span>

              {inv.status !== 'paid' && (
                <div className="card-tx-delete-group">
                  {isInstallment && item.installmentGroupId && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ minHeight: 32, padding: '0 10px', fontSize: 12 }}
                      onClick={() => handleDeleteTx(item, 'group')}
                    >
                      Excluir todas
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-icon btn-danger"
                    aria-label="Excluir lançamento"
                    onClick={() => handleDeleteTx(item, 'single')}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

export default CreditCardWorkspace
