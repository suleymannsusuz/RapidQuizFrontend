import { onScopeDispose, ref } from 'vue'

/**
 * Geri sayım: `requestAnimationFrame` ile akıcı çizilir, süre dolması ayrıca bir `setTimeout`
 * ile güvence altına alınır (pencere arka plandayken ya da kareler kısıtlandığında rAF
 * çalışmayabilir). Yalnızca görseldir: başlangıç değeri sunucudan gelen `remaining_ms`'dir
 * ve sıfıra inince `onExpire` bir kez çağrılır; asıl hakem sunucudur.
 */
export function useCountdown(onExpire: () => void) {
  const remainingMs = ref(0)
  let frame = 0
  let timer = 0
  let endAt = 0

  function stop() {
    if (frame) cancelAnimationFrame(frame)
    window.clearTimeout(timer)
    frame = 0
    timer = 0
  }

  function expire() {
    stop()
    remainingMs.value = 0
    onExpire()
  }

  function tick() {
    const left = Math.max(0, endAt - performance.now())
    remainingMs.value = left
    if (left <= 0) {
      expire()
      return
    }
    frame = requestAnimationFrame(tick)
  }

  function start(durationMs: number) {
    stop()
    remainingMs.value = Math.max(0, durationMs)
    endAt = performance.now() + durationMs
    frame = requestAnimationFrame(tick)
    timer = window.setTimeout(expire, Math.max(0, durationMs))
  }

  onScopeDispose(stop)

  return { remainingMs, start, stop }
}
