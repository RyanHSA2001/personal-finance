import { clearStoredToken, getStoredToken } from './authService'

// Disparado quando a API responde 401 (token ausente, inválido ou expirado).
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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

// Chamada à API com o token JWT anexado. Respostas 204 devolvem undefined.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getStoredToken()
  // FormData (upload de arquivos) vai como multipart; o navegador define o Content-Type com o boundary.
  const isForm = options.body instanceof FormData

  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Não foi possível conectar ao servidor.')
  }

  if (response.status === 401) {
    clearStoredToken()
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
