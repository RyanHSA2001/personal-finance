import { useState } from 'react'
import { CapsIcon, EyeIcon, EyeOffIcon, LockIcon } from '../ui/Icons'
import TextField from '../ui/TextField'

type PasswordFieldProps = {
  value: string
  error?: string
  capsLockOn: boolean
  onChange: (value: string) => void
  onBlur?: () => void
}

// Campo de senha com alternância de visibilidade e aviso de Caps Lock.
function PasswordField({ value, error, capsLockOn, onChange, onBlur }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      id="password"
      label="Senha"
      type={visible ? 'text' : 'password'}
      value={value}
      placeholder="Digite sua senha"
      autoComplete="current-password"
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
