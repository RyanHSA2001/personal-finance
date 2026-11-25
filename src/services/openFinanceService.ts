// Chamadas à API de Open Finance (Pluggy). As credenciais ficam somente no backend.

import { apiRequest } from './apiClient'

export type OpenFinanceStatus = {
  configured: boolean
  credentialsSource: 'user' | 'server' | 'none'
  clientIdPreview: string | null
  credentialsUpdatedAt: string | null
  itemCount: number
  linkedAccountsCount: number
  linkedCardsCount: number
}

export type PluggyAccountLink = {
  id: string
  pluggyAccountId: string
  pluggyType: string
  pluggySubtype: string
  name: string
  maskedNumber: string | null
  currencyCode: string
  remoteBalanceCents: number
  localAccountId: string | null
  localAccountName: string | null
  localCardId: string | null
  localCardName: string | null
  lastSyncedAt: string | null
}

export type PluggyItem = {
  id: string
  pluggyItemId: string
  connectorName: string
  connectorImageUrl: string | null
  connectorColor: string | null
  status: string
  executionStatus: string | null
  lastError: string | null
  lastSyncedAt: string | null
  links: PluggyAccountLink[]
}

export type PluggyInvestment = {
  id: string
  name: string
  type: string
  subtype: string | null
  balanceCents: number
  profitCents: number | null
  institutionName: string | null
}

export type SyncItemResult = {
  itemRowId: string
  pluggyItemId: string
  connectorName: string
  status: string
  accountsSynced: number
  cardsSynced: number
  transactionsImported: number
  cardTransactionsImported: number
  investmentsCount: number
  investmentsTotalCents: number
}

export const openFinanceApi = {
  status: (signal?: AbortSignal) =>
    apiRequest<OpenFinanceStatus>('/open-finance/status', { signal }),

  saveCredentials: (clientId: string, clientSecret: string) =>
    apiRequest<OpenFinanceStatus>('/open-finance/credentials', {
      method: 'PUT',
      body: { clientId, clientSecret },
    }),

  removeCredentials: () =>
    apiRequest<void>('/open-finance/credentials', { method: 'DELETE' }),

  createConnectToken: (itemId?: string) =>
    apiRequest<{ accessToken: string }>('/open-finance/connect-token', {
      method: 'POST',
      body: itemId ? { itemId } : {},
    }),

  listItems: (signal?: AbortSignal) =>
    apiRequest<PluggyItem[]>('/open-finance/items', { signal }),

  linkItem: (pluggyItemId: string, days = 90) =>
    apiRequest<SyncItemResult>('/open-finance/items', {
      method: 'POST',
      body: { pluggyItemId, days },
    }),

  syncItem: (id: string, days = 90, triggerRemoteRefresh = false) =>
    apiRequest<SyncItemResult>(`/open-finance/items/${id}/sync`, {
      method: 'POST',
      body: { days, triggerRemoteRefresh },
    }),

  listInvestments: (id: string, signal?: AbortSignal) =>
    apiRequest<PluggyInvestment[]>(`/open-finance/items/${id}/investments`, { signal }),

  removeItem: (id: string) =>
    apiRequest<void>(`/open-finance/items/${id}`, { method: 'DELETE' }),
}
