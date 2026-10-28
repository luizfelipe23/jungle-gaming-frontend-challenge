import axios from 'axios'

import { sessionExpiredEvent } from '../../features/auth/session-events'
import { readSessionToken } from '../../features/auth/session-token'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
const apiTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 15000)

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: Number.isFinite(apiTimeout) ? apiTimeout : 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = readSessionToken()
  const isCredentialRequest = /\/auth\/(login|register|session|logout)$/.test(config.url ?? '')
  if (token && !isCredentialRequest) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const isAuthRequest = /\/auth\/(login|register|session|logout)$/.test(url)
      if (!isAuthRequest && typeof window !== 'undefined') window.dispatchEvent(new Event(sessionExpiredEvent))
    }
    return Promise.reject(error)
  },
)
