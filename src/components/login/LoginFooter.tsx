import { ShieldIcon } from '../ui/Icons'
import './LoginFooter.css'

// Rodapé do cartão com a garantia de acesso privado.
function LoginFooter() {
  return (
    <div className="card-footer">
      <ShieldIcon className="secure-icon" />
      <span>Acesso pessoal e privado</span>
    </div>
  )
}

export default LoginFooter
