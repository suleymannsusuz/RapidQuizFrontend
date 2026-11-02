import confetti from 'canvas-confetti'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import { fetchLeaderboard } from '@/api/leaderboard'
import type { useQuizStore } from '@/stores/quiz'
import { categories, makeBoard, makeResult, makeRow, makeSubmitted } from '../fixtures'
import { buttonWithText, mountApp, tick, unmountAll, useGameClock } from '../helpers'

vi.mock('@/api/categories', () => ({ fetchCategories: vi.fn() }))
vi.mock('@/api/leaderboard', () => ({ fetchLeaderboard: vi.fn() }))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

type QuizStore = ReturnType<typeof useQuizStore>

const rows = [1, 2, 3].map((rank) => makeRow(rank))

beforeEach(() => {
  vi.resetAllMocks()
  useGameClock()
  vi.mocked(fetchCategories).mockResolvedValue(categories)
  vi.mocked(fetchLeaderboard).mockImplementation(async (slug) =>
    slug === 'fizik'
      ? makeBoard([makeRow(1, { player_name: 'Fizikçi' })], 'fizik', 'Fizik')
      : makeBoard(rows),
  )
})

afterEach(() => {
  unmountAll()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const rowNames = (wrapper: { findAll: (s: string) => { text: () => string }[] }) =>
  wrapper.findAll('[data-testid="score-row"]').map((row) => row.text())

describe('LeaderboardView', () => {
  it("/leaderboard ilk kategoriye yönlenir ve ilk 10'u listeler", async () => {
    const { wrapper, router } = await mountApp('/leaderboard')
    await vi.waitFor(() => expect(router.currentRoute.value.params.category).toBe('yazilim'))
    await tick()

    expect(fetchLeaderboard).toHaveBeenCalledWith('yazilim')
    expect(rowNames(wrapper)).toHaveLength(3)
    expect(wrapper.text()).toContain('Oyuncu 1')
  })

  it('kategori adresini doğrudan açınca yalnızca o tabloyu bir kez yükler', async () => {
    const { wrapper } = await mountApp('/leaderboard/fizik')
    await tick()

    expect(fetchLeaderboard).toHaveBeenCalledTimes(1)
    expect(fetchLeaderboard).toHaveBeenCalledWith('fizik')
    expect(wrapper.text()).toContain('Fizikçi')
  })

  it('her kategori için bir sekme gösterir ve geçerli olanı işaretler', async () => {
    const { wrapper } = await mountApp('/leaderboard/fizik')
    await tick()

    const tabs = wrapper.findAll('nav a')
    expect(tabs.map((tab) => tab.text())).toEqual(['Yazılım', 'Fizik'])
    expect(tabs[0]?.attributes('aria-current')).toBeUndefined()
    expect(tabs[1]?.attributes('aria-current')).toBe('page')
  })

  it('sekmeye tıklayınca o kategorinin tablosu gelir', async () => {
    const { wrapper, router } = await mountApp('/leaderboard/yazilim')
    await tick()

    await wrapper.findAll('nav a')[1]?.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.params.category).toBe('fizik'))
    await tick()

    expect(fetchLeaderboard).toHaveBeenLastCalledWith('fizik')
    expect(wrapper.text()).toContain('Fizikçi')
    expect(wrapper.text()).not.toContain('Oyuncu 1')
  })

  it('etkin sekmeyi görünür alana kaydırır (dar ekranda kesilmesin)', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { wrapper } = await mountApp('/leaderboard/fizik')
    await tick()

    expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'center', block: 'nearest' })
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Fizik')
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
  })

  it('skor yoksa "ilk sen ol" mesajı ve Oyna bağlantısı gösterir', async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue(makeBoard([]))
    const { wrapper } = await mountApp('/leaderboard/yazilim')
    await tick()

    expect(wrapper.text()).toContain('Henüz skor yok')
    expect(wrapper.text()).toContain('ilk sen ol')
    expect(
      wrapper
        .findAll('a')
        .find((a) => a.text() === 'Oyna')
        ?.attributes('href'),
    ).toBe('/quiz/yazilim')
  })

  it('yüklenirken iskelet gösterir', async () => {
    vi.mocked(fetchLeaderboard).mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountApp('/leaderboard/yazilim')
    await tick()

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
  })

  it('hatada mesaj gösterir ve "Tekrar dene" ile yeniden yükler', async () => {
    vi.mocked(fetchLeaderboard)
      .mockRejectedValueOnce(new ApiError('network_error', 'Sunucuya ulaşılamadı.'))
      .mockResolvedValueOnce(makeBoard(rows))
    const { wrapper } = await mountApp('/leaderboard/yazilim')
    await tick()

    expect(wrapper.get('[role="alert"]').text()).toContain('Sunucuya ulaşılamadı.')

    await buttonWithText(wrapper, 'Tekrar dene')?.trigger('click')
    await tick()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(rowNames(wrapper)).toHaveLength(3)
  })

  it('kategori listesi alınamazsa hata gösterir', async () => {
    vi.mocked(fetchCategories).mockRejectedValue(new ApiError('network_error', 'Bağlantı yok.'))
    const { wrapper } = await mountApp('/leaderboard')
    await tick()

    expect(wrapper.get('[role="alert"]').text()).toContain('Bağlantı yok.')
  })

  it('oyuncu adını düz metin olarak basar', async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue(
      makeBoard([makeRow(1, { player_name: '<img src=x onerror=alert(1)>' })]),
    )
    const { wrapper } = await mountApp('/leaderboard/yazilim')
    await tick()

    expect(wrapper.find('table img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  })
})

describe('kendi skorun', () => {
  const seed = (rank: number, inTop10: boolean) => (store: QuizStore) => {
    store.result = makeResult()
    store.submitted = makeSubmitted({ rank, in_top_10: inTop10, score: 2800 })
    store.submittedName = 'Oyuncu 2'
  }

  it("ilk 10'daysa satırı vurgulanır ve konfeti patlar", async () => {
    const { wrapper } = await mountApp('/leaderboard/yazilim', seed(2, true))
    await vi.waitFor(() => expect(confetti).toHaveBeenCalledTimes(1))

    const mine = wrapper.findAll('[data-testid="score-row"]')[1]
    expect(mine?.attributes('aria-current')).toBe('true')
    expect(mine?.text()).toContain('sen')
    expect(confetti).toHaveBeenCalledWith(
      expect.objectContaining({ disableForReducedMotion: true }),
    )
  })

  it('konfeti aynı oyun için yalnızca bir kez patlar', async () => {
    const { wrapper, router } = await mountApp('/leaderboard/yazilim', seed(2, true))
    await vi.waitFor(() => expect(confetti).toHaveBeenCalledTimes(1))

    await wrapper.findAll('nav a')[1]?.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.params.category).toBe('fizik'))
    await router.push('/leaderboard/yazilim')
    await tick()

    expect(confetti).toHaveBeenCalledTimes(1)
  })

  it('ilk 10 dışındaysa konfeti yok, sıralama bilgisi gösterilir', async () => {
    const { wrapper } = await mountApp('/leaderboard/yazilim', seed(23, false))
    await tick()

    expect(confetti).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('#23')
    expect(wrapper.text()).toContain('2800 puan')
    expect(wrapper.text()).toContain("İlk 10'a girmek için")
    expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(0)
  })

  it('ilk 10\'daysa "sıralaman" kutusu gösterilmez', async () => {
    const { wrapper } = await mountApp('/leaderboard/yazilim', seed(2, true))
    await tick()

    expect(wrapper.text()).not.toContain('Sıralaman')
  })

  it('başka kategoriye bakarken vurgu ve kutu gösterilmez', async () => {
    const { wrapper } = await mountApp('/leaderboard/fizik', seed(23, false))
    await tick()

    expect(confetti).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Sıralaman')
    expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(0)
  })

  it('hiç oynamadan gelen ziyaretçide vurgu ve konfeti yok', async () => {
    const { wrapper } = await mountApp('/leaderboard/yazilim')
    await tick()

    expect(confetti).not.toHaveBeenCalled()
    expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(0)
  })
})
