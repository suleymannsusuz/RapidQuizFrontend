<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { fetchCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import { fetchLeaderboard } from '@/api/leaderboard'
import type { Category, LeaderboardResponse } from '@/api/types'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LeaderboardTable from '@/components/LeaderboardTable.vue'
import { useQuizStore } from '@/stores/quiz'

const props = defineProps<{ category?: string }>()

const router = useRouter()
const store = useQuizStore()

const categories = ref<Category[]>([])
const board = ref<LeaderboardResponse | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const tabsNav = ref<HTMLElement | null>(null)

const activeSlug = computed(() => props.category ?? categories.value[0]?.slug ?? '')

/** Bu oturumda skor kaydeden oyuncunun kendi satırı (yalnızca o kategoride görünür). */
const mine = computed(() => {
  const submitted = store.submitted
  if (!submitted || store.result?.category.slug !== activeSlug.value) return null
  return { rank: submitted.rank, score: submitted.score, name: store.submittedName }
})

const outsideTopTen = computed(
  () => !!store.submitted && !!mine.value && !store.submitted.in_top_10,
)

async function loadBoard(slug: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    board.value = await fetchLeaderboard(slug)
    celebrate()
  } catch (error) {
    board.value = null
    errorMessage.value = error instanceof ApiError ? error.message : 'Skor tablosu yüklenemedi.'
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    categories.value = await fetchCategories()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Kategoriler yüklenemedi.'
    loading.value = false
    return
  }
  const first = categories.value[0]
  if (!props.category && first) {
    // /leaderboard adresi ilk kategoriye yönlenir
    router.replace({ name: 'leaderboard', params: { category: first.slug } })
  } else if (props.category) {
    await loadBoard(props.category)
  } else {
    loading.value = false
  }
}

// İlk 10'a girildiyse konfeti (hareketi azalt açıkken kütüphane kendisi kapatır)
async function celebrate() {
  if (!mine.value || !store.submitted?.in_top_10 || store.confettiPlayed) return
  store.confettiPlayed = true
  const { default: confetti } = await import('canvas-confetti')
  confetti({
    particleCount: 140,
    spread: 85,
    origin: { y: 0.25 },
    colors: ['#7c3aed', '#ff4d8d', '#16c79a', '#ffc531'],
    disableForReducedMotion: true,
  })
}

onMounted(loadAll)

// Dar ekranda etkin sekme taşıp kesilmesin: görünür alana kaydır
watch(
  [() => categories.value.length, activeSlug],
  () => {
    tabsNav.value
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  },
  { flush: 'post' },
)

// Sekme değişince ya da /leaderboard ilk kategoriye yönlenince tabloyu yükler
watch(
  () => props.category,
  (slug) => {
    if (slug && categories.value.length) loadBoard(slug)
  },
)
</script>

<template>
  <section>
    <h1 class="font-display text-3xl font-extrabold">Skor tablosu</h1>
    <p class="mt-1 text-muted">Her kategorinin en iyi 10 skoru.</p>

    <nav
      v-if="categories.length"
      ref="tabsNav"
      class="-mx-4 mt-5 overflow-x-auto px-4"
      aria-label="Kategoriler"
    >
      <ul class="flex gap-2 pb-1">
        <li v-for="item in categories" :key="item.slug" class="shrink-0">
          <RouterLink
            :to="{ name: 'leaderboard', params: { category: item.slug } }"
            class="block min-h-11 rounded-full px-4 py-2.5 text-sm font-bold transition"
            :class="
              item.slug === activeSlug
                ? 'bg-primary text-white'
                : 'bg-surface text-ink ring-1 ring-ink/10 hover:bg-canvas'
            "
            :aria-current="item.slug === activeSlug ? 'page' : undefined"
          >
            {{ item.name }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="mt-5">
      <div v-if="loading" class="grid gap-2" aria-busy="true" aria-label="Skor tablosu yükleniyor">
        <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-surface/70"></div>
      </div>

      <ErrorMessage v-else-if="errorMessage" :message="errorMessage" retryable @retry="loadAll" />

      <template v-else-if="board">
        <LeaderboardTable
          v-if="board.leaderboard.length"
          :rows="board.leaderboard"
          :highlight="mine"
          :total-questions="store.totalQuestions"
        />
        <div v-else class="rounded-3xl bg-surface p-6 text-center shadow-sm ring-1 ring-ink/5">
          <p class="font-display text-xl font-bold">Henüz skor yok</p>
          <p class="mt-1 text-muted">Bu kategoride ilk sen ol!</p>
          <RouterLink
            :to="{ name: 'quiz', params: { category: board.category.slug } }"
            class="mt-4 inline-block min-h-11 rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:opacity-90"
          >
            Oyna
          </RouterLink>
        </div>

        <div
          v-if="outsideTopTen && store.submitted"
          class="mt-4 rounded-2xl bg-surface p-4 text-center ring-1 ring-primary/30"
        >
          <p class="font-semibold">
            Sıralaman:
            <span class="font-display text-xl font-extrabold text-primary"
              >#{{ store.submitted.rank }}</span
            >
            · {{ store.submitted.score }} puan
          </p>
          <p class="text-sm text-muted">İlk 10'a girmek için bir daha dene!</p>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-4">
          <RouterLink
            :to="{ name: 'quiz', params: { category: board.category.slug } }"
            class="min-h-11 rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:opacity-90"
          >
            Tekrar oyna
          </RouterLink>
          <RouterLink
            :to="{ name: 'home' }"
            class="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Ana sayfa
          </RouterLink>
        </div>
      </template>
    </div>
  </section>
</template>
