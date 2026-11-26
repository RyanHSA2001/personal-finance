import { apiRequest } from './apiClient'

export type GoalKind = 'monthly_savings' | 'target'

export type GoalDto = {
  id: string
  name: string
  kind: GoalKind
  targetCents: number
  currentCents: number
  effectiveCents: number
  progressPercent: number
  deadline: string | null
  color: string
}

export type GoalRequest = {
  name: string
  kind: GoalKind
  targetCents: number
  currentCents: number
  deadline: string | null
  color: string
}

export type DailySpendStatus = 'within' | 'exceeded' | 'future'

export type DailySpendDay = {
  date: string
  dayOfMonth: number
  spentCents: number
  status: DailySpendStatus
}

export type DailyBudgetSummary = {
  dailyLimitCents: number | null
  includeCardPurchases: boolean
  todaySpentCents: number
  currentStreak: number
  bestStreakInMonth: number
  daysWithinLimit: number
  daysExceeded: number
  daysElapsed: number
  days: DailySpendDay[]
}

export type GoalsOverview = {
  month: string
  today: string
  monthIncomeCents: number
  monthExpenseCents: number
  monthNetCents: number
  goals: GoalDto[]
  dailyBudget: DailyBudgetSummary
}

function localTodayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const goalsApi = {
  overview: (month: string, signal?: AbortSignal) =>
    apiRequest<GoalsOverview>(`/goals/overview?month=${encodeURIComponent(month)}&today=${localTodayIso()}`, { signal }),

  create: (body: GoalRequest) =>
    apiRequest<{ id: string }>('/goals', { method: 'POST', body }),

  contribute: (id: string, deltaCents: number) =>
    apiRequest<{ currentCents: number }>(`/goals/${id}/contribute`, { method: 'POST', body: { deltaCents } }),

  remove: (id: string) =>
    apiRequest<void>(`/goals/${id}`, { method: 'DELETE' }),

  saveDailyBudget: (dailyLimitCents: number, includeCardPurchases: boolean) =>
    apiRequest<void>('/goals/daily-budget', {
      method: 'PUT',
      body: { dailyLimitCents, includeCardPurchases },
    }),

  clearDailyBudget: () =>
    apiRequest<void>('/goals/daily-budget', { method: 'DELETE' }),
}
