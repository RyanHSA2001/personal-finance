// Regras de validação dos formulários de login e de primeiro acesso. Funções puras, sem React.

export type LoginFields = {
  email: string
  password: string
}

export type LoginFieldErrors = Partial<Record<keyof LoginFields, string>>

export type SetupFields = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export type SetupFieldErrors = Partial<Record<keyof SetupFields, string>>

const EMAIL_MAX_LENGTH = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MAX_LENGTH = 120
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

export function isValidEmail(value: string): boolean {
  return validateEmail(value) === undefined
}

// Retorna a mensagem de erro do e-mail, ou undefined quando é válido.
function validateEmail(value: string): string | undefined {
  const email = value.trim()

  if (!email) return 'Informe seu e-mail.'
  if (email.length > EMAIL_MAX_LENGTH) return 'Este e-mail é muito longo.'
  if (!EMAIL_PATTERN.test(email)) return 'Digite um e-mail válido, como nome@dominio.com.'

  return undefined
}

export function validateLogin({ email, password }: LoginFields): LoginFieldErrors {
  const errors: LoginFieldErrors = {}

  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError

  if (!password) {
    errors.password = 'Informe sua senha.'
  }

  return errors
}

export function validateSetup({ name, email, password, confirmPassword }: SetupFields): SetupFieldErrors {
  const errors: SetupFieldErrors = {}
  const trimmedName = name.trim()

  if (!trimmedName) {
    errors.name = 'Informe seu nome.'
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = `Use até ${NAME_MAX_LENGTH} caracteres.`
  }

  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirme sua senha.'
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'As senhas não conferem.'
  }

  return errors
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean)
}
