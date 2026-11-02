import { defineConfig, devices } from '@playwright/test'

/**
 * Uçtan uca testler: gerçek tarayıcı + çalışan backend (docker compose up).
 * Vite geliştirme sunucusu gerekirse otomatik başlatılır.
 */
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  // Bir oyun gerçek zamanlıdır (3 sn hazır ol + 20 soru + geri bildirimler)
  timeout: 120_000,
  expect: { timeout: 10_000 },
  // Backend IP başına dakikada 10 oturum açtırır; testler sırayla çalışır
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'tr-TR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
