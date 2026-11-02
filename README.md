# Rapid Quiz — Frontend

Rapid Quiz'in Vue 3 web istemcisi. Backend: [RapidQuizBackend](https://github.com/suleymannsusuz/RapidQuizBackend). Geliştirici notları: [`CLAUDE.md`](CLAUDE.md).

## Kurulum

Node.js 24 veya üstü gerekir.

```bash
npm ci
cp .env.example .env.local     # gerekirse VITE_API_BASE_URL'i düzenle
npm run dev                    # http://localhost:5173
```

Backend'i ayrı repodan çalıştır (`docker compose up`, ardından `migrate` ve `load_questions`); varsayılan adres `http://localhost:8000/api/v1`.

## Komutlar

| Komut                             | Ne yapar                                        |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Geliştirme sunucusu (port 5173)                 |
| `npm run build`                   | Tip denetimi + üretim derlemesi (`dist/`)       |
| `npm test`                        | Birim ve bileşen testleri (Vitest)              |
| `npm run test:e2e`                | Uçtan uca testler (Playwright, backend gerekir) |
| `npm run lint` / `npm run format` | ESLint / Prettier                               |
| `npm run gen:api`                 | Backend OpenAPI şemasından API tiplerini üretir |

## Uçtan uca testler (Playwright)

Gerçek tarayıcı ve **çalışan backend** ister (`docker compose up -d`; `migrate` ve `load_questions` yapılmış olmalı). Vite sunucusu gerekirse otomatik başlar.

```bash
npm run e2e:install   # bir kez: Chromium (headless shell) indirir
npm run test:e2e
```

Backend adresi farklıysa `E2E_API_URL=http://host:8000/api/v1`. Testler gerçek zamanlı oynar (12 test yaklaşık 2 dakika) ve tam oyun testleri dev veritabanına `e2e_...` adlı skor yazar. Temizlemek için backend klasöründe:

```bash
docker compose exec web python manage.py shell -c "from apps.leaderboard.models import ScoreEntry; print(ScoreEntry.objects.filter(player_name__startswith='e2e_').delete())"
```
