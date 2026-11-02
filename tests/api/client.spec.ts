import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, SESSION_TOKEN_HEADER, setSessionTokenProvider } from '@/api/client'
import { ApiError } from '@/api/errors'

const originalAdapter = http.defaults.adapter
let lastConfig: InternalAxiosRequestConfig | undefined

function respondWith(data: unknown, status = 200): AxiosAdapter {
  return async (config) => {
    lastConfig = config
    const response = { data, status, statusText: '', headers: {}, config }
    if (status >= 400) {
      throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response)
    }
    return response
  }
}

function failWith(code: string): AxiosAdapter {
  return async (config) => {
    lastConfig = config
    throw new AxiosError('failed', code, config)
  }
}

beforeEach(() => {
  lastConfig = undefined
  setSessionTokenProvider(() => null)
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
})

describe("oturum anahtarı interceptor'ı", () => {
  it('oturum uç noktalarına X-Session-Token ekler', async () => {
    setSessionTokenProvider(() => 'gizli-anahtar')
    http.defaults.adapter = respondWith({})

    await http.get('/sessions/abc/question/')

    expect(lastConfig?.headers.get(SESSION_TOKEN_HEADER)).toBe('gizli-anahtar')
  })

  it('herkese açık uç noktalara anahtar göndermez', async () => {
    setSessionTokenProvider(() => 'gizli-anahtar')
    http.defaults.adapter = respondWith([])

    await http.get('/categories/')
    expect(lastConfig?.headers.has(SESSION_TOKEN_HEADER)).toBe(false)

    await http.get('/leaderboard/', { params: { category: 'fizik' } })
    expect(lastConfig?.headers.has(SESSION_TOKEN_HEADER)).toBe(false)
  })

  it('anahtar yokken başlık eklemez', async () => {
    http.defaults.adapter = respondWith({})

    await http.get('/sessions/abc/question/')

    expect(lastConfig?.headers.has(SESSION_TOKEN_HEADER)).toBe(false)
  })
})

describe('hata yönetimi', () => {
  it("backend hata gövdesini ApiError'a çevirir", async () => {
    http.defaults.adapter = respondWith(
      { error: { code: 'already_answered', message: 'Bu soru zaten cevaplanmış.', details: {} } },
      409,
    )

    const error = await http.post('/sessions/abc/answer/', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: 'already_answered',
      message: 'Bu soru zaten cevaplanmış.',
      status: 409,
    })
  })

  it('doğrulama hatasının alan ayrıntılarını korur', async () => {
    http.defaults.adapter = respondWith(
      {
        error: {
          code: 'validation_error',
          message: 'Eksik veya geçersiz alan.',
          details: { player_name: ['Bu isim kullanılamaz.'] },
        },
      },
      400,
    )

    const error = (await http.post('/sessions/abc/score/', {}).catch((e: unknown) => e)) as ApiError

    expect(error.details).toEqual({ player_name: ['Bu isim kullanılamaz.'] })
  })

  it('ağ hatasını network_error olarak bildirir', async () => {
    http.defaults.adapter = failWith('ERR_NETWORK')

    const error = await http.get('/categories/').catch((e: unknown) => e)

    expect(error).toMatchObject({ code: 'network_error', status: 0 })
  })

  it('zaman aşımını timeout olarak bildirir', async () => {
    http.defaults.adapter = failWith('ECONNABORTED')

    const error = await http.get('/categories/').catch((e: unknown) => e)

    expect(error).toMatchObject({ code: 'timeout' })
  })

  it('biçimi bilinmeyen sunucu yanıtını server_error yapar', async () => {
    http.defaults.adapter = respondWith('<html>502</html>', 502)

    const error = await http.get('/categories/').catch((e: unknown) => e)

    expect(error).toMatchObject({ code: 'server_error', status: 502 })
  })
})
