import { useState, type FormEvent } from 'react'
import './LoginForm.css'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim()) {
      setNotice('Informe seu usuário para continuar.')
      return
    }

    setNotice('A tela está pronta. A autenticação será conectada ao configurar o backend.')
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="username">Usuário</label>
        <div className="input-wrap">
          <svg className="field-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20v-1.5a7 7 0 0 1 14 0V20H5Z" />
          </svg>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Digite seu usuário"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            required
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setNotice('')
            }}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="password">Senha</label>
        <div className="input-wrap">
          <svg className="field-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v2" />
          </svg>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setNotice('')
            }}
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9 7 9 7a15 15 0 0 1-3.1 3.8M6.2 6.2C3.9 7.8 3 12 3 12s3.5 7 9 7c1.2 0 2.3-.3 3.3-.8" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <button className="submit-button" type="submit">
        Entrar
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </button>
      <p className="form-notice" role="status" aria-live="polite">
        {notice}
      </p>
    </form>
  )
}

export default LoginForm
