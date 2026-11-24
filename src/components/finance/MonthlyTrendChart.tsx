import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthTrend } from '../../services/financeService'
import { formatMoney, monthShortLabel } from '../../lib/format'
import './finance.css'

type MonthlyTrendChartProps = {
  data: MonthTrend[]
}

const compactMoney = new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' })

// Receitas e despesas dos últimos meses, lado a lado.
function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const chartData = data.map((item) => ({
    label: monthShortLabel(item.month),
    receitas: item.incomeCents / 100,
    despesas: item.expenseCents / 100,
  }))

  const hasAnyValue = data.some((item) => item.incomeCents > 0 || item.expenseCents > 0)
  if (!hasAnyValue) {
    return <p className="empty">Os gráficos aparecem assim que houver lançamentos nos últimos meses.</p>
  }

  return (
    <div className="chart-box">
      {/* Gradientes compartilhados pelas barras (o Recharts não renderiza <defs> próprios) */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.45} />
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--color-text-subtle)" />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={78}
            stroke="var(--color-text-subtle)"
            tickFormatter={(value: number) => compactMoney.format(value)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(167, 139, 250, 0.08)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="chart-tooltip">
                  <strong>{String(label)}</strong>
                  {payload.map((entry) => (
                    <div key={String(entry.dataKey)}>
                      {String(entry.name)}: {formatMoney(Math.round(Number(entry.value) * 100))}
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: 'var(--color-text-muted)' }} />
          <Bar name="Receitas" dataKey="receitas" fill="url(#gradIncome)" radius={[6, 6, 0, 0]} animationDuration={900} />
          <Bar name="Despesas" dataKey="despesas" fill="url(#gradExpense)" radius={[6, 6, 0, 0]} animationDuration={900} animationBegin={150} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MonthlyTrendChart
