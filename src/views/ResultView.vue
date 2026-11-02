<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError } from '@/api/errors'
import NameForm from '@/components/NameForm.vue'
import { useCountUp } from '@/composables/useCountUp'
import { formatDuration } from '@/lib/format'
import { useQuizStore } from '@/stores/quiz'

const store = useQuizStore()
const router = useRouter()

const result = computed(() => store.result)
const slug = computed(() => result.value?.category.slug ?? '')

const { value: shownScore, run: countUp } = useCountUp(1400)

const submitting = ref(false)
const formError = ref('')

onMounted(() => {
  if (!result.value) {
    router.replace({ name: 'home' })
    return
  }
  countUp(result.value.total_score)
})

function goToLeaderboard() {
  router.push({ name: 'leaderboard', params: { category: slug.value } })
}

async function save(name: string) {
  if (submitting.value) return
  submitting.value = true
  formError.value = ''
  try {
    await store.saveScore(name)
    goToLeaderboard()
  } catch (error) {
    if (error instanceof ApiError && error.code === 'score_already_submitted') {
      goToLeaderboard()
    } else if (error instanceof ApiError) {
      const detail = error.details.player_name
      formError.value = Array.isArray(detail) ? String(detail[0]) : error.message
    } else {
      formError.value = 'Skor kaydedilemedi, tekrar dene.'
    }
  } finally {
    submitting.value = false
  }
}

function leave() {
  store.reset()
  router.push({ name: 'home' })
}
</script>

<template>
  <section v-if="result">
    <p class="text-center font-semibold text-muted">{{ result.category.name }}</p>
    <h1 class="mt-1 text-center font-display text-3xl font-extrabold">Quiz bitti!</h1>

    <div class="mt-6 rounded-3xl bg-surface p-6 text-center shadow-sm ring-1 ring-ink/5">
      <p class="text-sm font-semibold uppercase tracking-wide text-muted">Puanın</p>
      <p
        class="font-display text-7xl font-extrabold tabular-nums text-primary"
        :aria-label="`${result.total_score} puan`"
        data-testid="final-score"
      >
        {{ shownScore }}
      </p>
      <dl class="mt-4 grid grid-cols-2 gap-3 text-center">
        <div class="rounded-2xl bg-canvas p-3">
          <dt class="text-xs font-semibold text-muted">Doğru</dt>
          <dd class="font-display text-2xl font-bold">
            {{ result.correct_count
            }}<span class="text-base text-muted"> / {{ result.total_questions }}</span>
          </dd>
        </div>
        <div class="rounded-2xl bg-canvas p-3">
          <dt class="text-xs font-semibold text-muted">Toplam süre</dt>
          <dd class="font-display text-2xl font-bold">
            {{ formatDuration(result.total_response_ms) }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="mt-5">
      <NameForm :submitting="submitting" :error="formError" @submit="save" />
    </div>

    <div class="mt-5 flex items-center justify-between text-sm font-semibold">
      <RouterLink
        :to="{ name: 'quiz', params: { category: result.category.slug } }"
        class="text-primary underline-offset-4 hover:underline"
      >
        Tekrar oyna
      </RouterLink>
      <button type="button" class="text-muted underline-offset-4 hover:underline" @click="leave">
        Kaydetmeden çık
      </button>
    </div>
  </section>
</template>
