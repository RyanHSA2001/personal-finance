import type { ReactNode } from 'react'
import './TextField.css'

type TextFieldProps = {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  placeholder: string
  autoComplete: string
  icon: ReactNode
  error?: string
  valid?: boolean
  maxLength?: number
  onChange: (value: string) => void
  onBlur?: () => void
  endAdornment?: ReactNode
  hint?: ReactNode
}

// Campo de texto com ícone, estado de erro e indicador de válido.
// O erro e a dica são ligados ao input via aria-describedby.
function TextField({
  id,
  label,
  type = 'text',
  value,
  placeholder,
  autoComplete,
  icon,
  error,
  valid = false,
  maxLength,
  onChange,
  onBlur,
  endAdornment,
  hint,
}: TextFieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap" data-invalid={error ? 'true' : undefined} data-valid={valid ? 'true' : undefined}>
        {icon}
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={maxLength}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        {endAdornment}
      </div>
      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default TextField
