import { useCallback, useEffect, useRef, useState } from 'react'
import Brand from '../components/Brand'
import AmbientBackground from '../components/login/AmbientBackground'
import LoginCard from '../components/login/LoginCard'
import LoginFooter from '../components/login/LoginFooter'
import LoginForm from '../components/login/LoginForm'
import LoginHeading from '../components/login/LoginHeading'
import { useLogin, type AuthFormValues, type AuthMode } from '../hooks/useLogin'
import { usePointerLight } from '../hooks/usePointerLight'
import { fetchRequiresSetup } from '../services/authService'
import './LoginPage.css'

type LoginPageProps = {
  onAuthenticated: () => void
}

// Tempo que a mensagem de sucesso fica na tela antes de entrar no aplicativo.
const SUCCESS_DELAY_MS = 900

// Página de login: monta o fundo, o cartão e liga o formulário à API.
// Se a API ainda não tiver nenhum usuário, mostra o cadastro de primeiro acesso.
function LoginPage({ onAuthenticated }: LoginPageProps) {
  const pageRef = useRef<HTMLElement>(null)
  usePointerLight(pageRef)

  const [mode, setMode] = useState<AuthMode>('login')
  const { status, message, submit, reset } = useLogin()
  const [shakeKey, setShakeKey] = useState(0)

  useEffect(() => {
    if (status !== 'success') return
    const timer = window.setTimeout(onAuthenticated, SUCCESS_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [status, onAuthenticated])

  useEffect(() => {
    const controller = new AbortController()

    fetchRequiresSetup(controller.signal).then((requiresSetup) => {
      if (requiresSetup) setMode('setup')
    })

    return () => controller.abort()
  }, [])

  const handleFailed = useCallback(() => setShakeKey((current) => current + 1), [])

  // Ao digitar depois de um erro, limpa a mensagem para não ficar desatualizada.
  const handleEdit = useCallback(() => {
    if (status === 'error') reset()
  }, [status, reset])

  const handleSubmit = useCallback((values: AuthFormValues) => submit(values, mode), [submit, mode])

  return (
    <main ref={pageRef} className="login-page">
      <AmbientBackground />
      <Brand />

      <LoginCard shakeKey={shakeKey} status={status}>
        <LoginHeading mode={mode} />
        <LoginForm
          mode={mode}
          status={status}
          message={message}
          onSubmit={handleSubmit}
          onEdit={handleEdit}
          onFailed={handleFailed}
        />
        <LoginFooter />
      </LoginCard>

      <footer className="page-footer">
        <span>Um passo de cada vez, em direção aos seus objetivos.</span>
      </footer>
    </main>
  )
}

export default LoginPage
