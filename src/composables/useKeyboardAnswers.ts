import { onBeforeUnmount, onMounted, type Ref } from 'vue'

const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

/** 1–4 tuşları şıkları seçer (masaüstünde hız için). `enabled` kapalıyken dinlemez. */
export function useKeyboardAnswers(onPick: (index: number) => void, enabled: Ref<boolean>) {
  function handle(event: KeyboardEvent) {
    if (!enabled.value || event.ctrlKey || event.metaKey || event.altKey) return
    const target = event.target as HTMLElement | null
    if (target && TYPING_TAGS.includes(target.tagName)) return
    if (event.key >= '1' && event.key <= '4') {
      event.preventDefault()
      onPick(Number(event.key) - 1)
    }
  }

  onMounted(() => window.addEventListener('keydown', handle))
  onBeforeUnmount(() => window.removeEventListener('keydown', handle))
}
