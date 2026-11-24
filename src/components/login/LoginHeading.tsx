import type { AuthMode } from '../../hooks/useLogin'
import './LoginHeading.css'

type LoginHeadingProps = {
  mode: AuthMode
}

// Cabeçalho do cartão: selo, título e subtítulo.
// Em modo 'setup' (primeiro acesso) mostra o texto de cadastro.
function LoginHeading({ mode }: LoginHeadingProps) {
  if (mode === 'setup') {
    return (
      <div className="card-heading">
        <span className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          Primeiro acesso
        </span>
        <h1 id="login-title">Crie seu acesso</h1>
        <p>Ainda não há usuários neste aplicativo. Cadastre-se para começar.</p>
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
