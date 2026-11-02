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
npm run test:e2e       # Playwright (gerçek tarayıcı + çalışan backend gerekir; bkz. aşağıda)
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
  assets/styles/main.css   # Tailwind + renk/yazı tipi token'ları + oyun animasyonları + hareketi azalt kuralı
  components/   CategoryCard, ReadyCountdown, CountdownRing, ProgressDots, ChoiceButton, QuestionCard,
                ScoreBurst, NameForm, LeaderboardTable, ConfirmDialog, ErrorMessage
  composables/  useCountdown (rAF + setTimeout yedeği), useKeyboardAnswers (1–4), useCountUp
  lib/          color.ts (safeColor/tint), categoryIcons.ts, format.ts (süre, tarih)
  router/       index.ts (createAppRouter fabrikası, sayfa başlıkları, /result koruması)
  stores/       quiz.ts (oyunun tüm durumu: oturum, soru, geçmiş, sonuç, skor kaydı)
  views/        HomeView, QuizView, ResultView, LeaderboardView
tests/          api, components, composables, lib, stores, views, router (src'yi yansıtır);
                fixtures.ts (veri üreticileri), helpers.ts (mountApp, sahte saat), setup.ts
```

Rotalar: `/` ana sayfa, `/quiz/:category`, `/result`, `/leaderboard/:category?`; bilinmeyen adres `/`'e döner. Quiz sayfasından çıkarken (geri tuşu dahil) "Quiz bitecek, emin misin?" onayı gösterilecek.

## Oyun akışı (`stores/quiz.ts`, `views/QuizView.vue`)

Evreler: `idle → starting → ready (3-2-1) → loading → question → answering → feedback → loading → … → finished`; hata olursa `error`. Önemli kararlar:

- **Süre ilk soruyla başlar:** "Hazır ol" sırasında soru istenmez; sunucu süreyi `GET /question/` isteğinde başlatır.
- Sayaç (`useCountdown`) sunucunun `remaining_ms` değeriyle başlar; `requestAnimationFrame` ile çizilir, süre dolması ayrıca `setTimeout` ile güvence altındadır (pencere arka plandayken rAF kısıtlanır). Dolunca `choice_id: null` gönderilir.
- Cevap sırasında şıklar kilitlenir (`phase !== 'question'`); aynı soruya art arda tıklama/tuş tek istek gönderir. Geri bildirim 900 ms sürer, sonra `advance()` sıradaki soruyu ya da sonucu getirir.
- Hata yönetimi: geçici hatalar (`network_error`, `timeout`, `server_error`) "Tekrar dene" ile aynı adımı yineler (cevap hatasında aynı şıkla). `already_answered` hata sayılmaz, sıradaki soruya geçilir (puan bir sonraki sorunun `current_score` alanından senkronlanır). `session_expired` vb. için "Yeniden başla" sunulur.
- **Çıkış onayı:** quiz aktifken (hazır ol dahil) rota değişimi ya da tarayıcı geri tuşu "Quiz bitecek, emin misin?" penceresini açar (`onBeforeRouteLeave`, async guard); sekme kapatma/yenileme `beforeunload` uyarısı verir. Sayfa yenilenirse oturum anahtarı bellekte olduğundan oyun kaybolur (yeni oyun başlar).
- Sonuç sayfasına yalnızca biten quiz varken girilir (router koruması). İsim formu istemci tarafında da doğrulanır (sunucu kurallarıyla aynı), asıl doğrulama sunucudadır; gönderim sürerken ikinci gönderim yok sayılır.
- Skor tablosunda kendi satırın `rank + puan + isim` eşleşmesiyle vurgulanır; ilk 10'a girildiyse konfeti (tembel yüklenir, `disableForReducedMotion`) bir kez patlar; ilk 10 dışındaysa sıran ayrıca gösterilir.

## Tasarım (proje dokümanı, bölüm 11)

Açık, ferah zemin; doygun, enerjik renkler; koyu tema varsayılan değil. Token'lar: `canvas #F7F5FF`, `surface #FFFFFF`, `primary #7C3AED` (ana buton, logo, odak), `accent #FF4D8D` (yanlış cevap, vurgu), `success #16C79A` (doğru), `warning #FFC531` (son 2 sn, madalyalar), `ink #1E1B4B` (ana metin), `muted #6B6890` (alt metin). Kategori renkleri API'den gelir (`categories.color`); renkli zemin üzerine beyaz yazı koyma (kontrast düşük), kart beyaz kalır, renk şerit/ikon zemininde kullanılır.

- Şık butonları: en az 56 px yükseklik, tam genişlik, 16 px köşe. Soru metni mobilde en az 20 px, şıklar en az 17 px.
- Geri sayım halkası: 5–3 sn yeşil, 3–2 sn sarı, son 2 sn pembe + hafif nabız. 20 noktalı ilerleme çubuğu (doğru yeşil, yanlış pembe, süre aşımı gri).
- Doğru: şık yeşile döner, `+puan` yukarı süzülür. Yanlış: şık sallanır, doğru şık yeşil gösterilir. Geri bildirim 900 ms, sonra sıradaki soru kayarak gelir.
- Klavye: 1–4 şıkları seçer. Quiz başında 3-2-1 "Hazır ol" (süre ilk sorudan önce başlamaz). Sonuçta puan sayarak artar, ilk 10'a girildiyse konfeti. Skor tablosunda ilk 3 altın/gümüş/bronz, kullanıcının satırı vurgulu.
- Erişilebilirlik: WCAG AA kontrast; renk tek başına anlam taşımaz (doğru/yanlışta ikon da); `prefers-reduced-motion` açıkken sallanma/konfeti/kayma kapanır (CSS'te genel kural var, konfeti için ayrıca kontrol et); görünür odak halkası; sayaç `aria-live` ile son 3 saniyeyi bildirir.

## Yol haritası (Aşama 4)

- [x] Vite + Vue 3 + TypeScript + Tailwind kurulumu, renk token'ları
- [x] API katmanı (tipler OpenAPI'den), Pinia store
- [x] Ana sayfa, quiz ekranı (hazır ol, sayaç, ilerleme, geri bildirim), sonuç, skor tablosu
- [x] Animasyonlar, klavye kısayolları, erişilebilirlik (hareketi azalt, odak halkası, `aria-live`)
- [x] Playwright ile tam bir quiz akışı testi (`e2e/`, backend'e karşı; 12 test)
- [ ] Gerçek telefonda 5 saniye ve ağ toleransı testi (Aşama 5)

## Uçtan uca testler (`e2e/`, Playwright)

`playwright.config.ts`: Chromium (headless shell), tek işçi (backend IP başına dakikada 10 oturum açtırır). `e2e/global-setup.ts` backend yoksa ya da kategori yüklenmemişse anlaşılır bir mesajla durur. Testler gerçek zamanlıdır ve gerçek backend'e yazar: tam oyun testleri dev veritabanına `e2e_...` adlı skor bırakır (temizleme komutu `README.md`'de).

Doğru cevapları bilmeye gerek yoktur: testler her cevapta kazanılan puanın kurala uyduğunu (doğruysa 100–150, yanlışsa 0) ve nihai puanın sonuç ekranında ve skor tablosunda aynı göründüğünü denetler. Kapsam: tam oyun (isim reddi dahil), süre aşımı, klavye kısayolu, geri tuşu/çıkış onayı, bilinmeyen kategori, sekmeler, telefon boyutunda taşma ve dokunma hedefi/yazı boyutu, hareketi azalt. `e2e/` Vitest'e girmez (yalnızca `tests/` toplanır) ve kendi `tsconfig.e2e.json`'ı vardır. Bir testin gerçekten bir şeyi denetlediğinden emin olmak için ilgili davranışı geçici bozup testin düştüğünü gör (çıkış onayı için yapıldı).

## Deploy (DigitalOcean App Platform static site)

`.do/app.yaml`: `npm ci && npm run build`, `dist/` yayınlanır. `catchall_document: index.html` zorunlu (Vue Router history modu). Backend adresi `VITE_API_BASE_URL` (BUILD_TIME) ile verilir; değişirse yeniden build gerekir. `main` dalı korunmalı: `deploy_on_push` testlerden bağımsız yayına alır.
