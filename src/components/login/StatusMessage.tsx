import type { LoginStatus } from '../../hooks/useLogin'
import { AlertIcon, CheckIcon } from '../ui/Icons'
import './StatusMessage.css'

type StatusMessageProps = {
  status: LoginStatus
  message: string
}

// Mensagem de resultado do envio. Anunciada por leitores de tela (role="status").
function StatusMessage({ status, message }: StatusMessageProps) {
  if (!message) {
    return <p className="status-message" role="status" aria-live="polite" />
  }

  const isSuccess = status === 'success'

  return (
    <p
      className={`status-message is-${isSuccess ? 'success' : 'error'}`}
      role="status"
      aria-live="polite"
    >
      {isSuccess ? <CheckIcon className="status-icon" /> : <AlertIcon className="status-icon" />}
      <span>{message}</span>
    </p>
  )
}

export default StatusMessage
