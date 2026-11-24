import { useCallback, useRef, useState } from 'react'
import Brand from '../components/Brand'
import AmbientBackground from '../components/login/AmbientBackground'
import LoginCard from '../components/login/LoginCard'
import LoginFooter from '../components/login/LoginFooter'
import LoginForm from '../components/login/LoginForm'
import LoginHeading from '../components/login/LoginHeading'
import { useLogin } from '../hooks/useLogin'
import { usePointerLight } from '../hooks/usePointerLight'
import './LoginPage.css'

// Página de login: monta o fundo, o cartão e liga o formulário à API.
function LoginPage() {
  const pageRef = useRef<HTMLElement>(null)
  usePointerLight(pageRef)

  const { status, message, submit, reset } = useLogin()
  const [shakeKey, setShakeKey] = useState(0)

  const handleFailed = useCallback(() => setShakeKey((current) => current + 1), [])

  // Ao digitar depois de um erro, limpa a mensagem para não ficar desatualizada.
  const handleEdit = useCallback(() => {
    if (status === 'error') reset()
  }, [status, reset])

  return (
    <main ref={pageRef} className="login-page">
      <AmbientBackground />
      <Brand />

      <LoginCard shakeKey={shakeKey} status={status}>
        <LoginHeading />
        <LoginForm
          status={status}
          message={message}
          onSubmit={submit}
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
