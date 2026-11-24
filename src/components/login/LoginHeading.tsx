import './LoginHeading.css'

// Cabeçalho do cartão: selo, título e subtítulo.
function LoginHeading() {
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
