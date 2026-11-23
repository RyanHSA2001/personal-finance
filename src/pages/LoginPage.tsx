import Brand from '../components/Brand'
import LoginForm from '../components/LoginForm'
import './LoginPage.css'

function LoginPage() {
  return (
    <main className="login-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <Brand />

      <section className="login-card" aria-labelledby="login-title">
        <div className="card-heading">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Seu controle em um só lugar
          </span>
          <h1 id="login-title">Boas-vindas de volta</h1>
        </div>

        <LoginForm />

        <div className="card-footer">
          <span className="secure-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <span>Acesso pessoal e privado</span>
        </div>
      </section>

      <footer className="page-footer">
        <span>Um passo de cada vez, em direção aos seus objetivos.</span>
      </footer>
    </main>
  )
}

export default LoginPage
