// Formatação e conversão de valores e datas. Funções puras, sem React.

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100)
}

export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio)
}

// Converte o texto digitado ("1.234,56", "R$ 90", "12,5") em centavos. Retorna null se inválido ou zero.
export function parseMoneyInput(value: string): number | null {
  const normalized = value.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.')
  const amount = Number(normalized)

  if (!normalized || !Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100)
}

// Mês no formato AAAA-MM.
export function currentMonth(): string {
  return toMonthKey(new Date())
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return toMonthKey(new Date(year, monthNumber - 1 + delta, 1))
}

// "novembro de 2026", com a primeira letra maiúscula.
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const text = new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Rótulo curto para eixos de gráfico, ex.: "nov/26".
export function monthShortLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') +
    '/' + String(year).slice(2)
}

// Data de hoje no formato AAAA-MM-DD (fuso local).
export function todayIso(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  return `${toMonthKey(now)}-${day}`
}

// "2026-11-05" -> "05/11/2026".
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}
