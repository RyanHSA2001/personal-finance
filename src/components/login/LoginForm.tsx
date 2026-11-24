import { useState, type FormEvent } from 'react'
import { useCapsLock } from '../../hooks/useCapsLock'
import type { LoginStatus } from '../../hooks/useLogin'
import type { LoginCredentials, LoginResult } from '../../services/authService'
import { hasErrors, isValidEmail, validateLogin } from '../../lib/validation'
import { MailIcon } from '../ui/Icons'
import TextField from '../ui/TextField'
import PasswordField from './PasswordField'
import StatusMessage from './StatusMessage'
import SubmitButton from './SubmitButton'
import './LoginForm.css'

type LoginFormProps = {
  status: LoginStatus
  message: string
  onSubmit: (credentials: LoginCredentials) => Promise<LoginResult | null>
  onEdit: () => void
  onFailed: () => void
}

type Touched = { email: boolean; password: boolean }

// Formulário de login: campos, validação em tempo real e envio.
// Não conhece a requisição HTTP: recebe o envio pronto pela página.
function LoginForm({ status, message, onSubmit, onEdit, onFailed }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<Touched>({ email: false, password: false })
  const [submitted, setSubmitted] = useState(false)
  const capsLockOn = useCapsLock()

  const errors = validateLogin({ email, password })
  const emailError = submitted || touched.email ? errors.email : undefined
  const passwordError = submitted || touched.password ? errors.password : undefined
  const emailValid = isValidEmail(email) && !emailError

  function handleEmailChange(value: string) {
    setEmail(value)
    onEdit()
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    onEdit()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    if (hasErrors(errors)) {
      onFailed()
      return
    }

    const result = await onSubmit({ email: email.trim(), password })
    if (!result) return

    if (result.ok) {
      // Sucesso: limpa a senha e os estados de "já tentei enviar", sem mostrar erros.
      setPassword('')
      setSubmitted(false)
      setTouched({ email: false, password: false })
    } else {
      onFailed()
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <TextField
        id="email"
        label="E-mail"
        type="email"
        value={email}
        placeholder="Digite seu e-mail"
        autoComplete="email"
        maxLength={254}
        icon={<MailIcon className="field-icon" />}
        error={emailError}
        valid={emailValid}
        onChange={handleEmailChange}
        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
      />

      <PasswordField
        value={password}
        error={passwordError}
        capsLockOn={capsLockOn}
        onChange={handlePasswordChange}
        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
      />

      <SubmitButton status={status} />
      <StatusMessage status={status} message={message} />
    </form>
  )
}

export default LoginForm
