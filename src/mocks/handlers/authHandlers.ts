import { http, HttpResponse } from 'msw'

import type { AuthApiError } from '../../features/auth/types/auth'
import type { MockSessionRecord, MockUserRecord } from '../../features/auth/types/session'
import { demoAuthUsers } from '../data/authUsers'
import { mockSessionsStorageKey, mockUsersStorageKey } from '../../features/auth/types/session'

const passwordIterations = 80_000
const sessionDurationMs = 60 * 60 * 1000
const textEncoder = new TextEncoder()

function readStoredArray<T>(key: string): T[] | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as T[] : null
  } catch {
    return null
  }
}

function getUsers(): MockUserRecord[] {
  return readStoredArray<MockUserRecord>(mockUsersStorageKey) ?? demoAuthUsers
}

function saveUsers(users: MockUserRecord[]) {
  window.localStorage.setItem(mockUsersStorageKey, JSON.stringify(users))
}

function getSessions(): MockSessionRecord[] {
  return readStoredArray<MockSessionRecord>(mockSessionsStorageKey) ?? []
}

function saveSessions(sessions: MockSessionRecord[]) {
  window.localStorage.setItem(mockSessionsStorageKey, JSON.stringify(sessions))
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: textEncoder.encode(salt), iterations: passwordIterations, hash: 'SHA-256' }, key, 256)
  return toHex(new Uint8Array(bits))
}

function getToken(request: Request) {
  const authorization = request.headers.get('Authorization')
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
}

function authError(code: AuthApiError['code'], message: string, status: number, fieldErrors?: AuthApiError['fieldErrors']) {
  return HttpResponse.json<AuthApiError>({ code, message, ...(fieldErrors ? { fieldErrors } : {}) }, { status })
}

function removeSession(token: string | null) {
  if (token) saveSessions(getSessions().filter((session) => session.token !== token))
}

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; password?: unknown } | null
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const fieldErrors: AuthApiError['fieldErrors'] = {}

    if (name.length < 2) fieldErrors.name = 'Informe seu nome completo.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
    if (password.length < 10 || !/\d/.test(password)) fieldErrors.password = 'Use ao menos 10 caracteres e inclua um número.'
    if (Object.keys(fieldErrors).length) return authError('VALIDATION_ERROR', 'Confira os campos destacados.', 400, fieldErrors)

    const users = getUsers()
    if (users.some((user) => user.email === email)) return authError('EMAIL_EXISTS', 'Este e-mail já possui uma conta.', 409, { email: 'Este e-mail já está cadastrado.' })

    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
    const passwordHash = await hashPassword(password, salt)
    const user: MockUserRecord = {
      id: `user-${crypto.randomUUID()}`,
      name,
      email,
      salt,
      passwordHash,
    }
    saveUsers([...users, user])

    return HttpResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password) return authError('VALIDATION_ERROR', 'Informe e-mail e senha.', 400)

    const user = getUsers().find((candidate) => candidate.email === email)
    const passwordHash = user ? await hashPassword(password, user.salt) : ''
    if (!user || passwordHash !== user.passwordHash) return authError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 401)

    const token = crypto.randomUUID()
    const sessions = getSessions()
    removeSession(getToken(request))
    saveSessions([...sessions.filter((session) => session.token !== getToken(request)), { token, userId: user.id, expiresAt: Date.now() + sessionDurationMs }])

    return HttpResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  }),

  http.get('/api/auth/session', ({ request }) => {
    const token = getToken(request)
    const sessions = getSessions()
    const session = sessions.find((candidate) => candidate.token === token)
    if (!token || !session) return authError('UNAUTHENTICATED', 'É necessário entrar na sua conta.', 401)
    if (session.expiresAt <= Date.now()) {
      removeSession(token)
      return authError('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.', 401)
    }

    const user = getUsers().find((candidate) => candidate.id === session.userId)
    if (!user) {
      removeSession(token)
      return authError('UNAUTHENTICATED', 'Não foi possível localizar a conta desta sessão.', 401)
    }

    return HttpResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
  }),

  http.post('/api/auth/logout', ({ request }) => {
    removeSession(getToken(request))
    return new HttpResponse(null, { status: 204 })
  }),
]
