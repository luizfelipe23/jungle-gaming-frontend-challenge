const sessionTokenKey = 'frontend-challenge:auth:session:v1'

export function readSessionToken() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(sessionTokenKey)
  } catch {
    return null
  }
}

export function storeSessionToken(token: string) {
  try {
    window.localStorage.setItem(sessionTokenKey, token)
  } catch {
    // Authentication stays in memory if browser storage is unavailable.
  }
}

export function clearSessionToken() {
  try {
    window.localStorage.removeItem(sessionTokenKey)
  } catch {
    // Ignore unavailable browser storage while clearing the in-memory session.
  }
}

export const sessionTokenStorageKey = sessionTokenKey
