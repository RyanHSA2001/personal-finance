import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'
import BudgetProgress from '../components/finance/BudgetProgress'
import ExpenseDonutChart from '../components/finance/ExpenseDonutChart'
import MonthlyTrendChart from '../components/finance/MonthlyTrendChart'
import MonthPicker from '../components/finance/MonthPicker'
import TransactionRow from '../components/finance/TransactionRow'
import type { AppView } from '../components/app/AppShell'
import { useCountUp } from '../hooks/useCountUp'
import { useRequest } from '../hooks/useRequest'
import { currentMonth, formatMoney } from '../lib/format'
import { ACCOUNT_KIND_LABELS, financeApi } from '../services/financeService'

type HomePageProps = {
  onNavigate: (view: AppView) => void
}

type Tone = 'accent' | 'positive' | 'negative' | 'warning'

// Tela inicial: visão geral das contas e do mês, com gráficos de gastos.
function HomePage({ onNavigate }: HomePageProps) {
  const [month, setMonth] = useState(currentMonth)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const load = useCallback((signal: AbortSignal) => financeApi.dashboard(month, signal), [month])
  const { data, error, loading, reload } = useRequest(month, load)

  async function handleToggleAccount(accountId: string, nextValue: boolean) {
    setTogglingId(accountId)
    try {
      await financeApi.accounts.setOverviewVisibility(accountId, nextValue)
      reload()
    } finally {
      setTogglingId(null)
    }
  }

  if (loading && !data) {
    return <p className="state-message">Carregando seu resumo...</p>
  }

  if (error && !data) {
    return (
      <div className="state-message">
        <p>{error}</p>
        <button type="button" className="btn" onClick={reload}>
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) return null

  const noAccounts = data.accounts.length === 0
  const visibleAccountsCount = data.accounts.filter((a) => a.includeInOverview).length
  const netTone: Tone = data.monthNetCents >= 0 ? 'positive' : 'negative'
  const scheduledReservedCents = data.totalBalanceCents - data.projectedBalanceCents

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visão geral</h1>
          <p className="page-subtitle">Um resumo das suas contas e dos gastos do mês.</p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {!noAccounts && (
        <div className="account-filter-bar" role="group" aria-label="Filtrar contas na visão geral">
          <span className="account-filter-label">Contas na tela:</span>
          <div className="account-filter-list">
            {data.accounts.map((account) => (
              <label
                key={account.id}
                className={`account-filter-chip${account.includeInOverview ? ' is-checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={account.includeInOverview}
                  disabled={togglingId === account.id}
                  onChange={(e) => handleToggleAccount(account.id, e.target.checked)}
                />
                <span>{account.name}</span>
              </label>
            ))}
          </div>
          {visibleAccountsCount < data.accounts.length && (
            <span className="account-filter-count">
              {visibleAccountsCount} de {data.accounts.length} ativa(s)
            </span>
          )}
        </div>
      )}

      {noAccounts && (
        <section className="card">
          <h2 className="card-title">Comece pelas suas contas</h2>
          <p className="page-subtitle">
            Cadastre pelo menos uma conta (corrente, poupança, carteira...) para começar a registrar lançamentos.
          </p>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={() => onNavigate('registry')}>
              Cadastrar conta
            </button>
          </div>
        </section>
      )}

      <div className="grid grid-kpi">
        <Kpi
          label={data.projectedBalanceCents !== data.totalBalanceCents ? 'Saldo disponível' : 'Saldo total'}
          cents={data.projectedBalanceCents}
          tone={data.projectedBalanceCents < 0 ? 'negative' : 'accent'}
          hint={
            data.projectedBalanceCents !== data.totalBalanceCents
              ? `Em conta hoje: ${formatMoney(data.totalBalanceCents)}`
              : visibleAccountsCount < data.accounts.length
                ? `${visibleAccountsCount} de ${data.accounts.length} conta(s)`
                : `${data.accounts.length} conta(s)`
          }
        />
        <Kpi label="Receitas no mês" cents={data.monthIncomeCents} tone="positive" />
        <Kpi
          label="Despesas no mês"
          cents={data.monthExpenseCents}
          tone="negative"
          hint={
            data.monthCardInvoicesCents > 0
              ? `Conta ${formatMoney(data.monthAccountExpenseCents)} + Fatura ${formatMoney(data.monthCardInvoicesCents)}`
              : 'Somente em conta'
          }
        />
        <Kpi
          label="Resultado do mês"
          cents={data.monthNetCents}
          tone={netTone}
          hint={`${formatMoney(data.monthIncomeCents)} − ${formatMoney(data.monthExpenseCents)} · ${data.monthNetCents >= 0 ? 'Sobrou dinheiro' : 'Acima das receitas'}`}
        />
        <Kpi
          label={month === currentMonth() ? 'Fatura atual' : 'Faturas no mês'}
          cents={data.openCardInvoicesCents > 0 ? data.openCardInvoicesCents : data.monthCardInvoicesCents}
          tone={data.openCardInvoicesCents > 0 ? 'negative' : 'accent'}
          hint={
            data.monthCardInvoicesCents === 0
              ? 'Sem gastos em cartão'
              : data.openCardInvoicesCents > 0
                ? data.openCardInvoicesCents < data.monthCardInvoicesCents
                  ? `Em aberto · total ${formatMoney(data.monthCardInvoicesCents)}`
                  : 'Em aberto'
                : 'Todas as faturas pagas'
          }
        />
        <Kpi
          label="Saldo agendado"
          cents={Math.abs(scheduledReservedCents)}
          tone={scheduledReservedCents > 0 ? 'warning' : scheduledReservedCents < 0 ? 'positive' : 'accent'}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
          hint={
            scheduledReservedCents > 0
              ? 'Comprometido · ainda em conta hoje'
              : scheduledReservedCents < 0
                ? 'A receber em lançamentos futuros'
                : 'Nenhum lançamento agendado'
          }
        />
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="card-title">Gastos por categoria</h2>
          <ExpenseDonutChart items={data.expenseByCategory} total={data.monthExpenseCents} />
        </section>

        <section className="card">
          <h2 className="card-title">Receitas e despesas (últimos 6 meses)</h2>
          <MonthlyTrendChart data={data.monthlyTrend} />
        </section>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="card-title">Orçamentos do mês</h2>
          <BudgetProgress budgets={data.budgets} />
        </section>

        <section className="card">
          <h2 className="card-title">Contas</h2>
          {data.accounts.length === 0 ? (
            <p className="empty">Nenhuma conta cadastrada.</p>
          ) : (
            <ul className="list">
              {data.accounts.map((account) => (
                <li
                  key={account.id}
                  className={`list-item${account.includeInOverview ? '' : ' is-muted'}`}
                >
                  <label className="account-row-check">
                    <input
                      type="checkbox"
                      checked={account.includeInOverview}
                      disabled={togglingId === account.id}
                      aria-label={`Incluir ${account.name} na visão geral`}
                      onChange={(e) => handleToggleAccount(account.id, e.target.checked)}
                    />
                    <div className="list-item-main">
                      <span className="list-item-title">{account.name}</span>
                      <span className="list-item-meta">
                        {ACCOUNT_KIND_LABELS[account.kind]}
                        {account.projectedBalanceCents !== account.balanceCents
                          ? ` · Previsto: ${formatMoney(account.projectedBalanceCents)}`
                          : ''}
                        {!account.includeInOverview ? ' · Oculta da visão geral' : ''}
                      </span>
                    </div>
                  </label>
                  <span className={`list-item-amount ${account.balanceCents < 0 ? 'tone-negative' : ''}`}>
                    {formatMoney(account.balanceCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Últimos lançamentos</h2>
          <button type="button" className="btn btn-ghost" onClick={() => onNavigate('transactions')}>
            Ver todos
          </button>
        </div>
        {data.recentTransactions.length === 0 ? (
          <p className="empty">Nenhum lançamento neste mês ainda.</p>
        ) : (
          data.recentTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))
        )}
      </section>
    </div>
  )
}

type KpiProps = {
  label: string
  cents: number
  tone: Tone
  hint?: string
  icon?: ReactNode
}

const TONE_COLORS: Record<Tone, string> = {
  accent: '#a78bfa',
  positive: '#34d399',
  negative: '#f87171',
  warning: '#fbbf24',
}

// Indicador com valor que conta até o número final.
function Kpi({ label, cents, tone, hint, icon }: KpiProps) {
  const animated = useCountUp(cents)

  return (
    <div className="card kpi" style={{ '--tone': TONE_COLORS[tone] } as CSSProperties}>
      <span className="kpi-accent" aria-hidden="true" />
      <span className="kpi-label">
        {icon}
        {label}
      </span>
      <span className={`kpi-value tone-${tone}`}>{formatMoney(animated)}</span>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  )
}

export default HomePage
