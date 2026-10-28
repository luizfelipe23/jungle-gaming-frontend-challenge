export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
  confirmPassword: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'SESSION_ALREADY_ACTIVE'
  | 'TEMPORARY_FAILURE'

export interface AuthApiError {
  code: AuthErrorCode
  message: string
  fieldErrors?: Partial<Record<'name' | 'email' | 'password', string>>
}

export interface AuthSessionResponse {
  user: AuthUser
  token: string
}
