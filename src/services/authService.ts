// Comunicação com a API de autenticação (PersonalControl.Api).
// Não depende do React: pode ser usada de qualquer lugar do front.

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
}

// 'invalid-credentials': e-mail ou senha incorretos (401).
// 'rejected': dados recusados pela API, com mensagem própria (400 ou 403).
// 'unavailable': API fora do ar ou erro inesperado.
export type AuthFailureReason = 'invalid-credentials' | 'rejected' | 'unavailable'

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: AuthFailureReason; message?: string }

const TOKEN_KEY = 'personalcontrol.token'

export function login(credentials: LoginCredentials, signal?: AbortSignal): Promise<AuthResult> {
  return postAuth('/auth/login', credentials, signal)
}

// Cadastro do primeiro acesso. Já devolve a sessão, então o usuário entra logo em seguida.
export function register(data: RegisterData, signal?: AbortSignal): Promise<AuthResult> {
  return postAuth('/auth/register', data, signal)
}

// Indica se ainda não há usuários cadastrados. Retorna null se a API não responder.
export async function fetchRequiresSetup(signal?: AbortSignal): Promise<boolean | null> {
  try {
    const response = await fetch('/auth/setup', { signal })
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
      signal,
    })

    if (response.ok) {
      const session = (await response.json()) as AuthSession
      storeToken(session.accessToken)
      return { ok: true, session }
    }

    if (response.status === 401) {
      return { ok: false, reason: 'invalid-credentials' }
    }

    if (response.status === 400 || response.status === 403 || response.status === 409) {
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

export function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada a fazer: sem armazenamento, não há token salvo.
  }
}
