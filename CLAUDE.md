# Rapid Quiz — Frontend (Vue 3)

5 kategoride 20'şer soru soran, soru başına 5 saniye süre tanıyan, üyeliksiz bilgi yarışmasının web istemcisi. Tasarım ve kurallar: `C:\Users\Süleyman\PycharmProjects\RapidQuizBackend\docs\rapid-quiz-proje-dokumani.md` (kaynak doküman). Backend ayrı repoda: `C:\Users\Süleyman\PycharmProjects\RapidQuizBackend` (Django + DRF); API sözleşmesi orada, `CLAUDE.md`'de.

## Değişmez kurallar

- **Doğru cevap, süre ve puan sunucuda belirlenir.** İstemci yalnızca soruyu gösterir ve cevabı iletir; sayaç **yalnızca görseldir**, asıl hakem sunucudur. Sayaç sunucudan gelen `remaining_ms` ile başlar, sıfıra inince `choice_id: null` gönderilir.
- Puanı, doğru cevabı ya da süreyi istemcide hesaplama/varsayma. `points`, `total_score`, `correct_choice_id` her zaman cevap yanıtından gelir.
- Oyuncu adı ve API'den gelen her metin **düz metin** olarak basılır (`{{ }}`); `v-html` yasak (ESLint `vue/no-v-html: error`). API'den gelen renk stile koymadan önce `safeColor()` ile doğrulanır.
- Tüm API çağrıları tek yerden geçer: `src/api/`. Bileşenler `axios`'u doğrudan kullanmaz.
- Hatalar `ApiError` olarak gelir (`code`, `message`, `status`, `details`). Davranışı `code` belirler (ör. `session_expired`), `message` kullanıcıya gösterilebilir.
- Oturum anahtarı (`session_token`) çerez/`localStorage`'a yazılmaz; bellekte (Pinia) tutulur ve interceptor ile yalnızca `/sessions/...` isteklerine `X-Session-Token` olarak eklenir.
- Backend adresi `VITE_API_BASE_URL` ile verilir (derleme zamanında koda gömülür; gizli bilgi konmaz).
- Mobil öncelikli tasarım; kullanıcıya dönük metinler Türkçe.

## Teknoloji

Vue 3 (Composition API, `<script setup>`), TypeScript 5.9 (`typescript-eslint`/`openapi-typescript` henüz TS 7'yi desteklemiyor, sürümü yükseltme), Vite, Vue Router, Pinia, Axios, Tailwind CSS v4 (token'lar `src/assets/styles/main.css` içinde `@theme` ile), Vitest + Vue Test Utils, ESLint + Prettier. Yazı tipleri `@fontsource-variable` ile kendi sunucumuzdan: Outfit (başlık), Plus Jakarta Sans (metin). İkonlar `lucide-vue-next`.

## Komutlar

Node.js bu makinede PATH'te değil (bkz. aşağıda). Proje klasöründe:

```bash
npm run dev            # http://localhost:5173 (port sabit: backend CORS'u bu adrese izin verir)
npm run type-check     # vue-tsc --build
npm run lint           # ESLint
npm run format         # Prettier (format:check: yalnızca denetler)
npm test               # Vitest (birim ve bileşen testleri)
npm run build          # type-check + vite build → dist/
npm run gen:api        # backend OpenAPI şemasından src/api/schema.d.ts üretir
```

`gen:api` çalışan backend'i bekler (`http://localhost:8000/api/v1/schema/`); farklı adres için `OPENAPI_URL=... npm run gen:api`. `src/api/schema.d.ts` üretilmiş dosyadır, elle düzenlenmez; backend API'si değişince yeniden üret ve commit'le. Derleme/test öncesi `npm run type-check && npm run lint && npm test` temiz olmalı.

Bu makinede Node.js taşınabilir kurulu: `C:\Users\Süleyman\RapidQuizTools\node\node-v26.13.0-win-x64`. Komutlardan önce `PATH`'e eklenmeli (yolda `ü` olduğundan ASCII kısa yol `C:/Users/SLEYMA~1/...` kullan).

## Yapı

```text
src/
  api/          client.ts (axios + interceptor), errors.ts (ApiError), types.ts, schema.d.ts (üretilmiş),
                categories.ts, sessions.ts, leaderboard.ts
  assets/styles/main.css   # Tailwind + renk/yazı tipi token'ları + hareketi azalt kuralı
  components/   CategoryCard.vue  (planlı: QuestionCard, ChoiceButton, CountdownRing, ProgressDots,
                                   ScoreBurst, NameForm, LeaderboardTable)
  composables/  (planlı: useCountdown.ts, useKeyboardAnswers.ts)
  lib/          color.ts (safeColor/tint), categoryIcons.ts
  router/       index.ts (createAppRouter fabrikası, sayfa başlıkları)
  stores/       (planlı: quiz.ts)
  views/        HomeView (hazır), QuizView / ResultView / LeaderboardView (iskelet)
tests/          api, components, lib, views, router (src'yi yansıtır), setup.ts
```

Rotalar: `/` ana sayfa, `/quiz/:category`, `/result`, `/leaderboard/:category?`; bilinmeyen adres `/`'e döner. Quiz sayfasından çıkarken (geri tuşu dahil) "Quiz bitecek, emin misin?" onayı gösterilecek.

## Tasarım (proje dokümanı, bölüm 11)

Açık, ferah zemin; doygun, enerjik renkler; koyu tema varsayılan değil. Token'lar: `canvas #F7F5FF`, `surface #FFFFFF`, `primary #7C3AED` (ana buton, logo, odak), `accent #FF4D8D` (yanlış cevap, vurgu), `success #16C79A` (doğru), `warning #FFC531` (son 2 sn, madalyalar), `ink #1E1B4B` (ana metin), `muted #6B6890` (alt metin). Kategori renkleri API'den gelir (`categories.color`); renkli zemin üzerine beyaz yazı koyma (kontrast düşük), kart beyaz kalır, renk şerit/ikon zemininde kullanılır.

- Şık butonları: en az 56 px yükseklik, tam genişlik, 16 px köşe. Soru metni mobilde en az 20 px, şıklar en az 17 px.
- Geri sayım halkası: 5–3 sn yeşil, 3–2 sn sarı, son 2 sn pembe + hafif nabız. 20 noktalı ilerleme çubuğu (doğru yeşil, yanlış pembe, süre aşımı gri).
- Doğru: şık yeşile döner, `+puan` yukarı süzülür. Yanlış: şık sallanır, doğru şık yeşil gösterilir. Geri bildirim 900 ms, sonra sıradaki soru kayarak gelir.
- Klavye: 1–4 şıkları seçer. Quiz başında 3-2-1 "Hazır ol" (süre ilk sorudan önce başlamaz). Sonuçta puan sayarak artar, ilk 10'a girildiyse konfeti. Skor tablosunda ilk 3 altın/gümüş/bronz, kullanıcının satırı vurgulu.
- Erişilebilirlik: WCAG AA kontrast; renk tek başına anlam taşımaz (doğru/yanlışta ikon da); `prefers-reduced-motion` açıkken sallanma/konfeti/kayma kapanır (CSS'te genel kural var, konfeti için ayrıca kontrol et); görünür odak halkası; sayaç `aria-live` ile son 3 saniyeyi bildirir.

## Yol haritası (Aşama 4)

- [x] Vite + Vue 3 + TypeScript + Tailwind kurulumu, renk token'ları
- [x] API katmanı (tipler OpenAPI'den), ana sayfa kategori listesi
- [ ] Pinia store (oturum, mevcut soru, puan), quiz ekranı (hazır ol, sayaç, ilerleme, geri bildirim)
- [ ] Sonuç ekranı + isim formu, skor tablosu
- [ ] Animasyonlar, klavye kısayolları, erişilebilirlik cilası
- [ ] Playwright ile tam bir quiz akışı testi (backend'e karşı)

## Deploy (DigitalOcean App Platform static site)

`.do/app.yaml`: `npm ci && npm run build`, `dist/` yayınlanır. `catchall_document: index.html` zorunlu (Vue Router history modu). Backend adresi `VITE_API_BASE_URL` (BUILD_TIME) ile verilir; değişirse yeniden build gerekir. `main` dalı korunmalı: `deploy_on_push` testlerden bağımsız yayına alır.
