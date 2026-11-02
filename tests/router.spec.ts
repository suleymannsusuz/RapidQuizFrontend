import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppRouter } from '@/router'

function newRouter() {
  return createAppRouter(createMemoryHistory())
}

describe('router', () => {
  beforeEach(() => {
    document.title = ''
  })

  it.each([
    ['/', 'home', {}],
    ['/quiz/yazilim', 'quiz', { category: 'yazilim' }],
    ['/result', 'result', {}],
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
