import { useState } from 'react'
import { CapsIcon, EyeIcon, EyeOffIcon, LockIcon } from '../ui/Icons'
import TextField from '../ui/TextField'

type PasswordFieldProps = {
  id?: string
  label?: string
  placeholder?: string
  autoComplete?: string
  value: string
  error?: string
  capsLockOn: boolean
  onChange: (value: string) => void
  onBlur?: () => void
}

// Campo de senha com alternância de visibilidade e aviso de Caps Lock.
function PasswordField({
  id = 'password',
  label = 'Senha',
  placeholder = 'Digite sua senha',
  autoComplete = 'current-password',
  value,
  error,
  capsLockOn,
  onChange,
  onBlur,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      icon={<LockIcon className="field-icon" />}
      error={error}
      onChange={onChange}
      onBlur={onBlur}
      hint={
        capsLockOn ? (
          <span className="caps-warning">
            <CapsIcon className="caps-icon" /> Caps Lock está ativado
          </span>
        ) : undefined
      }
      endAdornment={
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon className="toggle-icon" /> : <EyeIcon className="toggle-icon" />}
        </button>
      }
    />
  )
}

export default PasswordField
