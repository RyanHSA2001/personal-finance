import { monthLabel, shiftMonth } from '../../lib/format'

type MonthPickerProps = {
  month: string
  onChange: (month: string) => void
}

// Seletor de mês (AAAA-MM) com botões para voltar e avançar.
function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <div className="month-picker" role="group" aria-label="Mês de referência">
      <button type="button" className="btn btn-icon btn-ghost" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(month, -1))}>
        ‹
      </button>
      <span className="month-picker-label" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button type="button" className="btn btn-icon btn-ghost" aria-label="Próximo mês" onClick={() => onChange(shiftMonth(month, 1))}>
        ›
      </button>
    </div>
  )
}

export default MonthPicker
