import { expect, test } from '@playwright/test'
import {
  currentScore,
  e2eName,
  feedback,
  playAllQuestions,
  startQuiz,
  waitForQuestion,
  API_URL,
  QUESTION_COUNT,
} from './helpers'

test.describe('tam oyun', () => {
  test('kategori seç → 20 soru → sonuç → isim → skor tablosu', async ({ page }) => {
    await startQuiz(page, 'bilgisayar-muhendisligi')

    // "Hazır ol" 3-2-1; süre ilk soruyla başlar
    await expect(page.getByText('Süre ilk soruyla birlikte başlar')).toBeVisible()
    await expect(page.getByTestId('countdown-ring')).toBeHidden()

    const finalScore = await playAllQuestions(page)

    // Sonuç sayfası sunucunun hesapladığı toplam puanı gösterir
    await expect(page).toHaveURL(/\/result$/)
    await expect(page.getByRole('heading', { name: 'Quiz bitti!' })).toBeVisible()
    await expect(page.getByTestId('final-score')).toHaveText(String(finalScore))

    // Uygunsuz isim sunucu tarafında reddedilir ve sayfada kalınır
    const nameField = page.getByLabel('Adını yaz')
    await nameField.fill('Siktir')
    await nameField.press('Enter')
    await expect(page.getByRole('alert').filter({ hasText: 'Bu isim kullanılamaz.' })).toBeVisible()
    await expect(page).toHaveURL(/\/result$/)

    // Geçersiz karakter istemcide yakalanır (sunucuya gitmeden)
    await nameField.fill('<b>x</b>')
    await nameField.press('Enter')
    await expect(page.getByRole('alert').filter({ hasText: 'yalnızca harf, rakam' })).toBeVisible()

    // Düzeltilen isimle skor kaydedilir
    const name = e2eName()
    await nameField.fill(name)
    await page.getByRole('button', { name: 'Skoru kaydet' }).click()

    await expect(page).toHaveURL(/\/leaderboard\/bilgisayar-muhendisligi$/)
    await expect(page.getByRole('link', { name: 'Bilgisayar Mühendisliği' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // İlk 10'daysa satırımız vurgulanır; değilse sıralama kutusu skoru gösterir
    const myRow = page.getByRole('row', { name: new RegExp(name) })
    const outsideBox = page.getByText('Sıralaman:')
    await expect(myRow.or(outsideBox)).toBeVisible()
    if (await myRow.isVisible()) {
      await expect(myRow).toContainText('sen')
      await expect(myRow).toContainText(String(finalScore))
      await expect(myRow).toHaveAttribute('aria-current', 'true')
    } else {
      await expect(outsideBox.locator('..')).toContainText(`${finalScore} puan`)
    }
  })

  // Gerçek bir bot arayüzü kullanmaz, API'yi doğrudan çağırır. (Arayüzden "anında" oynamak
  // mümkün değil: Playwright tıklamadan önce kartın kayarak yerleşmesini bekler.)
  test("API'yi anında oynayan istemcinin skoru kaydedilmez (bot önlemi)", async ({ request }) => {
    const created = await request.post(`${API_URL}/sessions/`, {
      data: { category: 'fizik', platform: 'web' },
    })
    expect(created.status()).toBe(201)
    const session = await created.json()
    const headers = { 'X-Session-Token': session.session_token }
    const base = `${API_URL}/sessions/${session.session_id}`

    for (let position = 0; position < QUESTION_COUNT; position++) {
      const question = await (await request.get(`${base}/question/`, { headers })).json()
      const answer = await request.post(`${base}/answer/`, {
        headers,
        data: { question_id: question.question.id, choice_id: question.choices[0].id },
      })
      expect(answer.status()).toBe(200)
    }

    const name = e2eName()
    const rejected = await request.post(`${base}/score/`, { headers, data: { player_name: name } })
    expect(rejected.status()).toBe(422)
    expect((await rejected.json()).error.code).toBe('score_rejected')

    // Skor tablosuna hiçbir şey yazılmadı
    const board = await (await request.get(`${API_URL}/leaderboard/?category=fizik`)).json()
    expect(board.leaderboard.map((row: { player_name: string }) => row.player_name)).not.toContain(
      name,
    )
  })

  test('sonuç sayfası yenilenirse oyun kaybolur ve ana sayfaya dönülür', async ({ page }) => {
    await startQuiz(page, 'fizik')
    await playAllQuestions(page)
    await expect(page).toHaveURL(/\/result$/)

    // Sayfa yenilenirse oturum anahtarı bellekte olduğundan sonuç sayfası ana sayfaya döner
    await page.reload()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /Hazır mısın\?/ })).toBeVisible()
  })
})

test.describe('süre', () => {
  test('süre dolunca "Süre doldu", 0 puan ve ilerleme noktası gri', async ({ page }) => {
    await startQuiz(page, 'yazilim')
    await waitForQuestion(page, 1)

    // Cevap vermeden 5 saniyeyi bekle
    await expect(feedback(page)).toHaveText('Süre doldu', { timeout: 9_000 })
    expect(await currentScore(page)).toBe(0)
    await expect(
      page.getByRole('img', { name: /1 tanesi cevaplandı: 0 doğru, 0 yanlış, 1 süre aşımı/ }),
    ).toBeVisible()

    // Doğru şık yine de gösterilir, şıklar kilitlidir
    const card = page.getByRole('region', { name: 'Soru 1 / 20' })
    await expect(card.getByText('Doğru cevap')).toHaveCount(1)
    for (const choice of await card.getByRole('button').all()) {
      await expect(choice).toBeDisabled()
    }

    // 900 ms sonra sıradaki soru gelir ve sayaç yeniden 5'ten başlar
    await waitForQuestion(page, 2)
    await expect(page.getByTestId('countdown-ring')).toContainText(/[45]/)
  })

  test('süre dolmadan verilen cevap hız bonusu alır (100–150 puan)', async ({ page }) => {
    await startQuiz(page, 'ulkeler')
    const card = await waitForQuestion(page, 1)

    await page.keyboard.press('1') // klavye kısayolu: 1. şık
    await expect(feedback(page)).toBeVisible()
    const text = await feedback(page).innerText()
    const score = await currentScore(page)

    if (text.includes('Doğru')) {
      expect(score).toBeGreaterThan(100)
      expect(score).toBeLessThanOrEqual(150)
      await expect(page.getByText(`+${score}`)).toBeVisible()
    } else {
      expect(score).toBe(0)
    }
    await expect(card.getByRole('button').first()).toBeDisabled()
  })
})

test.describe('quiz sırasında çıkış', () => {
  test('geri tuşu onay sorar; "Devam et" oyunda tutar, "Çık" ana sayfaya götürür', async ({
    page,
  }) => {
    await startQuiz(page, 'yapay-zeka')
    await waitForQuestion(page, 1)

    await page.goBack()
    const dialog = page.getByRole('alertdialog', { name: 'Quiz bitecek, emin misin?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Devam et' })).toBeFocused()

    await dialog.getByRole('button', { name: 'Devam et' }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/quiz\/yapay-zeka$/)
    await expect(page.getByRole('region', { name: /^Soru \d+ \/ 20$/ })).toBeVisible()

    await page.goBack()
    await dialog.getByRole('button', { name: 'Çık' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('"Hazır ol" sırasında da onay sorulur', async ({ page }) => {
    await startQuiz(page, 'fizik')

    await page.getByRole('link', { name: 'Rapid Quiz' }).click()

    await expect(page.getByRole('alertdialog', { name: 'Quiz bitecek, emin misin?' })).toBeVisible()
  })
})

test.describe('sayfalar', () => {
  test("ana sayfa 5 kategoriyi API'den gösterir", async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('main li a')).toHaveCount(5)
    await expect(page.locator('a[href="/quiz/yapay-zeka"]')).toContainText('Yapay Zeka')
    await expect(page.locator('a[href="/quiz/ulkeler"]')).toContainText('Ülkeler')
  })

  test('bilinmeyen kategori anlaşılır bir hata gösterir', async ({ page }) => {
    await page.goto('/quiz/yok-boyle-bir-kategori')

    await expect(page.getByText('Bu kategori bulunamadı.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tekrar dene' })).toHaveCount(0)
    await page.getByRole('link', { name: 'Ana sayfaya dön' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('skor tablosu sekmeleri kategori değiştirir', async ({ page }) => {
    await page.goto('/leaderboard')

    await expect(page).toHaveURL(/\/leaderboard\/yazilim$/)
    await page.getByRole('link', { name: 'Fizik' }).click()
    await expect(page).toHaveURL(/\/leaderboard\/fizik$/)
    await expect(page.getByRole('link', { name: 'Fizik' })).toHaveAttribute('aria-current', 'page')
  })

  test('biten quiz yokken /result ana sayfaya yönlenir', async ({ page }) => {
    await page.goto('/result')

    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('telefon (375×812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  async function horizontalOverflow(page: import('@playwright/test').Page) {
    return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  }

  test('sayfalar yatay taşmaz; şıklar parmakla basılacak büyüklükte', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main li a')).toHaveCount(5)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    await page.locator('a[href="/quiz/yazilim"]').click()
    const card = await waitForQuestion(page, 1)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    // Doküman: şıklar en az 56 px yüksek ve tam genişlik; soru ≥ 20 px, şık ≥ 17 px
    for (const choice of await card.getByRole('button').all()) {
      const box = await choice.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(56)
      expect(box?.width ?? 0).toBeGreaterThan(375 * 0.8)
    }
    const sizes = await card.evaluate((element) => ({
      question: parseFloat(getComputedStyle(element.querySelector('h2') as Element).fontSize),
      choice: parseFloat(getComputedStyle(element.querySelector('button') as Element).fontSize),
    }))
    expect(sizes.question).toBeGreaterThanOrEqual(20)
    expect(sizes.choice).toBeGreaterThanOrEqual(17)

    await page.goto('/leaderboard/yazilim')
    await expect(page.getByRole('heading', { name: 'Skor tablosu' })).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })

  test('hareketi azalt açıkken sallanma ve kayma animasyonları kapanır', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.locator('a[href="/quiz/yazilim"]').click()
    const card = await waitForQuestion(page, 1)

    await card.getByRole('button').first().click()
    await expect(feedback(page)).toBeVisible()

    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('section button, section')].map(
        (element) => parseFloat(getComputedStyle(element).animationDuration) || 0,
      ),
    )
    expect(Math.max(...durations)).toBeLessThan(0.01)
  })
})
