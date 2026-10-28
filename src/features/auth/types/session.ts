import type { AuthUser } from './auth'

export interface MockUserRecord extends AuthUser {
  salt: string
  passwordHash: string
}

export interface MockSessionRecord {
  token: string
  userId: string
  expiresAt: number
}

export const mockUsersStorageKey = 'frontend-challenge:mock-auth:users:v1'
export const mockSessionsStorageKey = 'frontend-challenge:mock-auth:sessions:v1'
