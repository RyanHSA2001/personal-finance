// Chamadas à API financeira e tipos que espelham os DTOs do backend (Finance/FinanceModels.cs).
// Valores monetários são sempre em centavos (number inteiro).

import { apiRequest } from './apiClient'

export type AccountKind = 'checking' | 'savings' | 'cash' | 'credit_card' | 'investment' | 'other'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  investment: 'Investimento',
  other: 'Outra',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
}

export type Account = {
  id: string
  name: string
  kind: AccountKind
  initialBalanceCents: number
  balanceCents: number
  projectedBalanceCents: number
}

export type Category = {
  id: string
  name: string
  kind: CategoryKind
  color: string
}

export type Transaction = {
  id: string
  type: TransactionType
  amountCents: number
  description: string
  occurredOn: string
  accountId: string
  accountName: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  transferAccountId: string | null
  transferAccountName: string | null
}

export type Budget = {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string
  monthlyLimitCents: number
  spentCents: number
}

export type CategorySpend = {
  categoryId: string | null
  name: string
  color: string
  amountCents: number
}

export type MonthTrend = {
  month: string
  incomeCents: number
  expenseCents: number
}

export type Dashboard = {
  month: string
  totalBalanceCents: number
  projectedBalanceCents: number
  monthIncomeCents: number
  monthAccountExpenseCents: number
  monthExpenseCents: number
  monthNetCents: number
  monthCardInvoicesCents: number
  openCardInvoicesCents: number
  accounts: Account[]
  expenseByCategory: CategorySpend[]
  monthlyTrend: MonthTrend[]
  budgets: Budget[]
  recentTransactions: Transaction[]
}

export type AccountInput = {
  name: string
  kind: AccountKind
  initialBalanceCents: number
}

export type CategoryInput = {
  name: string
  kind: CategoryKind
  color: string
}

export type TransactionInput = {
  type: TransactionType
  amountCents: number
  description: string
  occurredOn: string
  accountId: string
  categoryId: string | null
  transferAccountId: string | null
}

export type BudgetInput = {
  categoryId: string
  monthlyLimitCents: number
}

// ---------- Importação OFX ----------

export type OfxPreviewTransaction = {
  externalId: string
  type: 'income' | 'expense'
  amountCents: number
  description: string
  occurredOn: string
  ofxType: string
  alreadyImported: boolean
  suggestedCategoryId?: string | null
}

// ---------- Lançamentos recorrentes (contas fixas) ----------

export type RecurringItem = {
  id: string
  name: string
  type: 'income' | 'expense'
  amountCents: number
  dayOfMonth: number
  accountId: string
  accountName: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  appliedInMonth: boolean
}

export type RecurringInput = {
  name: string
  type: 'income' | 'expense'
  amountCents: number
  dayOfMonth: number
  accountId: string
  categoryId: string | null
}

export type RecurringApplyResult = {
  applied: number
  skipped: number
}

export type OfxPreview = {
  bankId: string | null
  accountNumber: string | null
  currency: string | null
  startDate: string | null
  endDate: string | null
  ledgerBalanceCents: number | null
  transactions: OfxPreviewTransaction[]
}

export type OfxImportItem = {
  externalId: string
  type: 'income' | 'expense'
  amountCents: number
  description: string
  occurredOn: string
  categoryId: string | null
}

export type OfxImportResult = {
  imported: number
  skipped: number
}

type Created = { id: string }

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

export const financeApi = {
  dashboard: (month: string, signal?: AbortSignal) =>
    apiRequest<Dashboard>(withQuery('/dashboard', { month }), { signal }),

  accounts: {
    list: (signal?: AbortSignal) => apiRequest<Account[]>('/accounts', { signal }),
    create: (input: AccountInput) => apiRequest<Created>('/accounts', { method: 'POST', body: input }),
    remove: (id: string) => apiRequest<void>(`/accounts/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: (signal?: AbortSignal) => apiRequest<Category[]>('/categories', { signal }),
    create: (input: CategoryInput) => apiRequest<Created>('/categories', { method: 'POST', body: input }),
    remove: (id: string) => apiRequest<void>(`/categories/${id}`, { method: 'DELETE' }),
  },

  transactions: {
    list: (filters: { month?: string; accountId?: string; categoryId?: string }, signal?: AbortSignal) =>
      apiRequest<Transaction[]>(withQuery('/transactions', filters), { signal }),
    create: (input: TransactionInput) =>
      apiRequest<Created>('/transactions', { method: 'POST', body: input }),
    remove: (id: string) => apiRequest<void>(`/transactions/${id}`, { method: 'DELETE' }),

    // Lê o arquivo OFX no servidor e devolve os lançamentos (com aviso dos já importados na conta).
    previewOfx: (file: File, accountId?: string) => {
      const form = new FormData()
      form.append('file', file)
      return apiRequest<OfxPreview>(withQuery('/transactions/import/ofx/preview', { accountId }), {
        method: 'POST',
        body: form,
      })
    },
    importOfx: (input: { accountId: string; transactions: OfxImportItem[] }) =>
      apiRequest<OfxImportResult>('/transactions/import/ofx', { method: 'POST', body: input }),
  },

  budgets: {
    list: (month: string, signal?: AbortSignal) =>
      apiRequest<Budget[]>(withQuery('/budgets', { month }), { signal }),
    upsert: (input: BudgetInput) => apiRequest<void>('/budgets', { method: 'PUT', body: input }),
    remove: (id: string) => apiRequest<void>(`/budgets/${id}`, { method: 'DELETE' }),
  },

  recurring: {
    list: (month: string, signal?: AbortSignal) =>
      apiRequest<RecurringItem[]>(withQuery('/recurring', { month }), { signal }),
    create: (input: RecurringInput) =>
      apiRequest<Created>('/recurring', { method: 'POST', body: input }),
    remove: (id: string) => apiRequest<void>(`/recurring/${id}`, { method: 'DELETE' }),
    applyMonth: (month: string) =>
      apiRequest<RecurringApplyResult>(withQuery('/recurring/apply', { month }), { method: 'POST' }),
    applyOne: (id: string, month: string) =>
      apiRequest<RecurringApplyResult>(withQuery(`/recurring/${id}/apply`, { month }), { method: 'POST' }),
  },
}
