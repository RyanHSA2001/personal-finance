import { useState, type FormEvent } from 'react'
import { useCapsLock } from '../../hooks/useCapsLock'
import type { AuthFormValues, AuthMode, LoginStatus } from '../../hooks/useLogin'
import type { AuthResult } from '../../services/authService'
import { hasErrors, isValidEmail, validateLogin, validateSetup } from '../../lib/validation'
import { MailIcon, UserIcon } from '../ui/Icons'
import TextField from '../ui/TextField'
import PasswordField from './PasswordField'
import StatusMessage from './StatusMessage'
import SubmitButton from './SubmitButton'
import './LoginForm.css'

type LoginFormProps = {
  mode: AuthMode
  status: LoginStatus
  message: string
  onSubmit: (values: AuthFormValues) => Promise<AuthResult | null>
  onEdit: () => void
  onFailed: () => void
}

type Field = 'name' | 'email' | 'password' | 'confirmPassword'
type Touched = Record<Field, boolean>

const UNTOUCHED: Touched = { name: false, email: false, password: false, confirmPassword: false }

// Formulário de login e de primeiro acesso: campos, validação em tempo real e envio.
// Não conhece a requisição HTTP: recebe o envio pronto pela página.
function LoginForm({ mode, status, message, onSubmit, onEdit, onFailed }: LoginFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState<Touched>(UNTOUCHED)
  const [submitted, setSubmitted] = useState(false)
  const capsLockOn = useCapsLock()

  const isRegister = mode === 'register'
  const values: AuthFormValues = { name, email, password, confirmPassword }
  const errors: Partial<Record<Field, string>> = isRegister ? validateSetup(values) : validateLogin(values)

  // Mostra o erro de um campo só depois que ele foi tocado ou o formulário foi enviado.
  const errorFor = (field: Field) => (submitted || touched[field] ? errors[field] : undefined)

  const nameError = isRegister ? errorFor('name') : undefined
  const emailError = errorFor('email')
  const passwordError = errorFor('password')
  const confirmError = isRegister ? errorFor('confirmPassword') : undefined

  const emailValid = isValidEmail(email)
  const nameValid = isRegister && name.trim().length > 0 && !errors.name

  function markTouched(field: Field) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  function handleNameChange(value: string) {
    setName(value)
    onEdit()
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    onEdit()
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    onEdit()
  }

  function handleConfirmChange(value: string) {
    setConfirmPassword(value)
    onEdit()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    if (hasErrors(errors)) {
      onFailed()
      return
    }

    const result = await onSubmit(values)
    if (!result) return

    if (result.ok) {
      // Sucesso: limpa as senhas e os estados de "já tentei enviar", sem mostrar erros.
      setPassword('')
      setConfirmPassword('')
      setSubmitted(false)
      setTouched(UNTOUCHED)
    } else {
      onFailed()
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {isRegister && (
        <TextField
          id="name"
          label="Nome"
          value={name}
          placeholder="Como você se chama?"
          autoComplete="name"
          maxLength={120}
          icon={<UserIcon className="field-icon" />}
          error={nameError}
          valid={nameValid}
          onChange={handleNameChange}
          onBlur={() => markTouched('name')}
        />
      )}

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
        onBlur={() => markTouched('email')}
      />

      {isRegister ? (
        <PasswordField
          value={password}
          placeholder="Crie uma senha (mínimo de 8 caracteres)"
          autoComplete="new-password"
          error={passwordError}
          capsLockOn={capsLockOn}
          onChange={handlePasswordChange}
          onBlur={() => markTouched('password')}
        />
      ) : (
        <PasswordField
          value={password}
          error={passwordError}
          capsLockOn={capsLockOn}
          onChange={handlePasswordChange}
          onBlur={() => markTouched('password')}
        />
      )}

      {isRegister && (
        <PasswordField
          id="confirm-password"
          label="Confirmar senha"
          placeholder="Digite a senha novamente"
          autoComplete="new-password"
          value={confirmPassword}
          error={confirmError}
          capsLockOn={capsLockOn}
          onChange={handleConfirmChange}
          onBlur={() => markTouched('confirmPassword')}
        />
      )}

      <SubmitButton status={status} mode={mode} />
      <StatusMessage status={status} message={message} />
    </form>
  )
}

export default LoginForm
