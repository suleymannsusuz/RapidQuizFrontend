import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import { fetchLeaderboard } from '@/api/leaderboard'
import { submitScore } from '@/api/sessions'
import type { useQuizStore } from '@/stores/quiz'
import { categories, makeBoard, makeResult, makeSubmitted } from '../fixtures'
import { buttonWithText, mountApp, tick, unmountAll, useGameClock } from '../helpers'

vi.mock('@/api/sessions', () => ({
  startSession: vi.fn(),
  fetchQuestion: vi.fn(),
  submitAnswer: vi.fn(),
  fetchResult: vi.fn(),
  submitScore: vi.fn(),
}))
vi.mock('@/api/categories', () => ({ fetchCategories: vi.fn() }))
vi.mock('@/api/leaderboard', () => ({ fetchLeaderboard: vi.fn() }))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

const seedResult = (store: ReturnType<typeof useQuizStore>) => {
  store.result = makeResult()
  store.sessionId = 'oturum-1'
}

async function openResult() {
  return mountApp('/result', seedResult)
}

async function submitName(
  wrapper: Awaited<ReturnType<typeof openResult>>['wrapper'],
  name: string,
) {
  await wrapper.get('input').setValue(name)
  await wrapper.get('form').trigger('submit')
}

beforeEach(() => {
  vi.resetAllMocks()
  useGameClock()
  vi.mocked(fetchCategories).mockResolvedValue(categories)
  vi.mocked(fetchLeaderboard).mockResolvedValue(makeBoard([]))
})

afterEach(() => {
  unmountAll()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ResultView', () => {
  it('biten quiz yoksa ana sayfaya yönlenir', async () => {
    const { router } = await mountApp('/result')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('kategori, doğru sayısı ve toplam süreyi gösterir', async () => {
    const { wrapper } = await openResult()

    expect(wrapper.text()).toContain('Quiz bitti!')
    expect(wrapper.text()).toContain('Yazılım')
    expect(wrapper.text()).toContain('17')
    expect(wrapper.text()).toContain('/ 20')
    expect(wrapper.text()).toContain('1 dk 3 sn')
  })

  it("puan 0'dan sayarak artar ve sunucunun verdiği puanda biter", async () => {
    const { wrapper } = await openResult()
    const score = () => Number(wrapper.get('[data-testid="final-score"]').text())

    expect(score()).toBe(0)
    await tick(600)
    expect(score()).toBeGreaterThan(0)
    expect(score()).toBeLessThan(2310)

    await tick(1000)
    expect(score()).toBe(2310)
  })

  it('hareketi azalt açıkken puanı doğrudan gösterir', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const { wrapper } = await openResult()

    expect(wrapper.get('[data-testid="final-score"]').text()).toBe('2310')
  })

  it('"Tekrar oyna" aynı kategorinin quiz sayfasına gider', async () => {
    const { wrapper } = await openResult()

    const link = wrapper.findAll('a').find((a) => a.text() === 'Tekrar oyna')

    expect(link?.attributes('href')).toBe('/quiz/yazilim')
  })
})

describe('isim formu', () => {
  it('geçerli isimle skoru kaydeder ve skor tablosuna geçer', async () => {
    vi.mocked(submitScore).mockResolvedValue(makeSubmitted({ rank: 4 }))
    const { wrapper, router, store } = await openResult()

    await submitName(wrapper, 'Ayşe')
    await tick()

    expect(submitScore).toHaveBeenCalledWith('oturum-1', { player_name: 'Ayşe' })
    expect(store.submitted?.rank).toBe(4)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('leaderboard'))
    expect(router.currentRoute.value.params.category).toBe('yazilim')
  })

  it('geçersiz isim sunucuya gönderilmez', async () => {
    const { wrapper } = await openResult()

    await submitName(wrapper, 'a')

    expect(submitScore).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('2–20 karakter')
  })

  it('sunucu ismi reddederse (küfür vb.) mesajı gösterir ve sayfada kalır', async () => {
    vi.mocked(submitScore).mockRejectedValue(
      new ApiError('validation_error', 'Eksik veya geçersiz alan.', 400, {
        player_name: ['Bu isim kullanılamaz.'],
      }),
    )
    const { wrapper, router, store } = await openResult()

    await submitName(wrapper, 'Kötü İsim')
    await tick()

    expect(wrapper.get('[role="alert"]').text()).toBe('Bu isim kullanılamaz.')
    expect(router.currentRoute.value.name).toBe('result')
    expect(store.submitted).toBeNull()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('düzeltilen isimle yeniden gönderilebilir', async () => {
    vi.mocked(submitScore)
      .mockRejectedValueOnce(
        new ApiError('validation_error', 'Hatalı.', 400, {
          player_name: ['Bu isim kullanılamaz.'],
        }),
      )
      .mockResolvedValueOnce(makeSubmitted())
    const { wrapper, router } = await openResult()

    await submitName(wrapper, 'Kötü')
    await tick()
    await submitName(wrapper, 'İyi İsim')
    await tick()

    expect(submitScore).toHaveBeenCalledTimes(2)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('leaderboard'))
  })

  it('skor zaten kaydedilmişse skor tablosuna geçer', async () => {
    vi.mocked(submitScore).mockRejectedValue(
      new ApiError('score_already_submitted', 'Bu oturumun skoru zaten kaydedildi.', 409),
    )
    const { wrapper, router } = await openResult()

    await submitName(wrapper, 'Ayşe')
    await tick()

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('leaderboard'))
  })

  it('ağ hatasında sunucu mesajını gösterir', async () => {
    vi.mocked(submitScore).mockRejectedValue(new ApiError('network_error', 'Sunucuya ulaşılamadı.'))
    const { wrapper } = await openResult()

    await submitName(wrapper, 'Ayşe')
    await tick()

    expect(wrapper.get('[role="alert"]').text()).toBe('Sunucuya ulaşılamadı.')
  })

  it('gönderilirken düğme kapanır (çift kayıt olmaz)', async () => {
    vi.mocked(submitScore).mockReturnValue(new Promise(() => {}))
    const { wrapper } = await openResult()

    await submitName(wrapper, 'Ayşe')
    await tick()
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[type="submit"]').text()).toBe('Kaydediliyor…')
    expect(submitScore).toHaveBeenCalledTimes(1)
  })

  it('"Kaydetmeden çık" oyunu temizleyip ana sayfaya götürür', async () => {
    const { wrapper, router, store } = await openResult()

    await buttonWithText(wrapper, 'Kaydetmeden çık')?.trigger('click')
    await tick()

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('home'))
    expect(store.result).toBeNull()
    expect(submitScore).not.toHaveBeenCalled()
  })
})
