import { useCallback, useEffect, useRef, useState } from 'react'
import { login, register, type AuthResult } from '../services/authService'

export type LoginStatus = 'idle' | 'submitting' | 'success' | 'error'

// 'login': usuário já cadastrado. 'setup': primeiro acesso, ainda não há usuários.
export type AuthMode = 'login' | 'setup'

// Campos do formulário. Em modo 'login', name e confirmPassword ficam vazios.
export type AuthFormValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

const MESSAGES = {
  loggedIn: 'Login realizado com sucesso.',
  accountCreated: 'Conta criada com sucesso.',
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

  const submit = useCallback(async (values: AuthFormValues, mode: AuthMode): Promise<AuthResult | null> => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setStatus('submitting')
    setMessage('')

    const email = values.email.trim()
    const result =
      mode === 'setup'
        ? await register({ name: values.name.trim(), email, password: values.password }, controller.signal)
        : await login({ email, password: values.password }, controller.signal)

    if (controller.signal.aborted) return null

    if (result.ok) {
      setStatus('success')
      setMessage(mode === 'setup' ? MESSAGES.accountCreated : MESSAGES.loggedIn)
    } else {
      setStatus('error')
      setMessage(
        result.message ??
          (result.reason === 'invalid-credentials' ? MESSAGES.invalidCredentials : MESSAGES.unavailable),
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
