import { useCallback, useState, type FormEvent } from 'react'
import MonthPicker from '../components/finance/MonthPicker'
import '../components/goals/goals.css'
import { useRequest } from '../hooks/useRequest'
import { currentMonth, formatMoney, parseMoneyInput } from '../lib/format'
import { ApiError } from '../services/apiClient'
import {
  goalsApi,
  type DailySpendDay,
  type GoalDto,
  type GoalKind,
  type GoalsOverview,
} from '../services/goalsService'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function formatCentsInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function formatDateBr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function firstWeekdayOfMonth(monthIso: string): number {
  const [year, month] = monthIso.split('-').map(Number)
  return new Date(year, month - 1, 1).getDay()
}

// Tela de Metas: controle de gasto diário com tabela de streak + metas de economia mensal e caixinhas.
function GoalsPage() {
  const [month, setMonth] = useState(currentMonth)
  const load = useCallback((signal: AbortSignal) => goalsApi.overview(month, signal), [month])
  const { data, error, loading, reload } = useRequest(`goals:${month}`, load)

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Metas</h1>
          <p className="page-subtitle">
            Acompanhe sua sequência de dias dentro do orçamento diário e suas metas de economia.
          </p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {loading && !data && <p className="state-message">Carregando suas metas…</p>}

      {error && !data && (
        <div className="state-message">
          <p>{error}</p>
          <button type="button" className="btn" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      )}

      {data && (
        <>
          <DailyStreakPanel overview={data} onChanged={reload} />
          <GoalsListPanel overview={data} onChanged={reload} />
        </>
      )}
    </div>
  )
}

// ---------- Orçamento diário + Tabela de Streak ----------

function DailyStreakPanel({ overview, onChanged }: { overview: GoalsOverview; onChanged: () => void }) {
  const { dailyBudget, month, today } = overview

  const [limitInput, setLimitInput] = useState(() =>
    dailyBudget.dailyLimitCents ? formatCentsInput(dailyBudget.dailyLimitCents) : '',
  )
  const [includeCards, setIncludeCards] = useState(dailyBudget.includeCardPurchases)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedDay, setSelectedDay] = useState<DailySpendDay | null>(null)

  const leadingBlanks = firstWeekdayOfMonth(month)
  const limitCents = dailyBudget.dailyLimitCents
  const todayPercent = limitCents ? Math.min(100, Math.round((dailyBudget.todaySpentCents * 100) / limitCents)) : 0
  const todayOver = limitCents !== null && dailyBudget.todaySpentCents > limitCents
  const todayWarning = limitCents !== null && !todayOver && todayPercent >= 80

  const activeDay = selectedDay
    ? (dailyBudget.days.find((d) => d.date === selectedDay.date) ?? null)
    : (dailyBudget.days.find((d) => d.date === today) ?? dailyBudget.days[0] ?? null)

  async function handleSaveLimit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const cents = parseMoneyInput(limitInput)
    if (cents === null) {
      setFormError('Informe um limite diário maior que zero (ex.: 50,00).')
      return
    }

    setSaving(true)
    try {
      await goalsApi.saveDailyBudget(cents, includeCards)
      onChanged()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível salvar o limite diário.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Orçamento diário &amp; Streak</h2>
        {limitCents !== null && (
          <span className="chip tone-accent">Limite: {formatMoney(limitCents)} / dia</span>
        )}
      </div>

      <form className="form" onSubmit={handleSaveLimit} noValidate>
        <div className="form-row">
          <label className="field">
            <span>Limite de gasto por dia (R$)</span>
            <input
              inputMode="decimal"
              placeholder="Ex.: 50,00"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
            />
          </label>
        </div>

        <label className="streak-checkbox">
          <input
            type="checkbox"
            checked={includeCards}
            onChange={(e) => setIncludeCards(e.target.checked)}
          />
          <span>Somar compras no cartão de crédito no gasto do dia</span>
        </label>

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {limitCents === null ? 'Ativar orçamento diário' : 'Atualizar limite'}
          </button>
        </div>
      </form>

      {limitCents !== null && (
        <>
          <div className="streak-stats">
            <div className="streak-stat">
              <span className="streak-stat-label">Sequência atual</span>
              <span className={`streak-stat-value ${dailyBudget.currentStreak > 0 ? 'tone-positive' : ''}`}>
                {dailyBudget.currentStreak} {dailyBudget.currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <div className="streak-stat">
              <span className="streak-stat-label">Melhor no mês</span>
              <span className="streak-stat-value tone-accent">
                {dailyBudget.bestStreakInMonth} {dailyBudget.bestStreakInMonth === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <div className="streak-stat">
              <span className="streak-stat-label">Dias no verde</span>
              <span className="streak-stat-value">
                {dailyBudget.daysWithinLimit} / {dailyBudget.daysElapsed}
              </span>
            </div>
          </div>

          <div className="streak-today-bar">
            <div className="streak-today-head">
              <span>Gasto de hoje ({formatDateBr(today)})</span>
              <strong className={todayOver ? 'tone-negative' : 'tone-positive'}>
                {formatMoney(dailyBudget.todaySpentCents)} / {formatMoney(limitCents)}
              </strong>
            </div>
            <div className="progress">
              <div
                className={`progress-bar${todayOver ? ' is-over' : todayWarning ? ' is-warning' : ''}`}
                style={{ width: `${todayPercent}%` }}
              />
            </div>
          </div>

          <div className="streak-calendar-wrap">
            <div className="streak-weekdays" aria-hidden="true">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="streak-grid" role="grid" aria-label="Tabela de streak diário">
              {Array.from({ length: leadingBlanks }).map((_, idx) => (
                <span key={`blank-${idx}`} aria-hidden="true" />
              ))}

              {dailyBudget.days.map((day) => {
                const isToday = day.date === today
                const isSelected = activeDay?.date === day.date
                const statusClass =
                  day.status === 'within'
                    ? 'is-within'
                    : day.status === 'exceeded'
                      ? 'is-exceeded'
                      : 'is-future'

                return (
                  <button
                    key={day.date}
                    type="button"
                    className={`streak-cell ${statusClass}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                    title={`${formatDateBr(day.date)} — Gasto: ${formatMoney(day.spentCents)}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    {day.dayOfMonth}
                  </button>
                )
              })}
            </div>

            <div className="streak-legend">
              <span className="streak-legend-item">
                <span className="streak-swatch is-within" /> Dentro do limite
              </span>
              <span className="streak-legend-item">
                <span className="streak-swatch is-exceeded" /> Passou do limite
              </span>
              <span className="streak-legend-item">
                <span className="streak-swatch is-future" /> Próximos dias
              </span>
            </div>

            {activeDay && (
              <div className="streak-detail">
                <span>
                  <strong>{formatDateBr(activeDay.date)}</strong> · Gasto: {formatMoney(activeDay.spentCents)}
                </span>
                {activeDay.status === 'future' ? (
                  <span className="list-item-meta">Dia futuro</span>
                ) : activeDay.spentCents <= limitCents ? (
                  <span className="tone-positive">
                    Sobrou {formatMoney(limitCents - activeDay.spentCents)}
                  </span>
                ) : (
                  <span className="tone-negative">
                    Passou {formatMoney(activeDay.spentCents - limitCents)} do limite
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

// ---------- Metas Financeiras (Economia Mensal e Caixinhas) ----------

function GoalsListPanel({ overview, onChanged }: { overview: GoalsOverview; onChanged: () => void }) {
  const [kind, setKind] = useState<GoalKind>('monthly_savings')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [initialSaved, setInitialSaved] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState('#34d399')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!name.trim()) return setFormError('Informe um nome para a meta.')
    const targetCents = parseMoneyInput(target)
    if (targetCents === null) return setFormError('Informe um valor maior que zero para a meta.')

    let currentCents = 0
    if (kind === 'target' && initialSaved.trim()) {
      const parsed = parseMoneyInput(initialSaved)
      if (parsed === null) return setFormError('Valor inicial inválido.')
      currentCents = parsed
    }

    setSaving(true)
    try {
      await goalsApi.create({
        name: name.trim(),
        kind,
        targetCents,
        currentCents,
        deadline: deadline.trim() || null,
        color,
      })
      setName('')
      setTarget('')
      setInitialSaved('')
      setDeadline('')
      onChanged()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível criar a meta.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Metas de economia</h2>
        <span className={`chip ${overview.monthNetCents >= 0 ? 'tone-positive' : 'tone-negative'}`}>
          Saldo do mês: {formatMoney(overview.monthNetCents)}
        </span>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="segmented" role="group" aria-label="Tipo de meta">
          <button
            type="button"
            aria-pressed={kind === 'monthly_savings'}
            onClick={() => setKind('monthly_savings')}
          >
            Economia mensal
          </button>
          <button
            type="button"
            aria-pressed={kind === 'target'}
            onClick={() => setKind('target')}
          >
            Caixinha / Valor-alvo
          </button>
        </div>

        <p className="page-subtitle" style={{ marginTop: -4 }}>
          {kind === 'monthly_savings'
            ? 'Ex.: Guardar R$ 200,00 por mês — compara automaticamente com quanto sobrou no mês.'
            : 'Ex.: Reserva de emergência de R$ 5.000,00 — registre aportes sempre que guardar dinheiro.'}
        </p>

        <div className="form-row">
          <label className="field">
            <span>Nome da meta</span>
            <input
              maxLength={80}
              placeholder={kind === 'monthly_savings' ? 'Ex.: Guardar R$ 200 por mês' : 'Ex.: Reserva de emergência'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span>{kind === 'monthly_savings' ? 'Valor mensal (R$)' : 'Valor-alvo (R$)'}</span>
            <input
              inputMode="decimal"
              placeholder={kind === 'monthly_savings' ? '200,00' : '5000,00'}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>

          {kind === 'target' && (
            <label className="field">
              <span>Já guardado (opcional)</span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={initialSaved}
                onChange={(e) => setInitialSaved(e.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span>Prazo (opcional)</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>

          <label className="field">
            <span>Cor</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Criar meta
          </button>
        </div>
      </form>

      <div className="goals-list">
        {overview.goals.length === 0 && <p className="empty">Nenhuma meta criada ainda.</p>}
        {overview.goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onChanged={onChanged} />
        ))}
      </div>
    </section>
  )
}

function GoalCard({ goal, onChanged }: { goal: GoalDto; onChanged: () => void }) {
  const [deltaInput, setDeltaInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const clampedWidth = Math.min(100, Math.max(0, goal.progressPercent))
  const achieved = goal.effectiveCents >= goal.targetCents
  const remaining = Math.max(0, goal.targetCents - goal.effectiveCents)

  async function handleContribute(sign: 1 | -1) {
    setError('')
    const cents = parseMoneyInput(deltaInput)
    if (cents === null) {
      setError('Informe um valor válido para aportar ou retirar.')
      return
    }

    setBusy(true)
    try {
      await goalsApi.contribute(goal.id, sign * cents)
      setDeltaInput('')
      onChanged()
    } catch (caught) {
      setError(errorMessage(caught, 'Não foi possível atualizar a meta.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Excluir a meta "${goal.name}"?`)
    if (!confirmed) return

    setBusy(true)
    try {
      await goalsApi.remove(goal.id)
      onChanged()
    } catch (caught) {
      setError(errorMessage(caught, 'Não foi possível excluir a meta.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="goal-item">
      <div className="goal-item-head">
        <div>
          <div className="goal-item-title-row">
            <span className="dot" style={{ background: goal.color }} aria-hidden="true" />
            <span className="goal-item-name">{goal.name}</span>
          </div>
          <p className="goal-item-meta">
            {goal.kind === 'monthly_savings' ? 'Meta mensal de economia' : 'Caixinha / Valor-alvo'}
            {goal.deadline ? ` · Prazo: ${formatDateBr(goal.deadline)}` : ''}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-icon btn-danger"
          disabled={busy}
          aria-label={`Excluir meta ${goal.name}`}
          onClick={handleDelete}
        >
          ×
        </button>
      </div>

      <div className="goal-progress-row">
        <span>
          <strong>{formatMoney(goal.effectiveCents)}</strong> de {formatMoney(goal.targetCents)}
        </span>
        <span className={achieved ? 'tone-positive' : 'list-item-meta'}>
          {achieved ? `Meta batida (${goal.progressPercent}%)` : `Falta ${formatMoney(remaining)} (${goal.progressPercent}%)`}
        </span>
      </div>

      <div className="progress">
        <div
          className="progress-bar"
          style={{
            width: `${clampedWidth}%`,
            background: achieved ? undefined : `linear-gradient(90deg, ${goal.color}, ${goal.color})`,
          }}
        />
      </div>

      {goal.kind === 'target' && (
        <div className="goal-contribute-row">
          <input
            inputMode="decimal"
            placeholder="Valor (R$)"
            value={deltaInput}
            onChange={(e) => setDeltaInput(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => handleContribute(1)}
          >
            + Aportar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => handleContribute(-1)}
          >
            - Retirar
          </button>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
    </article>
  )
}

export default GoalsPage
