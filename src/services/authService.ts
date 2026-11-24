// Comunicação com a API de autenticação (PersonalControl.Api).
// Não depende do React: pode ser usada de qualquer lugar do front.

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthSession = {
  accessToken: string
  expiresAtUtc: string
}

export type LoginFailureReason = 'invalid-credentials' | 'unavailable'

export type LoginResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: LoginFailureReason }

const TOKEN_KEY = 'personalcontrol.token'

export async function login(
  credentials: LoginCredentials,
  signal?: AbortSignal,
): Promise<LoginResult> {
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      signal,
    })

    if (response.status === 401) {
      return { ok: false, reason: 'invalid-credentials' }
    }

    if (!response.ok) {
      return { ok: false, reason: 'unavailable' }
    }

    const session = (await response.json()) as AuthSession
    storeToken(session.accessToken)
    return { ok: true, session }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export function storeToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Armazenamento indisponível (ex.: modo privado restrito). O login segue válido na sessão atual.
  }
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
