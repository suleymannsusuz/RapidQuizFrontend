import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from '@/composables/useCountdown'
import { useCountUp } from '@/composables/useCountUp'

const FAKE = [
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'performance',
] as const

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function inScope<T>(fn: () => T) {
  const scope = effectScope()
  const value = scope.run(fn) as T
  return { value, scope }
}

describe('useCountdown', () => {
  it('verilen süreden başlayıp azalır', () => {
    const { value } = inScope(() => useCountdown(() => {}))

    value.start(5000)
    expect(value.remainingMs.value).toBe(5000)

    vi.advanceTimersByTime(2000)
    expect(value.remainingMs.value).toBeGreaterThan(2900)
    expect(value.remainingMs.value).toBeLessThanOrEqual(3016)
  })

  it('süre dolunca bir kez onExpire çağırır', () => {
    const onExpire = vi.fn()
    const { value } = inScope(() => useCountdown(onExpire))

    value.start(1000)
    vi.advanceTimersByTime(900)
    expect(onExpire).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(value.remainingMs.value).toBe(0)

    vi.advanceTimersByTime(5000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('stop sayacı durdurur ve onExpire çağrılmaz', () => {
    const onExpire = vi.fn()
    const { value } = inScope(() => useCountdown(onExpire))

    value.start(1000)
    vi.advanceTimersByTime(400)
    value.stop()
    const frozen = value.remainingMs.value
    vi.advanceTimersByTime(5000)

    expect(onExpire).not.toHaveBeenCalled()
    expect(value.remainingMs.value).toBe(frozen)
  })

  it('yeniden başlatınca yeni süreden sayar', () => {
    const onExpire = vi.fn()
    const { value } = inScope(() => useCountdown(onExpire))

    value.start(1000)
    vi.advanceTimersByTime(800)
    value.start(3000)
    vi.advanceTimersByTime(1500)

    expect(onExpire).not.toHaveBeenCalled()
    expect(value.remainingMs.value).toBeGreaterThan(1400)
  })

  it('sıfır süreyle başlarsa hemen dolar', () => {
    const onExpire = vi.fn()
    const { value } = inScope(() => useCountdown(onExpire))

    value.start(0)
    vi.advanceTimersByTime(50)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('kareler kısıtlandığında (arka plan sekmesi) da süre dolunca bir kez onExpire çağırır', () => {
    // rAF hiç çalışmayan bir ortam: yalnızca setTimeout yedeği süreyi bitirir
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const onExpire = vi.fn()
    const { value } = inScope(() => useCountdown(onExpire))

    value.start(5000)
    vi.advanceTimersByTime(4900)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)

    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(value.remainingMs.value).toBe(0)
    vi.advanceTimersByTime(10_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('hem rAF hem zamanlayıcı çalışsa da onExpire tek kez çağrılır', () => {
    const onExpire = vi.fn()
    const { value } = inScope(() => useCountdown(onExpire))

    value.start(1000)
    vi.advanceTimersByTime(3000)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('kapsam kapanınca durur', () => {
    const onExpire = vi.fn()
    const { value, scope } = inScope(() => useCountdown(onExpire))

    value.start(1000)
    scope.stop()
    vi.advanceTimersByTime(5000)

    expect(onExpire).not.toHaveBeenCalled()
  })
})

describe('useCountUp', () => {
  it("0'dan hedefe doğru artar ve hedefte biter", () => {
    const { value } = inScope(() => useCountUp(1000))

    value.run(2000)
    expect(value.value.value).toBe(0)
    vi.advanceTimersByTime(500)
    expect(value.value.value).toBeGreaterThan(0)
    expect(value.value.value).toBeLessThan(2000)
    vi.advanceTimersByTime(700)
    expect(value.value.value).toBe(2000)
  })

  it('hareketi azalt açıksa doğrudan hedefi gösterir', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const { value } = inScope(() => useCountUp(1000))

    value.run(2000)

    expect(value.value.value).toBe(2000)
  })

  it('hedef 0 ise animasyonsuz 0 gösterir', () => {
    const { value } = inScope(() => useCountUp(1000))

    value.run(0)

    expect(value.value.value).toBe(0)
  })
})
