import axios from 'axios'
import { toApiError } from './errors'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const SESSION_TOKEN_HEADER = 'X-Session-Token'

let tokenProvider: () => string | null = () => null

/** Pinia store'u, oturum anahtarını interceptor'a bu fonksiyonla bildirir. */
export function setSessionTokenProvider(provider: () => string | null) {
  tokenProvider = provider
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  // Oturum anahtarı yalnızca oturum uç noktalarına gider; kategori ve skor tablosu herkese açık.
  const token = tokenProvider()
  if (token && config.url?.startsWith('/sessions/')) {
    config.headers.set(SESSION_TOKEN_HEADER, token)
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
