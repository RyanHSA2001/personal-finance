import {
  clearAccessToken,
  getAccessToken,
  notifyAuthBroadcast,
  refreshSession,
  type ActiveSession,
} from './authService'

// Disparado quando a sessão expirou e não foi possível renovar via refresh token.
// O App escuta este evento e volta para a tela de login.
export const AUTH_EXPIRED_EVENT = 'personalcontrol:auth-expired'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

function buildFetchInit(options: RequestOptions, token: string | null): RequestInit {
  const headers: Record<string, string> = {}
  // FormData (upload de arquivos) vai como multipart; o navegador define o Content-Type com o boundary.
  const isForm = options.body instanceof FormData

  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  return {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    credentials: 'same-origin',
    signal: options.signal,
  }
}

async function sendFetch(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  try {
    return await fetch(path, buildFetchInit(options, token))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Não foi possível conectar ao servidor.')
  }
}

// Chamada à API com o token JWT anexado e renovação silenciosa automática em caso de 401.
// Respostas 204 devolvem undefined.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await sendFetch(path, options, getAccessToken())

  if (response.status === 401) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await sendFetch(path, options, refreshed.accessToken)
    }
  }

  if (response.status === 401) {
    clearAccessToken()
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    throw new ApiError(401, 'Sua sessão expirou. Entre novamente.')
  }

  if (response.status === 204) return undefined as T

  const data = (await response.json().catch(() => null)) as { error?: string } | T | null

  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error
    throw new ApiError(response.status, message ?? 'Não foi possível concluir a operação.')
  }

  return data as T
}

export type AllowedEmailEntry = {
  id: string
  email: string
  note: string
  createdAtUtc: string
  isRegistered: boolean
}

export type AdminUserSummary = {
  id: string
  name: string
  email: string
  isAdmin: boolean
  createdAtUtc: string
}

export const adminApi = {
  allowedEmails: {
    list: (signal?: AbortSignal) => apiRequest<AllowedEmailEntry[]>('/admin/allowed-emails', { signal }),
    add: (email: string, note: string) =>
      apiRequest<AllowedEmailEntry>('/admin/allowed-emails', {
        method: 'POST',
        body: { email, note },
      }),
    remove: (id: string) => apiRequest<void>(`/admin/allowed-emails/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: (signal?: AbortSignal) => apiRequest<AdminUserSummary[]>('/admin/users', { signal }),
  },
}

export const sessionApi = {
  list: (signal?: AbortSignal) => apiRequest<ActiveSession[]>('/auth/sessions', { signal }),
  revoke: (id: string) => apiRequest<void>(`/auth/sessions/${id}`, { method: 'DELETE' }),
  logoutAll: async (keepCurrent: boolean) => {
    await apiRequest<void>(`/auth/logout-all?keepCurrent=${keepCurrent ? 'true' : 'false'}`, {
      method: 'POST',
    })
    if (!keepCurrent) {
      clearAccessToken()
      notifyAuthBroadcast('logout')
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
  },
}
