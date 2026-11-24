import type { LoginStatus } from '../../hooks/useLogin'
import { ArrowRightIcon } from '../ui/Icons'
import './SubmitButton.css'

type SubmitButtonProps = {
  status: LoginStatus
}

// Botão de envio com estados de carregamento e sucesso.
function SubmitButton({ status }: SubmitButtonProps) {
  const isBusy = status === 'submitting'
  const isDone = status === 'success'

  return (
    <button className="submit-button" type="submit" disabled={isBusy || isDone} data-status={status}>
      <span className="submit-label">
        {isBusy && <span className="spinner" aria-hidden="true" />}
        {isBusy ? 'Entrando...' : isDone ? 'Conectado' : 'Entrar'}
      </span>
      {!isBusy && !isDone && <ArrowRightIcon className="submit-icon" />}
    </button>
  )
}

export default SubmitButton
