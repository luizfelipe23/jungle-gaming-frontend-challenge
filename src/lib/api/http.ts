import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
const apiTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 15000)

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: Number.isFinite(apiTimeout) ? apiTimeout : 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
)
