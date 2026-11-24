import type { Budget } from '../../services/financeService'
import { formatMoney, formatPercent } from '../../lib/format'
import './finance.css'

type BudgetProgressProps = {
  budgets: Budget[]
}

// Orçamentos do mês: quanto já foi gasto de cada limite. Fica amarelo perto do limite e vermelho ao passar.
function BudgetProgress({ budgets }: BudgetProgressProps) {
  if (budgets.length === 0) {
    return <p className="empty">Nenhum orçamento definido. Crie limites em Cadastros.</p>
  }

  return (
    <ul className="budget-list">
      {budgets.map((budget) => {
        const ratio = budget.monthlyLimitCents > 0 ? budget.spentCents / budget.monthlyLimitCents : 0
        const tone = ratio > 1 ? 'is-over' : ratio >= 0.8 ? 'is-warning' : ''

        return (
          <li key={budget.id}>
            <div className="budget-head">
              <span className="chip">
                <span className="dot" style={{ background: budget.categoryColor }} aria-hidden="true" />
                {budget.categoryName}
              </span>
              <span className="budget-values">
                {formatMoney(budget.spentCents)} de {formatMoney(budget.monthlyLimitCents)} ({formatPercent(ratio)})
              </span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label={`Orçamento de ${budget.categoryName}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(Math.round(ratio * 100), 100)}
            >
              <div className={`progress-bar ${tone}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default BudgetProgress
