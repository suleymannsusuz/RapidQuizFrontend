import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { fetchQuestion, fetchResult, startSession, submitAnswer, submitScore } from '@/api/sessions'
import { useQuizStore } from '@/stores/quiz'
import { makeAnswer, makeQuestion, makeResult, makeSession, makeSubmitted } from '../fixtures'

vi.mock('@/api/sessions', () => ({
  startSession: vi.fn(),
  fetchQuestion: vi.fn(),
  submitAnswer: vi.fn(),
  fetchResult: vi.fn(),
  submitScore: vi.fn(),
}))

const network = () => new ApiError('network_error', 'Sunucuya ulaşılamadı.')

async function startedStore() {
  vi.mocked(startSession).mockResolvedValue(makeSession())
  const store = useQuizStore()
  await store.start('yazilim')
  return store
}

async function storeWithQuestion(position = 0) {
  const store = await startedStore()
  vi.mocked(fetchQuestion).mockResolvedValue(makeQuestion(position))
  await store.loadQuestion()
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})

describe('start', () => {
  it('oturumu başlatır ve "hazır ol" aşamasına geçer', async () => {
    const store = await startedStore()

    expect(startSession).toHaveBeenCalledWith({ category: 'yazilim', platform: 'web' })
    expect(store.phase).toBe('ready')
    expect(store.category).toEqual({ slug: 'yazilim', name: 'Yazılım' })
    expect(store.totalQuestions).toBe(20)
    expect(store.timeLimitMs).toBe(5000)
    expect(store.isActive).toBe(true)
  })

  it('hazır ol aşamasında soru istemez (süre başlamaz)', async () => {
    await startedStore()

    expect(fetchQuestion).not.toHaveBeenCalled()
  })

  it('kalıcı hatada (kategori yok) yeniden denemeyi önermez', async () => {
    vi.mocked(startSession).mockRejectedValue(
      new ApiError('not_found', 'Kategori bulunamadı.', 404),
    )
    const store = useQuizStore()

    await store.start('yok')

    expect(store.phase).toBe('error')
    expect(store.error?.code).toBe('not_found')
    expect(store.canRetry).toBe(false)
  })

  it('geçici hatada yeniden denenebilir ve retry oturumu yeniden başlatır', async () => {
    vi.mocked(startSession).mockRejectedValueOnce(network()).mockResolvedValueOnce(makeSession())
    const store = useQuizStore()

    await store.start('yazilim')
    expect(store.phase).toBe('error')
    expect(store.canRetry).toBe(true)

    await store.retry()

    expect(store.phase).toBe('ready')
    expect(store.error).toBeNull()
    expect(startSession).toHaveBeenCalledTimes(2)
  })

  it('ApiError olmayan hatayı genel hataya çevirir', async () => {
    vi.mocked(startSession).mockRejectedValue(new Error('beklenmeyen'))
    const store = useQuizStore()

    await store.start('yazilim')

    expect(store.error?.code).toBe('unknown_error')
  })

  it('yeni oyun önceki oyunun durumunu temizler', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer())
    await store.answer(2)
    expect(store.history).toHaveLength(1)

    vi.mocked(startSession).mockResolvedValue(makeSession())
    await store.start('yazilim')

    expect(store.history).toEqual([])
    expect(store.totalScore).toBe(0)
    expect(store.question).toBeNull()
    expect(store.result).toBeNull()
    expect(store.submitted).toBeNull()
  })
})

describe('loadQuestion', () => {
  it('soruyu alır ve puanı sunucudan okur', async () => {
    const store = await startedStore()
    vi.mocked(fetchQuestion).mockResolvedValue(makeQuestion(3, { current_score: 260 }))

    await store.loadQuestion()

    expect(store.phase).toBe('question')
    expect(store.question?.position).toBe(3)
    expect(store.totalScore).toBe(260)
    expect(store.selectedChoiceId).toBeNull()
  })

  it('20. sorudan sonra "session_finished" gelirse sonuca geçer', async () => {
    const store = await startedStore()
    vi.mocked(fetchQuestion).mockRejectedValue(
      new ApiError('session_finished', 'Quiz zaten bitti.', 409),
    )
    vi.mocked(fetchResult).mockResolvedValue(makeResult())

    await store.loadQuestion()

    expect(store.phase).toBe('finished')
    expect(store.result?.total_score).toBe(2310)
  })

  it('ağ hatasında yeniden denenebilir', async () => {
    const store = await startedStore()
    vi.mocked(fetchQuestion).mockRejectedValueOnce(network()).mockResolvedValueOnce(makeQuestion())

    await store.loadQuestion()
    expect(store.phase).toBe('error')

    await store.retry()

    expect(store.phase).toBe('question')
  })
})

describe('answer', () => {
  it('cevabı gönderir, puanı sunucudan alır ve geri bildirime geçer', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer({ points: 138, total_score: 138 }))

    await store.answer(2)

    expect(submitAnswer).toHaveBeenCalledWith(store.sessionId, { question_id: 100, choice_id: 2 })
    expect(store.phase).toBe('feedback')
    expect(store.totalScore).toBe(138)
    expect(store.lastAnswer?.points).toBe(138)
    expect(store.history).toEqual(['correct'])
  })

  it('yanlış ve süre aşımı geçmişe doğru işlenir', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockResolvedValueOnce(
      makeAnswer({ is_correct: false, points: 0, total_score: 0 }),
    )
    await store.answer(1)
    expect(store.history).toEqual(['wrong'])

    vi.mocked(fetchQuestion).mockResolvedValue(makeQuestion(1))
    await store.advance()
    vi.mocked(submitAnswer).mockResolvedValueOnce(
      makeAnswer({ is_correct: false, points: 0, timed_out: true }),
    )
    await store.answer(null)

    expect(submitAnswer).toHaveBeenLastCalledWith(store.sessionId, {
      question_id: 101,
      choice_id: null,
    })
    expect(store.history).toEqual(['wrong', 'timeout'])
  })

  it('aynı soruya art arda tıklamak ikinci istek göndermez', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer())

    await Promise.all([store.answer(2), store.answer(2), store.answer(3)])

    expect(submitAnswer).toHaveBeenCalledTimes(1)
    expect(store.history).toHaveLength(1)
  })

  it('soru yokken ya da geri bildirim sırasında cevap göndermez', async () => {
    const store = await startedStore() // henüz soru yok
    await store.answer(1)
    expect(submitAnswer).not.toHaveBeenCalled()

    vi.mocked(fetchQuestion).mockResolvedValue(makeQuestion())
    await store.loadQuestion()
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer())
    await store.answer(2)
    await store.answer(3) // feedback aşaması
    expect(submitAnswer).toHaveBeenCalledTimes(1)
  })

  it('ağ hatasında aynı cevapla yeniden denenir', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockRejectedValueOnce(network()).mockResolvedValueOnce(makeAnswer())

    await store.answer(3)
    expect(store.phase).toBe('error')
    expect(store.canRetry).toBe(true)

    await store.retry()

    expect(submitAnswer).toHaveBeenCalledTimes(2)
    expect(vi.mocked(submitAnswer).mock.calls[1]?.[1]).toEqual({ question_id: 100, choice_id: 3 })
    expect(store.phase).toBe('feedback')
  })

  it('"already_answered" gelirse hata göstermeden sıradaki soruya geçer', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockRejectedValue(
      new ApiError('already_answered', 'Bu soru zaten cevaplanmış.', 409),
    )
    vi.mocked(fetchQuestion).mockResolvedValue(makeQuestion(1, { current_score: 130 }))

    await store.answer(2)

    expect(store.phase).toBe('question')
    expect(store.question?.position).toBe(1)
    expect(store.totalScore).toBe(130) // puan sonraki sorudan senkronlanır
    expect(store.history).toEqual(['timeout'])
    expect(store.error).toBeNull()
  })

  it('"session_expired" yeniden denenebilir değildir', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockRejectedValue(
      new ApiError('session_expired', 'Oturum süresi doldu.', 410),
    )

    await store.answer(2)

    expect(store.phase).toBe('error')
    expect(store.canRetry).toBe(false)
  })
})

describe('advance', () => {
  it('son soru değilse sıradaki soruyu ister', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer())
    await store.answer(2)
    vi.mocked(fetchQuestion).mockResolvedValue(makeQuestion(1, { current_score: 130 }))

    await store.advance()

    expect(store.phase).toBe('question')
    expect(store.question?.position).toBe(1)
    expect(store.lastAnswer).toBeNull()
  })

  it('son sorudan sonra sonucu alır', async () => {
    const store = await storeWithQuestion(19)
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer({ is_last: true, total_score: 2310 }))
    vi.mocked(fetchResult).mockResolvedValue(makeResult())
    await store.answer(2)

    await store.advance()

    expect(fetchQuestion).toHaveBeenCalledTimes(1) // yeni soru istenmedi
    expect(store.phase).toBe('finished')
    expect(store.result?.correct_count).toBe(17)
    expect(store.isActive).toBe(false)
  })

  it('sonuç alınamazsa yeniden denenebilir', async () => {
    const store = await storeWithQuestion(19)
    vi.mocked(submitAnswer).mockResolvedValue(makeAnswer({ is_last: true }))
    vi.mocked(fetchResult).mockRejectedValueOnce(network()).mockResolvedValueOnce(makeResult())
    await store.answer(2)

    await store.advance()
    expect(store.phase).toBe('error')

    await store.retry()

    expect(store.phase).toBe('finished')
  })
})

describe('saveScore', () => {
  it('skoru kaydeder ve ismi saklar', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitScore).mockResolvedValue(makeSubmitted({ rank: 4 }))

    await store.saveScore('Ayşe')

    expect(submitScore).toHaveBeenCalledWith(store.sessionId, { player_name: 'Ayşe' })
    expect(store.submitted?.rank).toBe(4)
    expect(store.submittedName).toBe('Ayşe')
  })

  it('sunucu hatasını çağırana iletir ve skoru kaydedilmiş saymaz', async () => {
    const store = await storeWithQuestion()
    vi.mocked(submitScore).mockRejectedValue(
      new ApiError('validation_error', 'Eksik veya geçersiz alan.', 400, {
        player_name: ['Bu isim kullanılamaz.'],
      }),
    )

    await expect(store.saveScore('xxx')).rejects.toMatchObject({ code: 'validation_error' })
    expect(store.submitted).toBeNull()
  })

  it('oturum yokken hata fırlatır', async () => {
    const store = useQuizStore()
    await expect(store.saveScore('Ayşe')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('reset', () => {
  it('her şeyi, oturum anahtarı dahil, temizler', async () => {
    const store = await storeWithQuestion()

    store.reset()

    expect(store.phase).toBe('idle')
    expect(store.sessionId).toBeNull()
    expect(store.category).toBeNull()
    expect(store.question).toBeNull()
    expect(store.isActive).toBe(false)
  })
})
