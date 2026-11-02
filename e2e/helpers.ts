import { expect, type Locator, type Page } from '@playwright/test'

export const QUESTION_COUNT = 20

/** Ana sayfadan bir kategori seçip quiz'i başlatır ("Hazır ol" görünene kadar bekler). */
export async function startQuiz(page: Page, slug: string) {
  await page.goto('/')
  await page.locator(`a[href="/quiz/${slug}"]`).click()
  await expect(page.getByText('Hazır ol')).toBeVisible()
}

export function questionCard(page: Page, position: number): Locator {
  return page.getByRole('region', { name: `Soru ${position} / ${QUESTION_COUNT}` })
}

/** Soru kartı gelip şıklar tıklanabilir olana kadar bekler (3 sn "hazır ol" dahil). */
export async function waitForQuestion(page: Page, position: number) {
  const card = questionCard(page, position)
  await expect(card).toBeVisible({ timeout: 10_000 })
  await expect(card.getByRole('button')).toHaveCount(4)
  await expect(card.getByRole('button').first()).toBeEnabled()
  return card
}

export async function currentScore(page: Page): Promise<number> {
  return Number(await page.getByTestId('score').innerText())
}

/** Geri bildirim satırı: "Doğru!", "Yanlış" ya da "Süre doldu". */
export function feedback(page: Page): Locator {
  return page.locator('p[role="status"]', { hasText: /Doğru!|Yanlış|Süre doldu/ })
}

/**
 * Tüm soruları sırayla cevaplar (her soruda farklı bir şık). Her cevapta kazanılan puanın
 * kurallara uyduğunu denetler: doğruysa 100–150, yanlışsa 0. Nihai puanı döner.
 */
export async function playAllQuestions(page: Page): Promise<number> {
  let previous = 0
  for (let position = 1; position <= QUESTION_COUNT; position++) {
    const card = await waitForQuestion(page, position)
    await card
      .getByRole('button')
      .nth(position % 4)
      .click()

    await expect(feedback(page)).toBeVisible()
    const text = await feedback(page).innerText()
    const score = await currentScore(page)
    const gained = score - previous

    if (text.includes('Doğru')) {
      expect(gained, `${position}. soru doğru: puan 100–150 olmalı`).toBeGreaterThanOrEqual(100)
      expect(gained).toBeLessThanOrEqual(150)
    } else {
      expect(gained, `${position}. soru yanlış: puan 0 olmalı`).toBe(0)
    }
    previous = score
  }
  return previous
}

/** Aynı koşuda yazılan skorları sonradan ayıklamak için tanınabilir, benzersiz isim. */
export function e2eName(): string {
  return `e2e_${Date.now().toString(36)}`.slice(0, 20)
}
