import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardAnswers } from '@/composables/useKeyboardAnswers'

function setup(enabled = true) {
  const onPick = vi.fn()
  const flag = ref(enabled)
  const wrapper = mount(
    defineComponent({
      setup() {
        useKeyboardAnswers(onPick, flag)
        return () => h('div', [h('input', { id: 'field' })])
      },
    }),
    { attachTo: document.body },
  )
  return { onPick, flag, wrapper }
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
}

describe('useKeyboardAnswers', () => {
  it('1–4 tuşlarını şık sırasına (0–3) çevirir', () => {
    const { onPick, wrapper } = setup()

    press('1')
    press('2')
    press('3')
    press('4')

    expect(onPick.mock.calls.map((call) => call[0])).toEqual([0, 1, 2, 3])
    wrapper.unmount()
  })

  it.each(['0', '5', 'a', 'Enter', ' '])('"%s" tuşunu yok sayar', (key) => {
    const { onPick, wrapper } = setup()

    press(key)

    expect(onPick).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('devre dışıyken (cevap gönderildikten sonra) dinlemez', () => {
    const { onPick, flag, wrapper } = setup(false)

    press('2')
    expect(onPick).not.toHaveBeenCalled()

    flag.value = true
    press('2')
    expect(onPick).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })

  it('Ctrl/Alt/Cmd ile birlikte basılan tuşları yok sayar (tarayıcı kısayolları)', () => {
    const { onPick, wrapper } = setup()

    press('1', { ctrlKey: true })
    press('2', { altKey: true })
    press('3', { metaKey: true })

    expect(onPick).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('bir metin alanında yazarken tetiklenmez', () => {
    const { onPick, wrapper } = setup()
    const input = document.getElementById('field') as HTMLInputElement

    press('1', {}, input)

    expect(onPick).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('bileşen kaldırılınca dinleyiciyi temizler', () => {
    const { onPick, wrapper } = setup()
    wrapper.unmount()

    press('1')

    expect(onPick).not.toHaveBeenCalled()
  })
})
