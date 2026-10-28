import type { LoginInput, RegisterInput } from './types/auth'

export type AuthFieldErrors = Partial<Record<keyof RegisterInput, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLogin(input: LoginInput): AuthFieldErrors {
  const errors: AuthFieldErrors = {}
  if (!emailPattern.test(input.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!input.password) errors.password = 'Informe sua senha.'
  return errors
}

export function validateRegistration(input: RegisterInput): AuthFieldErrors {
  const errors: AuthFieldErrors = {}
  if (input.name.trim().length < 2) errors.name = 'Informe seu nome completo.'
  if (!emailPattern.test(input.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (input.password.length < 10 || !/\d/.test(input.password)) errors.password = 'Use ao menos 10 caracteres e inclua um número.'
  if (!input.confirmPassword) errors.confirmPassword = 'Confirme sua senha.'
  else if (input.password !== input.confirmPassword) errors.confirmPassword = 'As senhas não coincidem.'
  return errors
}

export function safeReturnTo(candidate?: string) {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return '/'

  try {
    const parsed = new URL(candidate, window.location.origin)
    if (parsed.origin !== window.location.origin) return '/'
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}
