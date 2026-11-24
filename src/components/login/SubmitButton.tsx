import type { AuthMode, LoginStatus } from '../../hooks/useLogin'
import { ArrowRightIcon } from '../ui/Icons'
import './SubmitButton.css'

type SubmitButtonProps = {
  status: LoginStatus
  mode: AuthMode
}

// Botão de envio com estados de carregamento e sucesso.
function SubmitButton({ status, mode }: SubmitButtonProps) {
  const isBusy = status === 'submitting'
  const isDone = status === 'success'
  const isSetup = mode === 'setup'

  const idleLabel = isSetup ? 'Criar conta' : 'Entrar'
  const busyLabel = isSetup ? 'Criando conta...' : 'Entrando...'

  return (
    <button className="submit-button" type="submit" disabled={isBusy || isDone} data-status={status}>
      <span className="submit-label">
        {isBusy && <span className="spinner" aria-hidden="true" />}
        {isBusy ? busyLabel : isDone ? 'Conectado' : idleLabel}
      </span>
      {!isBusy && !isDone && <ArrowRightIcon className="submit-icon" />}
    </button>
  )
}

export default SubmitButton
