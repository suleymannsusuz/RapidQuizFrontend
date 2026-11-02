import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { vi } from 'vitest'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { useQuizStore } from '@/stores/quiz'

/** Zamanla ilgili her şeyi sahte saate alır (sayaç, geri bildirim, hazır ol). */
export function useGameClock() {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  })
}

/** Sahte saati ilerletir ve bekleyen promise'leri boşaltır. */
export async function tick(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms)
}

const mounted: VueWrapper[] = []

/** Açık kalan uygulamaları kaldırır (window dinleyicileri testler arasında sızmasın). */
export function unmountAll() {
  while (mounted.length) mounted.pop()?.unmount()
  document.body.innerHTML = ''
}

/** Uygulamayı gerçek router ve Pinia ile, verilen adreste açar. */
export async function mountApp(
  path: string,
  seed?: (store: ReturnType<typeof useQuizStore>) => void,
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useQuizStore()
  seed?.(store)
  const router = createAppRouter(createMemoryHistory())
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(wrapper as VueWrapper)
  await flushPromises()
  return { wrapper, router, store }
}

export function buttonWithText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}
