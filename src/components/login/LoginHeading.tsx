import type { AuthMode } from '../../hooks/useLogin'
import './LoginHeading.css'

type LoginHeadingProps = {
  mode: AuthMode
}

// Cabeçalho do cartão: selo, título e subtítulo.
function LoginHeading({ mode }: LoginHeadingProps) {
  if (mode === 'register') {
    return (
      <div className="card-heading">
        <span className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          Nova conta
        </span>
        <h1 id="login-title">Crie sua conta</h1>
        <p>Cadastre-se para começar a organizar suas finanças.</p>
      </div>
    )
  }

  return (
    <div className="card-heading">
      <span className="eyebrow">
        <span className="eyebrow-dot" aria-hidden="true" />
        Seu controle em um só lugar
      </span>
      <h1 id="login-title">Boas-vindas de volta</h1>
      <p>Entre para acompanhar suas finanças.</p>
    </div>
  )
}

export default LoginHeading
