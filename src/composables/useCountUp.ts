import { onScopeDispose, ref } from 'vue'

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** Sayıyı 0'dan hedefe doğru sayarak artırır; hareketi azalt açıksa doğrudan hedefi gösterir. */
export function useCountUp(durationMs = 1200) {
  const value = ref(0)
  let frame = 0

  function run(target: number) {
    cancelAnimationFrame(frame)
    if (prefersReducedMotion() || target <= 0) {
      value.value = target
      return
    }
    const startedAt = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      value.value = Math.round(target * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  }

  onScopeDispose(() => cancelAnimationFrame(frame))

  return { value, run }
}
