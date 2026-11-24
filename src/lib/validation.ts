// Regras de validação do formulário de login. Funções puras, sem React.

export type LoginFields = {
  email: string
  password: string
}

export type LoginFieldErrors = Partial<Record<keyof LoginFields, string>>

const EMAIL_MAX_LENGTH = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  const email = value.trim()
  return email.length > 0 && email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email)
}

export function validateLogin({ email, password }: LoginFields): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    errors.email = 'Informe seu e-mail.'
  } else if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
    errors.email = 'Este e-mail é muito longo.'
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = 'Digite um e-mail válido, como nome@dominio.com.'
  }

  if (!password) {
    errors.password = 'Informe sua senha.'
  }

  return errors
}

export function hasErrors(errors: LoginFieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}
