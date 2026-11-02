import { mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChoiceButton from '@/components/ChoiceButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CountdownRing from '@/components/CountdownRing.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LeaderboardTable from '@/components/LeaderboardTable.vue'
import NameForm from '@/components/NameForm.vue'
import ProgressDots from '@/components/ProgressDots.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import ReadyCountdown from '@/components/ReadyCountdown.vue'
import { createAppRouter } from '@/router'
import type { DotStatus } from '@/stores/quiz'
import { makeQuestion, makeRow } from '../fixtures'

describe('ChoiceButton', () => {
  it('metni ve şık numarasını gösterir, tıklanınca pick yayar', async () => {
    const wrapper = mount(ChoiceButton, { props: { text: 'Kaynak bulunamadı', index: 1 } })

    expect(wrapper.text()).toContain('Kaynak bulunamadı')
    expect(wrapper.text()).toContain('2')
    await wrapper.trigger('click')

    expect(wrapper.emitted('pick')).toHaveLength(1)
  })

  it('devre dışıyken tıklamayı iletmez', async () => {
    const wrapper = mount(ChoiceButton, { props: { text: 'A', index: 0, disabled: true } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('pick')).toBeUndefined()
  })

  it('doğru şıkta renge ek olarak ikon ve gizli metin gösterir', () => {
    const wrapper = mount(ChoiceButton, { props: { text: 'A', index: 0, state: 'correct' } })

    expect(wrapper.classes().join(' ')).toContain('border-success')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('.sr-only').text()).toBe('Doğru cevap')
  })

  it('yanlış şıkta ikon, gizli metin ve sallanma sınıfı vardır', () => {
    const wrapper = mount(ChoiceButton, { props: { text: 'A', index: 0, state: 'wrong' } })

    expect(wrapper.classes()).toContain('anim-shake')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('.sr-only').text()).toBe('Yanlış cevap')
  })

  it('normal durumda ikon ve gizli metin yoktur', () => {
    const wrapper = mount(ChoiceButton, { props: { text: 'A', index: 0 } })

    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.find('.sr-only').exists()).toBe(false)
  })

  it('en az 56 px yüksekliğinde tam genişlikte bir hedeftir', () => {
    const wrapper = mount(ChoiceButton, { props: { text: 'A', index: 0 } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['min-h-14', 'w-full']))
  })
})

describe('QuestionCard', () => {
  const question = makeQuestion(2)

  function states(wrapper: ReturnType<typeof mount>) {
    return wrapper.findAllComponents(ChoiceButton).map((button) => button.props('state'))
  }

  it('soru metnini, sırasını ve 4 şıkkı gösterir', () => {
    const wrapper = mount(QuestionCard, {
      props: { question, correctChoiceId: null, selectedChoiceId: null, locked: false },
    })

    expect(wrapper.text()).toContain('Soru 3 / 20')
    expect(wrapper.get('h2').text()).toBe('Soru 3?')
    expect(wrapper.findAll('button')).toHaveLength(4)
    expect(states(wrapper)).toEqual(['idle', 'idle', 'idle', 'idle'])
  })

  it('cevaptan sonra doğruyu yeşil, seçilen yanlışı pembe, kalanı soluk gösterir', () => {
    const wrapper = mount(QuestionCard, {
      props: { question, correctChoiceId: 2, selectedChoiceId: 3, locked: true },
    })

    expect(states(wrapper)).toEqual(['dimmed', 'correct', 'wrong', 'dimmed'])
  })

  it('süre aşımında (seçim yok) yalnızca doğru şıkkı gösterir', () => {
    const wrapper = mount(QuestionCard, {
      props: { question, correctChoiceId: 4, selectedChoiceId: null, locked: true },
    })

    expect(states(wrapper)).toEqual(['dimmed', 'dimmed', 'dimmed', 'correct'])
  })

  it('kilitliyken şıklar devre dışıdır, açıkken tıklama şık kimliğini yayar', async () => {
    const locked = mount(QuestionCard, {
      props: { question, correctChoiceId: null, selectedChoiceId: null, locked: true },
    })
    expect(
      locked.findAll('button').every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)

    const open = mount(QuestionCard, {
      props: { question, correctChoiceId: null, selectedChoiceId: null, locked: false },
    })
    await open.findAll('button')[2]?.trigger('click')
    expect(open.emitted('pick')).toEqual([[3]])
  })

  it('soru metni HTML içerse bile düz metin basılır', () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: makeQuestion(0, { question: { id: 1, text: '<img src=x onerror=alert(1)>' } }),
        correctChoiceId: null,
        selectedChoiceId: null,
        locked: false,
      },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('ProgressDots', () => {
  function dots(statuses: DotStatus[], current = -1) {
    return mount(ProgressDots, { props: { statuses, total: 20, current } })
  }

  it('toplam soru kadar nokta çizer', () => {
    expect(dots([]).findAll('[data-testid="progress-dot"]')).toHaveLength(20)
  })

  it('doğru yeşil, yanlış pembe, süre aşımı gri, şimdiki vurgulu, kalanlar sönüktür', () => {
    const wrapper = dots(['correct', 'wrong', 'timeout'], 3)
    const classes = wrapper
      .findAll('[data-testid="progress-dot"]')
      .map((dot) => dot.classes().join(' '))

    expect(classes[0]).toContain('bg-success')
    expect(classes[1]).toContain('bg-accent')
    expect(classes[2]).toContain('bg-muted')
    expect(classes[3]).toContain('bg-primary')
    expect(classes[4]).toContain('bg-ink/10')
  })

  it('renge ek olarak ekran okuyucuya özet verir', () => {
    const wrapper = dots(['correct', 'correct', 'wrong', 'timeout'])

    expect(wrapper.attributes('aria-label')).toBe(
      '20 sorudan 4 tanesi cevaplandı: 2 doğru, 1 yanlış, 1 süre aşımı',
    )
    expect(wrapper.attributes('role')).toBe('img')
  })
})

describe('CountdownRing', () => {
  function ring(remainingMs: number) {
    return mount(CountdownRing, { props: { remainingMs, limitMs: 5000 } })
  }

  it.each([
    [5000, 'success'],
    [3001, 'success'],
    [3000, 'warning'],
    [2001, 'warning'],
    [2000, 'accent'],
    [500, 'accent'],
  ])('%i ms kala renk tonu %s', (remaining, tone) => {
    expect(ring(remaining).attributes('data-tone')).toBe(tone)
  })

  it('kalan süreyi yukarı yuvarlanmış saniye olarak gösterir', () => {
    expect(ring(4200).get('span[aria-hidden="true"]').text()).toBe('5')
    expect(ring(1000).get('span[aria-hidden="true"]').text()).toBe('1')
    expect(ring(0).get('span[aria-hidden="true"]').text()).toBe('0')
  })

  it('son 2 saniyede nabız animasyonu vardır, süre bitince yoktur', () => {
    expect(ring(1500).classes()).toContain('anim-soft-pulse')
    expect(ring(4000).classes()).not.toContain('anim-soft-pulse')
    expect(ring(0).classes()).not.toContain('anim-soft-pulse')
  })

  it('halka kalan süreyle orantılı boşalır', () => {
    const offset = (remaining: number) =>
      Number(ring(remaining).findAll('circle')[1]?.attributes('stroke-dashoffset'))

    expect(offset(5000)).toBeCloseTo(0)
    expect(offset(2500)).toBeCloseTo(Math.PI * 44, 0) // çevrenin yarısı
    expect(offset(0)).toBeCloseTo(2 * Math.PI * 44, 0)
  })

  it('ekran okuyucuya yalnızca son 3 saniyeyi duyurur', () => {
    const announced = (remaining: number) => ring(remaining).get('[aria-live="polite"]').text()

    expect(announced(5000)).toBe('')
    expect(announced(3500)).toBe('')
    expect(announced(3000)).toBe('3')
    expect(announced(2000)).toBe('2')
    expect(announced(900)).toBe('1')
    expect(announced(0)).toBe('')
  })
})

describe('ReadyCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('3-2-1 sayar ve ardından done yayar', async () => {
    const wrapper = mount(ReadyCountdown)
    expect(wrapper.text()).toContain('3')

    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.text()).toContain('2')
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.text()).toContain('1')
    expect(wrapper.emitted('done')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  it('done yalnızca bir kez yayılır', async () => {
    const wrapper = mount(ReadyCountdown)

    await vi.advanceTimersByTimeAsync(10_000)

    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  it('kaldırılınca sayaç durur', async () => {
    const wrapper = mount(ReadyCountdown)
    wrapper.unmount()

    await vi.advanceTimersByTimeAsync(10_000)

    expect(wrapper.emitted('done')).toBeUndefined()
  })
})

describe('NameForm', () => {
  function form(props: { submitting?: boolean; error?: string } = {}) {
    return mount(NameForm, { props: { submitting: false, ...props } })
  }

  async function submit(wrapper: ReturnType<typeof form>, value: string) {
    await wrapper.get('input').setValue(value)
    await wrapper.get('form').trigger('submit')
  }

  it('geçerli ismi kırpıp boşlukları teke indirerek gönderir', async () => {
    const wrapper = form()

    await submit(wrapper, '  Zeynep    Su ')

    expect(wrapper.emitted('submit')).toEqual([['Zeynep Su']])
  })

  it.each(['Ayşe', 'Çağlar Öztürk', 'Mert_34', 'İlker', 'ab'])(
    '"%s" geçerli isimdir',
    async (name) => {
      const wrapper = form()

      await submit(wrapper, name)

      expect(wrapper.emitted('submit')).toEqual([[name]])
    },
  )

  it.each(['', ' ', 'a'])('çok kısa isim (%j) gönderilmez ve uyarı gösterir', async (name) => {
    const wrapper = form()

    await submit(wrapper, name)

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('2–20 karakter')
  })

  it('21 karakterlik isim gönderilmez', async () => {
    const wrapper = form()

    await submit(wrapper, 'a'.repeat(21))

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it.each(['<script>', 'Ali!', 'ali@x.com', 'Ali-Veli', 'Ali😀'])(
    'geçersiz karakterli isim (%s) gönderilmez',
    async (name) => {
      const wrapper = form()

      await submit(wrapper, name)

      expect(wrapper.emitted('submit')).toBeUndefined()
      expect(wrapper.get('[role="alert"]').text()).toContain('harf, rakam')
    },
  )

  it('yazmaya devam edince yerel hata kaybolur', async () => {
    const wrapper = form()
    await submit(wrapper, 'a')
    expect(wrapper.get('[role="alert"]').text()).not.toBe('')

    await wrapper.get('input').setValue('ab')

    expect(wrapper.get('[role="alert"]').text()).toBe('')
  })

  it('sunucudan gelen hatayı gösterir ve alanı geçersiz işaretler', () => {
    const wrapper = form({ error: 'Bu isim kullanılamaz.' })

    expect(wrapper.get('[role="alert"]').text()).toBe('Bu isim kullanılamaz.')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('gönderilirken düğme kapanır ve durum yazar', () => {
    const wrapper = form({ submitting: true })

    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Kaydediliyor…')
  })

  it('alan etiketli ve hata mesajına bağlıdır (erişilebilirlik)', () => {
    const wrapper = form()

    expect(wrapper.get('label').attributes('for')).toBe(wrapper.get('input').attributes('id'))
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('player-name-error')
  })
})

describe('LeaderboardTable', () => {
  const rows = [1, 2, 3, 4].map((rank) => makeRow(rank))

  it('her skor için bir satır çizer', () => {
    const wrapper = mount(LeaderboardTable, { props: { rows } })

    expect(wrapper.findAll('[data-testid="score-row"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('Oyuncu 1')
    expect(wrapper.text()).toContain('2900')
  })

  it('ilk 3 sırada madalya (altın/gümüş/bronz), sonrasında yoktur', () => {
    const wrapper = mount(LeaderboardTable, { props: { rows } })
    const text = (index: number) =>
      wrapper.findAll('[data-testid="score-row"]')[index]?.text() ?? ''

    expect(text(0)).toContain('Altın madalya')
    expect(text(1)).toContain('Gümüş madalya')
    expect(text(2)).toContain('Bronz madalya')
    expect(text(3)).not.toContain('madalya')
    expect(wrapper.find('.bg-warning').exists()).toBe(true)
    expect(wrapper.find('.bg-medal-silver').exists()).toBe(true)
    expect(wrapper.find('.bg-medal-bronze').exists()).toBe(true)
  })

  it('kullanıcının kendi satırını vurgular', () => {
    const wrapper = mount(LeaderboardTable, {
      props: { rows, highlight: { rank: 2, score: 2800, name: 'Oyuncu 2' } },
    })
    const rowsEl = wrapper.findAll('[data-testid="score-row"]')

    expect(rowsEl[1]?.attributes('aria-current')).toBe('true')
    expect(rowsEl[1]?.classes()).toContain('bg-primary/10')
    expect(rowsEl[1]?.text()).toContain('sen')
    expect(rowsEl[0]?.attributes('aria-current')).toBeUndefined()
  })

  it('aynı sıra ama farklı isim/puan olan satırı kendi satırı saymaz', () => {
    const wrapper = mount(LeaderboardTable, {
      props: { rows, highlight: { rank: 2, score: 9999, name: 'Başkası' } },
    })

    expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(0)
  })

  it('oyuncu adını düz metin olarak basar (XSS)', () => {
    const wrapper = mount(LeaderboardTable, {
      props: { rows: [makeRow(1, { player_name: '<img src=x onerror=alert(1)>' })] },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  })

  it('doğru sayısını toplam soruyla birlikte gösterir', () => {
    const wrapper = mount(LeaderboardTable, { props: { rows: [makeRow(1)], totalQuestions: 20 } })

    expect(wrapper.text()).toContain('19/20')
  })

  it('tablo anlamsal başlıklara ve gizli başlığa sahiptir', () => {
    const wrapper = mount(LeaderboardTable, { props: { rows } })

    expect(wrapper.findAll('th[scope="col"]')).toHaveLength(4)
    expect(wrapper.get('caption').text()).toContain('Skor tablosu')
  })
})

describe('ConfirmDialog', () => {
  const props = {
    open: true,
    title: 'Quiz bitecek, emin misin?',
    message: 'İlerleme kaybolur.',
    confirmText: 'Çık',
    cancelText: 'Devam et',
  }

  it('kapalıyken hiçbir şey çizmez', () => {
    const wrapper = mount(ConfirmDialog, { props: { ...props, open: false } })

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('açıkken başlık, mesaj ve iki düğmeyi gösterir', () => {
    const wrapper = mount(ConfirmDialog, { props })

    expect(wrapper.get('[role="alertdialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('Quiz bitecek, emin misin?')
    expect(wrapper.text()).toContain('İlerleme kaybolur.')
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual(
      expect.arrayContaining(['Çık', 'Devam et']),
    )
  })

  it('düğmeler doğru olayı yayar', async () => {
    const wrapper = mount(ConfirmDialog, { props })
    const button = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)

    await button('Çık')?.trigger('click')
    await button('Devam et')?.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('Escape ve arka plana tıklama iptal sayılır', async () => {
    const wrapper = mount(ConfirmDialog, { props })

    await wrapper
      .get('[role="alertdialog"]')
      .element.parentElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    await wrapper.get('div.fixed').trigger('click')

    expect(wrapper.emitted('cancel')?.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('dialog içine tıklamak iptal etmez', async () => {
    const wrapper = mount(ConfirmDialog, { props })

    await wrapper.get('[role="alertdialog"]').trigger('click')

    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('açılınca odağı güvenli seçeneğe (Devam et) verir', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...props, open: false },
      attachTo: document.body,
    })

    await wrapper.setProps({ open: true })
    await wrapper.vm.$nextTick()

    expect(document.activeElement?.textContent?.trim()).toBe('Devam et')
    wrapper.unmount()
  })
})

describe('ErrorMessage', () => {
  async function render(props: Record<string, unknown>) {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    return mount(ErrorMessage, {
      props: { message: 'Bir şey ters gitti.', ...props },
      global: { plugins: [router] },
    })
  }

  it('mesajı uyarı rolüyle gösterir', async () => {
    const wrapper = await render({})

    expect(wrapper.get('[role="alert"]').text()).toContain('Bir şey ters gitti.')
  })

  it('"Tekrar dene" yalnızca yeniden denenebilir hatada görünür ve retry yayar', async () => {
    const without = await render({})
    expect(without.text()).not.toContain('Tekrar dene')

    const wrapper = await render({ retryable: true })
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('ana sayfa bağlantısı varsayılan olarak vardır, istenirse gizlenir', async () => {
    expect((await render({})).get('a').attributes('href')).toBe('/')
    expect((await render({ homeLink: false })).find('a').exists()).toBe(false)
  })
})
