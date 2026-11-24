import { formatDate, formatMoney } from '../../lib/format'
import { TRANSACTION_TYPE_LABELS, type Transaction } from '../../services/financeService'
import './finance.css'

type TransactionRowProps = {
  transaction: Transaction
  onDelete?: (transaction: Transaction) => void
}

// Uma linha de lançamento: descrição, data, conta, categoria e valor com sinal.
function TransactionRow({ transaction, onDelete }: TransactionRowProps) {
  const { type, amountCents } = transaction
  const isTransfer = type === 'transfer'
  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : ''
  const dotColor = isTransfer ? 'var(--color-info)' : (transaction.categoryColor ?? '#94a3b8')
  const title = transaction.description || transaction.categoryName || TRANSACTION_TYPE_LABELS[type]

  return (
    <div className="transaction-row">
      <span className="dot" style={{ background: dotColor }} aria-hidden="true" />

      <div className="transaction-main">
        <span className="transaction-title">{title}</span>
        <span className="transaction-meta">
          <span>{formatDate(transaction.occurredOn)}</span>
          <span>·</span>
          <span>
            {isTransfer
              ? `${transaction.accountName} → ${transaction.transferAccountName ?? ''}`
              : transaction.accountName}
          </span>
          {transaction.categoryName && !isTransfer && <span className="chip">{transaction.categoryName}</span>}
        </span>
      </div>

      <span className={`transaction-amount is-${type}`}>
        {sign}
        {formatMoney(amountCents)}
      </span>

      {onDelete && (
        <button
          type="button"
          className="btn btn-icon btn-danger"
          aria-label={`Excluir lançamento ${title}`}
          onClick={() => onDelete(transaction)}
        >
          ×
        </button>
      )}
    </div>
  )
}

export default TransactionRow
