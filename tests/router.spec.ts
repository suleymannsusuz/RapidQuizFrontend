import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppRouter } from '@/router'
import { useQuizStore } from '@/stores/quiz'
import { makeResult } from './fixtures'

function newRouter() {
  return createAppRouter(createMemoryHistory())
}

describe('router', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.title = ''
  })

  it('biten quiz yokken /result ana sayfaya yönlenir', async () => {
    const router = newRouter()
    await router.push('/result')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('biten quiz varken /result açılır', async () => {
    useQuizStore().result = makeResult()
    const router = newRouter()
    await router.push('/result')

    expect(router.currentRoute.value.name).toBe('result')
  })

  it.each([
    ['/', 'home', {}],
    ['/quiz/yazilim', 'quiz', { category: 'yazilim' }],
    ['/leaderboard', 'leaderboard', {}],
    ['/leaderboard/fizik', 'leaderboard', { category: 'fizik' }],
  ])('%s adresini %s rotasına çözer', async (path, name, params) => {
    const router = newRouter()
    await router.push(path)

    expect(router.currentRoute.value.name).toBe(name)
    expect(router.currentRoute.value.params).toMatchObject(params)
  })

  it('bilinmeyen adresi ana sayfaya yönlendirir', async () => {
    const router = newRouter()
    await router.push('/boyle/bir/sayfa/yok')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('sayfa başlığını rotaya göre ayarlar', async () => {
    const router = newRouter()

    await router.push('/leaderboard')
    expect(document.title).toBe('Skor tablosu · Rapid Quiz')

    await router.push('/')
    expect(document.title).toBe('Ana sayfa · Rapid Quiz')
  })
})
