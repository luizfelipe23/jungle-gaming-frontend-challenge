import { http } from '../../../lib/api/http'
import { readSessionToken, storeSessionToken } from '../session-token'
import type { AuthSessionResponse, AuthUser, LoginInput, RegisterRequest } from '../types/auth'

export async function loginUser(credentials: LoginInput): Promise<AuthUser> {
  const response = await http.post<AuthSessionResponse>('/auth/login', credentials)
  storeSessionToken(response.data.token)
  return response.data.user
}

export async function registerUser(input: RegisterRequest): Promise<AuthUser> {
  const response = await http.post<{ user: AuthUser }>('/auth/register', input)
  return response.data.user
}

export async function getCurrentSession(): Promise<AuthUser> {
  const token = readSessionToken()
  const response = await http.get<{ user: AuthUser }>('/auth/session', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return response.data.user
}

export async function logoutUser(): Promise<void> {
  const token = readSessionToken()
  await http.post('/auth/logout', undefined, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}
