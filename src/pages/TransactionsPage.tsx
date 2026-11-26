import { useCallback, useState } from 'react'
import MonthPicker from '../components/finance/MonthPicker'
import OfxImport from '../components/finance/OfxImport'
import RecurringPanel from '../components/finance/RecurringPanel'
import TransactionForm from '../components/finance/TransactionForm'
import TransactionRow from '../components/finance/TransactionRow'
import { currentMonth } from '../lib/format'
import { useRequest } from '../hooks/useRequest'
import { financeApi, type Transaction } from '../services/financeService'

// Lançamentos do mês: formulário para registrar e lista para consultar e excluir.
function TransactionsPage() {
  const [month, setMonth] = useState(currentMonth)
  const [actionError, setActionError] = useState('')

  const loadAccounts = useCallback((signal: AbortSignal) => financeApi.accounts.list(signal), [])
  const loadCategories = useCallback((signal: AbortSignal) => financeApi.categories.list(signal), [])
  const loadTransactions = useCallback(
    (signal: AbortSignal) => financeApi.transactions.list({ month }, signal),
    [month],
  )

  const accounts = useRequest('accounts', loadAccounts)
  const categories = useRequest('categories', loadCategories)
  const transactions = useRequest(month, loadTransactions)

  // Um lançamento mexe nos saldos das contas, então recarrega as três listas.
  function refreshAfterChange() {
    accounts.reload()
    transactions.reload()
  }

  async function handleDelete(transaction: Transaction) {
    const confirmed = window.confirm('Excluir este lançamento? O saldo das contas será recalculado.')
    if (!confirmed) return

    setActionError('')
    try {
      await financeApi.transactions.remove(transaction.id)
      refreshAfterChange()
    } catch {
      setActionError('Não foi possível excluir o lançamento. Tente novamente.')
    }
  }

  const loaded = accounts.data !== undefined && categories.data !== undefined

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-subtitle">Receitas, despesas e transferências entre suas contas.</p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {loaded ? (
        <>
          <section className="card">
            <h2 className="card-title">Novo lançamento</h2>
            <TransactionForm
              accounts={accounts.data ?? []}
              categories={categories.data ?? []}
              onSaved={refreshAfterChange}
            />
          </section>

          <RecurringPanel
            month={month}
            accounts={accounts.data ?? []}
            categories={categories.data ?? []}
            onApplied={refreshAfterChange}
          />

          <section className="card">
            <h2 className="card-title">Importar extrato (OFX ou CSV)</h2>
            <OfxImport
              accounts={accounts.data ?? []}
              categories={categories.data ?? []}
              onImported={refreshAfterChange}
            />
          </section>
        </>
      ) : (
        <p className="state-message">Carregando contas e categorias...</p>
      )}

      <section className="card">
        <h2 className="card-title">Lançamentos do mês</h2>
        {actionError && <p className="form-error" role="alert">{actionError}</p>}

        {transactions.error && !transactions.data && (
          <div className="state-message">
            <p>{transactions.error}</p>
            <button type="button" className="btn" onClick={transactions.reload}>
              Tentar novamente
            </button>
          </div>
        )}

        {transactions.data && transactions.data.length === 0 && (
          <p className="empty">Nenhum lançamento neste mês.</p>
        )}

        {transactions.data?.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} onDelete={handleDelete} />
        ))}
      </section>
    </div>
  )
}

export default TransactionsPage
