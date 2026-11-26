// Comunicação com a API de autenticação (PersonalControl.Api).
// O access token fica somente em memória (nunca em localStorage/sessionStorage);
// a persistência da sessão é feita pelo cookie HttpOnly gerenciado pelo servidor.

export type LoginCredentials = {
  email: string
  password: string
}

export type RegisterData = {
  name: string
  email: string
  password: string
}

export type AuthSession = {
  accessToken: string
  expiresAtUtc: string
  sessionId: string
  isAdmin?: boolean
}

export type ActiveSession = {
  id: string
  userAgent: string
  ipAddress: string
  createdAtUtc: string
  lastUsedAtUtc: string
  expiresAtUtc: string
  isCurrent: boolean
}

// 'invalid-credentials': e-mail ou senha incorretos (401).
// 'rejected': dados recusados pela API, com mensagem própria (400, 403, 409 ou 429).
// 'unavailable': API fora do ar ou erro inesperado.
export type AuthFailureReason = 'invalid-credentials' | 'rejected' | 'unavailable'

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: AuthFailureReason; message?: string }

const LEGACY_TOKEN_KEY = 'personalcontrol.token'
const AUTH_CHANNEL_NAME = 'personalcontrol-auth'
const TAB_ID = Math.random().toString(36).slice(2)

let accessToken: string | null = null
let currentIsAdmin = false
let refreshInFlight: Promise<AuthSession | null> | null = null

function clearLegacyStorage(): void {
  try {
    sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Ignora se o armazenamento estiver indisponível.
  }
}

clearLegacyStorage()

export function getAccessToken(): string | null {
  return accessToken
}

export function getIsAdmin(): boolean {
  return currentIsAdmin
}

export function setAccessToken(token: string | null, isAdmin?: boolean): void {
  accessToken = token
  if (typeof isAdmin === 'boolean') currentIsAdmin = isAdmin
}

export function clearAccessToken(): void {
  accessToken = null
  currentIsAdmin = false
  clearLegacyStorage()
}

export function notifyAuthBroadcast(type: 'logout' | 'login'): void {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    channel.postMessage({ type, sender: TAB_ID })
    channel.close()
  } catch {
    // Ignora se BroadcastChannel não estiver disponível.
  }
}

export function subscribeAuthBroadcast(onMessage: (type: 'logout' | 'login') => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent<{ type?: 'logout' | 'login'; sender?: string }>) => {
      if (event.data?.sender === TAB_ID) return
      if (event.data?.type === 'logout' || event.data?.type === 'login') {
        onMessage(event.data.type)
      }
    }
    return () => channel.close()
  } catch {
    return () => {}
  }
}

export function login(credentials: LoginCredentials, signal?: AbortSignal): Promise<AuthResult> {
  return postAuth('/auth/login', credentials, signal)
}

export function register(data: RegisterData, signal?: AbortSignal): Promise<AuthResult> {
  return postAuth('/auth/register', data, signal)
}

// Renova o access token usando o cookie HttpOnly. Compartilha uma única chamada em voo
// para que várias requisições 401 simultâneas não acionem rotação duplicada.
export function refreshSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        clearAccessToken()
        return null
      }

      const session = (await response.json()) as AuthSession
      setAccessToken(session.accessToken, Boolean(session.isAdmin))
      return session
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function logout(): Promise<void> {
  clearAccessToken()
  notifyAuthBroadcast('logout')
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
  } catch {
    // Mesmo offline, o estado local já foi limpo.
  }
}

export async function fetchRequiresSetup(signal?: AbortSignal): Promise<boolean | null> {
  try {
    const response = await fetch('/auth/setup', { signal, credentials: 'same-origin' })
    if (!response.ok) return null

    const data = (await response.json()) as { requiresSetup: boolean }
    return data.requiresSetup
  } catch {
    return null
  }
}

async function postAuth(path: string, body: unknown, signal?: AbortSignal): Promise<AuthResult> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    })

    if (response.ok) {
      const session = (await response.json()) as AuthSession
      setAccessToken(session.accessToken, Boolean(session.isAdmin))
      notifyAuthBroadcast('login')
      return { ok: true, session }
    }

    if (response.status === 401) {
      return { ok: false, reason: 'invalid-credentials' }
    }

    if (response.status === 400 || response.status === 403 || response.status === 409 || response.status === 429) {
      return { ok: false, reason: 'rejected', message: await readErrorMessage(response) }
    }

    return { ok: false, reason: 'unavailable' }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const data = (await response.json()) as { error?: string }
    return data.error
  } catch {
    return undefined
  }
}
