import { mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'
import type { Category } from '@/api/types'
import CategoryCard from '@/components/CategoryCard.vue'
import { createAppRouter } from '@/router'

const category: Category = {
  slug: 'yazilim',
  name: 'Yazılım',
  description: 'Kod, web ve yazılım geliştirme dünyası',
  color: '#3B82F6',
  icon: 'code',
}

async function render(overrides: Partial<Category> = {}) {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/')
  return mount(CategoryCard, {
    props: { category: { ...category, ...overrides } },
    global: { plugins: [router] },
  })
}

describe('CategoryCard', () => {
  it('ad ve açıklamayı gösterir', async () => {
    const wrapper = await render()

    expect(wrapper.text()).toContain('Yazılım')
    expect(wrapper.text()).toContain('Kod, web ve yazılım geliştirme dünyası')
  })

  it('quiz sayfasına bağlanır', async () => {
    const wrapper = await render()

    expect(wrapper.get('a').attributes('href')).toBe('/quiz/yazilim')
  })

  it('kategori rengini kenarlıkta kullanır', async () => {
    const wrapper = await render()

    expect((wrapper.get('a').element as HTMLElement).style.borderLeftColor).toBe(
      'rgb(59, 130, 246)',
    )
  })

  it('geçersiz rengi stile sızdırmaz, varsayılana döner', async () => {
    const wrapper = await render({ color: 'red; background: url(//kotu.example/x)' })

    const style = (wrapper.get('a').element as HTMLElement).getAttribute('style') ?? ''
    expect(style).not.toContain('kotu.example')
    expect((wrapper.get('a').element as HTMLElement).style.borderLeftColor).toBe(
      'rgb(124, 58, 237)',
    )
  })

  it('ikonu ekran okuyucudan gizler', async () => {
    const wrapper = await render()

    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('HTML içeren metni düz yazı olarak basar', async () => {
    const wrapper = await render({ name: '<img src=x onerror=alert(1)>' })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  })
})
