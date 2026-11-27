import { ShieldIcon } from '../ui/Icons'
import './LoginFooter.css'

// Rodapé do cartão com a garantia de acesso privado e link para o app Android.
function LoginFooter() {
  return (
    <div className="card-footer">
      <div className="card-footer-row">
        <ShieldIcon className="secure-icon" />
        <span>Acesso pessoal e privado</span>
      </div>
      <a className="apk-download-link" href="/downloads/PersonalControl.apk" download="PersonalControl.apk">
        Baixar App Android (.apk)
      </a>
    </div>
  )
}

export default LoginFooter
