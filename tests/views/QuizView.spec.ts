import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { fetchQuestion, fetchResult, startSession, submitAnswer } from '@/api/sessions'
import { makeAnswer, makeQuestion, makeResult, makeSession } from '../fixtures'
import { buttonWithText, mountApp, tick, unmountAll, useGameClock } from '../helpers'

vi.mock('@/api/sessions', () => ({
  startSession: vi.fn(),
  fetchQuestion: vi.fn(),
  submitAnswer: vi.fn(),
  fetchResult: vi.fn(),
  submitScore: vi.fn(),
}))

let nextPosition = 0

beforeEach(() => {
  vi.resetAllMocks()
  useGameClock()
  nextPosition = 0
  vi.mocked(startSession).mockResolvedValue(makeSession())
  vi.mocked(fetchQuestion).mockImplementation(async () => makeQuestion(nextPosition++))
  vi.mocked(submitAnswer).mockResolvedValue(makeAnswer())
  vi.mocked(fetchResult).mockResolvedValue(makeResult())
})

afterEach(() => {
  unmountAll()
  vi.useRealTimers()
})

/** Quiz sayfasını açar ve "hazır ol" bitip ilk soru gelene kadar ilerler. */
async function openQuizOnFirstQuestion() {
  const app = await mountApp('/quiz/yazilim')
  await tick(3000)
  return app
}

describe('hazır ol', () => {
  it('oturumu başlatır ve 3-2-1 gösterir; bu sırada soru istenmez (süre başlamaz)', async () => {
    const { wrapper } = await mountApp('/quiz/yazilim')

    expect(startSession).toHaveBeenCalledWith({ category: 'yazilim', platform: 'web' })
    expect(wrapper.text()).toContain('Hazır ol')
    expect(wrapper.text()).toContain('3')

    await tick(2900)
    expect(fetchQuestion).not.toHaveBeenCalled()
  })

  it('3 saniye sonra ilk soruyu ister ve gösterir', async () => {
    const { wrapper } = await openQuizOnFirstQuestion()

    expect(fetchQuestion).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Soru 1 / 20')
    expect(wrapper.text()).toContain('Soru 1?')
    expect(wrapper.text()).toContain('Birinci şık')
    expect(wrapper.text()).not.toContain('Hazır ol')
  })

  it('kategori adını ve sıfır puanı gösterir', async () => {
    const { wrapper } = await openQuizOnFirstQuestion()

    expect(wrapper.text()).toContain('Yazılım')
    expect(wrapper.get('[data-testid="score"]').text()).toBe('0')
  })
})

describe('cevaplama', () => {
  it('şık seçilince cevabı sunucuya gönderir', async () => {
    const { wrapper } = await openQuizOnFirstQuestion()

    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick()

    expect(submitAnswer).toHaveBeenCalledWith('8f0c2a7e-1b2c-4d3e-8f90-123456789abc', {
      question_id: 100,
      choice_id: 2,
    })
  })

  it('doğru cevapta "Doğru!", kazanılan puan ve güncel puan gösterilir', async () => {
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer({ points: 138, total_score: 138 }))
    const { wrapper } = await openQuizOnFirstQuestion()

    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick()

    expect(wrapper.text()).toContain('Doğru!')
    expect(wrapper.text()).toContain('+138')
    expect(wrapper.get('[data-testid="score"]').text()).toBe('138')
    expect(buttonWithText(wrapper, 'İkinci şık')?.text()).toContain('Doğru cevap')
  })

  it('yanlış cevapta seçilen şık yanlış, doğru şık yeşil gösterilir', async () => {
    vi.mocked(submitAnswer).mockResolvedValue(
      makeAnswer({ is_correct: false, points: 0, total_score: 0, correct_choice_id: 2 }),
    )
    const { wrapper } = await openQuizOnFirstQuestion()

    await buttonWithText(wrapper, 'Üçüncü şık')?.trigger('click')
    await tick()

    expect(wrapper.text()).toContain('Yanlış')
    expect(wrapper.text()).not.toContain('+0')
    expect(buttonWithText(wrapper, 'Üçüncü şık')?.text()).toContain('Yanlış cevap')
    expect(buttonWithText(wrapper, 'İkinci şık')?.text()).toContain('Doğru cevap')
  })

  it('geri bildirimden 900 ms sonra sıradaki soruya geçer', async () => {
    const { wrapper } = await openQuizOnFirstQuestion()
    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick()

    await tick(800)
    expect(wrapper.text()).toContain('Soru 1?')
    expect(fetchQuestion).toHaveBeenCalledTimes(1)

    await tick(200)
    expect(fetchQuestion).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Soru 2 / 20')
  })

  it('cevap verildikten sonra şıklar kilitlenir (çift tıklama tek istek)', async () => {
    const { wrapper } = await openQuizOnFirstQuestion()
    const button = buttonWithText(wrapper, 'İkinci şık')

    await button?.trigger('click')
    await button?.trigger('click')
    await buttonWithText(wrapper, 'Birinci şık')?.trigger('click')
    await tick()

    expect(submitAnswer).toHaveBeenCalledTimes(1)
  })

  it('1–4 tuşlarıyla şık seçilir', async () => {
    await openQuizOnFirstQuestion()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
    await tick()

    expect(submitAnswer).toHaveBeenCalledWith(expect.any(String), {
      question_id: 100,
      choice_id: 3,
    })
  })

  it('geri bildirim sırasında tuşlar yok sayılır', async () => {
    await openQuizOnFirstQuestion()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await tick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
    await tick()

    expect(submitAnswer).toHaveBeenCalledTimes(1)
  })

  it('ilerleme noktaları cevaplara göre renklenir', async () => {
    vi.mocked(submitAnswer)
      .mockResolvedValueOnce(makeAnswer())
      .mockResolvedValueOnce(makeAnswer({ is_correct: false, points: 0 }))
    const { wrapper } = await openQuizOnFirstQuestion()

    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick(900)
    await buttonWithText(wrapper, 'Birinci şık')?.trigger('click')
    await tick()

    const dots = wrapper.findAll('[data-testid="progress-dot"]')
    expect(dots[0]?.classes()).toContain('bg-success')
    expect(dots[1]?.classes()).toContain('bg-accent')
  })
})

describe('süre', () => {
  it('sayaç 5 saniyeyle başlar ve sunucudan gelen kalan süreyi kullanır', async () => {
    vi.mocked(fetchQuestion).mockImplementation(async () =>
      makeQuestion(nextPosition++, { remaining_ms: 2500 }),
    )
    const { wrapper } = await openQuizOnFirstQuestion()

    expect(wrapper.get('[data-testid="countdown-ring"]').text()).toContain('3')
    expect(wrapper.get('[data-testid="countdown-ring"]').attributes('data-tone')).toBe('warning')
  })

  it('süre dolunca (5 sn) otomatik olarak choice_id=null gönderir', async () => {
    vi.mocked(submitAnswer).mockResolvedValue(
      makeAnswer({ is_correct: false, points: 0, timed_out: true }),
    )
    const { wrapper } = await openQuizOnFirstQuestion()

    await tick(4900)
    expect(submitAnswer).not.toHaveBeenCalled()
    await tick(200)

    expect(submitAnswer).toHaveBeenCalledWith(expect.any(String), {
      question_id: 100,
      choice_id: null,
    })
    expect(wrapper.text()).toContain('Süre doldu')
    expect(buttonWithText(wrapper, 'İkinci şık')?.text()).toContain('Doğru cevap')
  })

  it('süre dolduktan sonra tıklamak ikinci cevap göndermez', async () => {
    vi.mocked(submitAnswer).mockResolvedValue(
      makeAnswer({ timed_out: true, is_correct: false, points: 0 }),
    )
    const { wrapper } = await openQuizOnFirstQuestion()
    await tick(5100)

    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick()

    expect(submitAnswer).toHaveBeenCalledTimes(1)
  })

  it('cevap verilince sayaç durur (süre aşımı gönderilmez)', async () => {
    const { wrapper } = await openQuizOnFirstQuestion()
    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick()

    await tick(800) // geri bildirim sürüyor; sayaç hâlâ çalışsaydı yine gönderirdi

    expect(submitAnswer).toHaveBeenCalledTimes(1)
  })

  it('her yeni soruda sayaç yeniden 5 saniyeden başlar', async () => {
    const { wrapper } = await openQuizOnFirstQuestion()
    await tick(2000)
    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick(900)

    expect(wrapper.get('[data-testid="countdown-ring"]').text()).toContain('5')
    await tick(4800)
    expect(submitAnswer).toHaveBeenCalledTimes(1) // 2. soru henüz dolmadı
  })
})

describe('bitiş', () => {
  async function playUntilLastQuestion() {
    vi.mocked(fetchQuestion).mockImplementation(async () => makeQuestion(19))
    const app = await openQuizOnFirstQuestion()
    return app
  }

  it('son sorudan sonra sonucu alıp sonuç sayfasına geçer', async () => {
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer({ is_last: true, total_score: 2310 }))
    const { wrapper, router } = await playUntilLastQuestion()

    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick(900)
    await tick()

    expect(fetchResult).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('result'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Quiz bitti!'))
  })

  it('quiz biterken çıkış onayı sorulmaz', async () => {
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer({ is_last: true }))
    const { wrapper } = await playUntilLastQuestion()

    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick(900)
    await tick()

    expect(wrapper.text()).not.toContain('Quiz bitecek, emin misin?')
  })
})

describe('hatalar', () => {
  it('bilinmeyen kategoride mesaj ve ana sayfa bağlantısı gösterir, yeniden deneme önermez', async () => {
    vi.mocked(startSession).mockRejectedValue(
      new ApiError('not_found', 'Kategori bulunamadı.', 404),
    )
    const { wrapper } = await mountApp('/quiz/yok')

    expect(wrapper.get('[role="alert"]').text()).toContain('Bu kategori bulunamadı.')
    expect(buttonWithText(wrapper, 'Tekrar dene')).toBeUndefined()
    expect(wrapper.get('[role="alert"] a').attributes('href')).toBe('/')
  })

  it('soru alınamazsa "Tekrar dene" ile devam edilir', async () => {
    vi.mocked(fetchQuestion)
      .mockRejectedValueOnce(new ApiError('network_error', 'Sunucuya ulaşılamadı.'))
      .mockImplementation(async () => makeQuestion(0))
    const { wrapper } = await mountApp('/quiz/yazilim')
    await tick(3000)

    expect(wrapper.get('[role="alert"]').text()).toContain('Sunucuya ulaşılamadı.')

    await buttonWithText(wrapper, 'Tekrar dene')?.trigger('click')
    await tick()

    expect(wrapper.text()).toContain('Soru 1?')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('oturum süresi dolarsa yeniden başlama seçeneği sunar', async () => {
    vi.mocked(submitAnswer).mockRejectedValue(
      new ApiError('session_expired', 'Oturum süresi doldu.', 410),
    )
    const { wrapper } = await openQuizOnFirstQuestion()

    await buttonWithText(wrapper, 'İkinci şık')?.trigger('click')
    await tick()

    expect(wrapper.text()).toContain('Oturum süresi doldu')
    expect(buttonWithText(wrapper, 'Tekrar dene')).toBeUndefined()

    await buttonWithText(wrapper, 'Yeniden başla')?.trigger('click')
    await tick()

    expect(startSession).toHaveBeenCalledTimes(2)
  })
})

describe('quiz sırasında sayfadan çıkma', () => {
  it('çıkmaya çalışınca onay sorar; "Devam et" oyunda tutar', async () => {
    const { wrapper, router } = await openQuizOnFirstQuestion()

    const navigation = router.push('/')
    await tick()
    expect(wrapper.text()).toContain('Quiz bitecek, emin misin?')

    await buttonWithText(wrapper, 'Devam et')?.trigger('click')
    await navigation
    await tick()

    expect(router.currentRoute.value.name).toBe('quiz')
    expect(wrapper.text()).not.toContain('Quiz bitecek, emin misin?')
    expect(wrapper.text()).toContain('Soru 1?')
  })

  it('"Çık" ile ana sayfaya gider ve oyun temizlenir', async () => {
    const { wrapper, router, store } = await openQuizOnFirstQuestion()

    const navigation = router.push('/')
    await tick()
    await buttonWithText(wrapper, 'Çık')?.trigger('click')
    await navigation
    await tick()

    expect(router.currentRoute.value.name).toBe('home')
    expect(store.phase).toBe('idle')
    expect(store.sessionId).toBeNull()
  })

  it('hazır ol sırasında da onay sorar', async () => {
    const { wrapper, router } = await mountApp('/quiz/yazilim')

    router.push('/')
    await tick()

    expect(wrapper.text()).toContain('Quiz bitecek, emin misin?')
  })

  it('hata ekranından çıkarken onay sorulmaz', async () => {
    vi.mocked(startSession).mockRejectedValue(
      new ApiError('not_found', 'Kategori bulunamadı.', 404),
    )
    const { wrapper, router } = await mountApp('/quiz/yok')

    await router.push('/')
    await tick()

    expect(router.currentRoute.value.name).toBe('home')
    expect(wrapper.text()).not.toContain('Quiz bitecek, emin misin?')
  })

  it('sekme kapatılırken tarayıcı uyarısı ister, oyun yokken istemez', async () => {
    const { store } = await openQuizOnFirstQuestion()

    const during = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(during)
    expect(during.defaultPrevented).toBe(true)

    store.reset()
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })
})
