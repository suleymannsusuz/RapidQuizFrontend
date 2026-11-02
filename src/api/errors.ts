import { isAxiosError } from 'axios'
import type { ApiErrorBody } from './types'

/**
 * Backend hatası ya da ağ hatası. İstemci davranışı `code` alanına göre karar verir
 * (ör. `session_expired`); `message` kullanıcıya doğrudan gösterilebilir.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details: Record<string, unknown>

  constructor(code: string, message: string, status = 0, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== 'object' || data === null || !('error' in data)) return false
  const error = (data as { error: unknown }).error
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

/** Axios (ya da başka) hatasını `ApiError`'a çevirir. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    if (error.response) {
      const { data, status } = error.response
      if (isErrorBody(data)) {
        const { code, message, details } = data.error
        return new ApiError(code, message, status, details ?? {})
      }
      return new ApiError('server_error', 'Sunucudan beklenmeyen bir yanıt geldi.', status)
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'Sunucu zamanında yanıt vermedi.')
    }
    return new ApiError('network_error', 'Sunucuya ulaşılamadı. Bağlantını kontrol et.')
  }

  return new ApiError('unknown_error', 'Beklenmeyen bir hata oluştu.')
}
