import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import type { Category } from '@/api/types'
import { createAppRouter } from '@/router'
import HomeView from '@/views/HomeView.vue'

vi.mock('@/api/categories', () => ({ fetchCategories: vi.fn() }))

const categories: Category[] = [
  { slug: 'yazilim', name: 'Yazılım', description: 'Kod', color: '#3B82F6', icon: 'code' },
  { slug: 'fizik', name: 'Fizik', description: 'Enerji', color: '#EC4899', icon: 'atom' },
]

async function render() {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/')
  const wrapper = mount(HomeView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('HomeView', () => {
  beforeEach(() => {
    vi.mocked(fetchCategories).mockReset()
  })

  it('yüklenirken iskelet gösterir', async () => {
    vi.mocked(fetchCategories).mockReturnValue(new Promise(() => {}))
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')

    const wrapper = mount(HomeView, { global: { plugins: [router] } })

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
  })

  it('kategorileri kartlar olarak listeler', async () => {
    vi.mocked(fetchCategories).mockResolvedValue(categories)

    const wrapper = await render()

    const links = wrapper.findAll('li a').map((link) => link.attributes('href'))
    expect(links).toEqual(['/quiz/yazilim', '/quiz/fizik'])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('kategori yoksa bilgi verir', async () => {
    vi.mocked(fetchCategories).mockResolvedValue([])

    const wrapper = await render()

    expect(wrapper.text()).toContain('Henüz kategori yok.')
  })

  it('hatayı gösterir ve "Tekrar dene" ile yeniden yükler', async () => {
    vi.mocked(fetchCategories)
      .mockRejectedValueOnce(new ApiError('network_error', 'Sunucuya ulaşılamadı.'))
      .mockResolvedValueOnce(categories)

    const wrapper = await render()
    expect(wrapper.get('[role="alert"]').text()).toContain('Sunucuya ulaşılamadı.')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('li a')).toHaveLength(2)
    expect(fetchCategories).toHaveBeenCalledTimes(2)
  })

  it('ApiError olmayan hatada genel mesaj gösterir', async () => {
    vi.mocked(fetchCategories).mockRejectedValue(new Error('bilinmeyen'))

    const wrapper = await render()

    expect(wrapper.get('[role="alert"]').text()).toContain('Kategoriler yüklenemedi.')
  })
})
