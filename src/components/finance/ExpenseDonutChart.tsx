import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategorySpend } from '../../services/financeService'
import { formatMoney, formatPercent } from '../../lib/format'
import './finance.css'

type ExpenseDonutChartProps = {
  items: CategorySpend[]
  total: number
}

// Gráfico de rosca com os gastos do mês por categoria, com legenda e percentuais.
function ExpenseDonutChart({ items, total }: ExpenseDonutChartProps) {
  if (items.length === 0) {
    return <p className="empty">Nenhuma despesa registrada neste mês.</p>
  }

  const data = items.map((item) => ({ ...item, value: item.amountCents }))

  return (
    <div className="donut-layout">
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive
              animationBegin={120}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {data.map((item) => (
                <Cell key={item.name + item.color} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const entry = payload[0]
                return (
                  <div className="chart-tooltip">
                    <strong>{String(entry.name)}</strong>
                    <div>{formatMoney(Number(entry.value))}</div>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="donut-center">
          <span className="donut-center-label">Total gasto</span>
          <span className="donut-center-value">{formatMoney(total)}</span>
        </div>
      </div>

      <ul className="legend-list">
        {items.map((item) => (
          <li key={item.name + item.color} className="legend-item">
            <span className="dot" style={{ background: item.color }} aria-hidden="true" />
            <span className="legend-item-name">{item.name}</span>
            <span className="legend-item-value">
              {formatMoney(item.amountCents)} · {formatPercent(total > 0 ? item.amountCents / total : 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ExpenseDonutChart
