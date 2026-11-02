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

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu (port 5173) |
| `npm run build` | Tip denetimi + üretim derlemesi (`dist/`) |
| `npm test` | Birim ve bileşen testleri (Vitest) |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run gen:api` | Backend OpenAPI şemasından API tiplerini üretir |
