import { useCallback, useEffect, useRef, useState } from 'react'
import { login, type LoginCredentials, type LoginResult } from '../services/authService'

export type LoginStatus = 'idle' | 'submitting' | 'success' | 'error'

const MESSAGES = {
  success: 'Login realizado com sucesso.',
  invalidCredentials: 'E-mail ou senha incorretos.',
  unavailable: 'Não foi possível conectar ao servidor. Tente novamente.',
} as const

// Controla o ciclo do envio: idle → submitting → success | error.
// Cancela a requisição pendente se o formulário for desmontado.
export function useLogin() {
  const [status, setStatus] = useState<LoginStatus>('idle')
  const [message, setMessage] = useState('')
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const submit = useCallback(async (credentials: LoginCredentials): Promise<LoginResult | null> => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setStatus('submitting')
    setMessage('')

    const result = await login(credentials, controller.signal)
    if (controller.signal.aborted) return null

    if (result.ok) {
      setStatus('success')
      setMessage(MESSAGES.success)
    } else {
      setStatus('error')
      setMessage(
        result.reason === 'invalid-credentials' ? MESSAGES.invalidCredentials : MESSAGES.unavailable,
      )
    }

    return result
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setMessage('')
  }, [])

  return { status, message, submit, reset }
}
