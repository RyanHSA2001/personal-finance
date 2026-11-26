// Chamadas à API de cartões e faturas (espelha Cards/CardModels.cs no backend).
// Segurança: nunca trafega número completo do cartão, CVV ou senha.

import { apiRequest } from './apiClient'

export type CardKind = 'credit' | 'debit' | 'benefit'
export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other'
export type CardTransactionType = 'purchase' | 'refund'
export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'overdue'

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  benefit: 'Benefício (VR/VA)',
}

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  other: 'Outra',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: 'Aberta',
  closed: 'Fechada',
  paid: 'Paga',
  overdue: 'Vencida',
}

export const CARD_COLOR_PRESETS = [
  '#7c3aed', // Roxo
  '#1e293b', // Grafite
  '#0f766e', // Esmeralda
  '#1d4ed8', // Azul
  '#be123c', // Carmesim
  '#b45309', // Âmbar
  '#374151', // Chumbo
]

export type Card = {
  id: string
  name: string
  kind: CardKind
  brand: CardBrand
  issuer: string
  last4: string | null
  color: string
  creditLimitCents: number | null
  usedLimitCents: number
  availableLimitCents: number
  closingDay: number | null
  dueDay: number | null
  defaultPaymentAccountId: string | null
  defaultPaymentAccountName: string | null
  linkedAccountId: string | null
  linkedAccountName: string | null
  linkedAccountBalanceCents: number | null
  currentInvoiceMonth: string | null
  currentInvoiceCents: number
  currentInvoiceStatus: InvoiceStatus | null
  isArchived: boolean
}

export type CardInput = {
  name: string
  kind: CardKind
  brand: CardBrand
  issuer: string
  last4: string | null
  color: string
  creditLimitCents: number | null
  closingDay: number | null
  dueDay: number | null
  defaultPaymentAccountId: string | null
  linkedAccountId: string | null
  isArchived?: boolean
}

export type CardTransaction = {
  id: string
  cardId: string
  type: CardTransactionType
  amountCents: number
  description: string
  occurredOn: string
  billingMonth: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  installmentGroupId: string | null
  installmentNumber: number
  installmentTotal: number
}

export type CardInvoicePayment = {
  id: string
  amountCents: number
  paidOn: string
  accountId: string | null
  accountName: string | null
}

export type CardInvoice = {
  cardId: string
  cardName: string
  billingMonth: string
  closingDate: string
  dueDate: string
  status: InvoiceStatus
  totalCents: number
  paidAmountCents: number | null
  remainingCents: number
  paidOn: string | null
  paymentAccountId: string | null
  paymentAccountName: string | null
  payments: CardInvoicePayment[]
  items: CardTransaction[]
}

export type CardTransactionInput = {
  type: CardTransactionType
  totalAmountCents: number
  description: string
  occurredOn: string
  categoryId: string | null
  installments: number
  firstBillingMonth?: string | null
}

export type PayInvoiceInput = {
  accountId: string
  paidOn: string
  amountCents?: number | null
}

export type CardTransactionCreated = {
  id: string
  installmentGroupId: string | null
  createdCount: number
  firstBillingMonth: string
}

export const cardsApi = {
  list: (includeArchived = false, signal?: AbortSignal) =>
    apiRequest<Card[]>(`/cards?includeArchived=${includeArchived ? 'true' : 'false'}`, { signal }),

  create: (input: CardInput) =>
    apiRequest<{ id: string }>('/cards', { method: 'POST', body: input }),

  update: (id: string, input: CardInput) =>
    apiRequest<void>(`/cards/${id}`, { method: 'PUT', body: input }),

  remove: (id: string) =>
    apiRequest<void>(`/cards/${id}`, { method: 'DELETE' }),

  invoice: (cardId: string, month: string, signal?: AbortSignal) =>
    apiRequest<CardInvoice>(`/cards/${cardId}/invoice?month=${encodeURIComponent(month)}`, { signal }),

  addTransaction: (cardId: string, input: CardTransactionInput) =>
    apiRequest<CardTransactionCreated>(`/cards/${cardId}/transactions`, { method: 'POST', body: input }),

  removeTransaction: (cardId: string, txId: string, scope: 'single' | 'group' = 'single') =>
    apiRequest<void>(`/cards/${cardId}/transactions/${txId}?scope=${scope}`, { method: 'DELETE' }),

  payInvoice: (cardId: string, month: string, input: PayInvoiceInput) =>
    apiRequest<void>(`/cards/${cardId}/invoices/${encodeURIComponent(month)}/pay`, {
      method: 'POST',
      body: input,
    }),

  unpayInvoice: (cardId: string, month: string) =>
    apiRequest<void>(`/cards/${cardId}/invoices/${encodeURIComponent(month)}/payment`, {
      method: 'DELETE',
    }),

  removeInvoicePayment: (cardId: string, month: string, paymentId: string) =>
    apiRequest<void>(`/cards/${cardId}/invoices/${encodeURIComponent(month)}/payments/${paymentId}`, {
      method: 'DELETE',
    }),
}

// Calcula o mês da fatura (AAAA-MM) a partir da data da compra e do dia de fechamento.
// Compras a partir do dia de fechamento (virada do dia) já entram na fatura do mês seguinte.
export function computeBillingMonth(occurredOnIso: string, closingDay: number): string {
  const [year, month, day] = occurredOnIso.split('-').map(Number)
  if (!year || !month || !day) return occurredOnIso.slice(0, 7)

  const daysInMonth = new Date(year, month, 0).getDate()
  const effectiveClosing = Math.min(closingDay, daysInMonth)
  const target = day < effectiveClosing ? new Date(year, month - 1, 1) : new Date(year, month, 1)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
}
