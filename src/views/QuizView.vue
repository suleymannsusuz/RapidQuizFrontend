<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CountdownRing from '@/components/CountdownRing.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import ProgressDots from '@/components/ProgressDots.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import ReadyCountdown from '@/components/ReadyCountdown.vue'
import ScoreBurst from '@/components/ScoreBurst.vue'
import { useCountdown } from '@/composables/useCountdown'
import { useKeyboardAnswers } from '@/composables/useKeyboardAnswers'
import { useQuizStore } from '@/stores/quiz'

const props = defineProps<{ category: string }>()

const store = useQuizStore()
const router = useRouter()

/** Doğru/yanlış geri bildirimi bu kadar görünür, sonra sıradaki soru gelir. */
const FEEDBACK_MS = 900

// Sayaç yalnızca görseldir; süre dolunca "null" göndeririz, asıl kararı sunucu verir.
const countdown = useCountdown(() => store.answer(null))
let feedbackTimer = 0

const dotCurrent = computed(() =>
  store.question && ['question', 'answering'].includes(store.phase) ? store.question.position : -1,
)

const showCard = computed(
  () =>
    store.question !== null &&
    ['loading', 'question', 'answering', 'feedback'].includes(store.phase),
)

const inFeedback = computed(() => store.phase === 'feedback')

const correctChoiceId = computed(() =>
  inFeedback.value ? (store.lastAnswer?.correct_choice_id ?? null) : null,
)

const feedback = computed(() => {
  const answer = inFeedback.value ? store.lastAnswer : null
  if (!answer) return null
  if (answer.timed_out) return { text: 'Süre doldu', tone: 'text-muted' }
  if (answer.is_correct) return { text: 'Doğru!', tone: 'text-success' }
  return { text: 'Yanlış', tone: 'text-accent' }
})

const errorText = computed(() => {
  const error = store.error
  if (!error) return ''
  if (error.code === 'not_found') return 'Bu kategori bulunamadı.'
  if (error.code === 'session_expired') return 'Oturum süresi doldu. Yeni bir oyun başlatabilirsin.'
  return error.message
})

const canRestart = computed(
  () =>
    !!store.error &&
    ['session_expired', 'invalid_token', 'session_finished'].includes(store.error.code),
)

function pick(choiceId: number) {
  store.answer(choiceId)
}

useKeyboardAnswers(
  (index) => {
    const choice = store.question?.choices[index]
    if (choice) pick(choice.id)
  },
  computed(() => store.phase === 'question'),
)

watch(
  () => store.phase,
  (phase) => {
    window.clearTimeout(feedbackTimer)
    if (phase === 'question' && store.question) {
      countdown.start(store.question.remaining_ms)
    } else {
      countdown.stop()
    }
    if (phase === 'feedback') {
      feedbackTimer = window.setTimeout(() => store.advance(), FEEDBACK_MS)
    }
    if (phase === 'finished') {
      router.replace({ name: 'result' })
    }
  },
)

function begin() {
  store.start(props.category)
}

onMounted(begin)
watch(() => props.category, begin)

// --- Sayfadan çıkarken "Quiz bitecek, emin misin?" onayı (geri tuşu dahil) ---------------
const leaveDialogOpen = ref(false)
let resolveLeave: ((leave: boolean) => void) | null = null

onBeforeRouteLeave(() => {
  if (!store.isActive) return true
  leaveDialogOpen.value = true
  return new Promise<boolean>((resolve) => {
    resolveLeave = resolve
  })
})

function answerLeave(leave: boolean) {
  leaveDialogOpen.value = false
  resolveLeave?.(leave)
  resolveLeave = null
}

// Sekme kapatma / yenileme
function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (store.isActive) event.preventDefault()
}
window.addEventListener('beforeunload', warnBeforeUnload)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload)
  window.clearTimeout(feedbackTimer)
  // Quiz bitmeden çıkıldıysa oturum bırakılır; bittiyse sonuç sayfası store'u kullanır.
  if (store.phase !== 'finished') store.reset()
})
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-3">
      <p class="truncate font-display text-lg font-bold">{{ store.category?.name }}</p>
      <p class="shrink-0 rounded-full bg-surface px-4 py-1.5 text-sm font-bold ring-1 ring-ink/10">
        Puan
        <span class="tabular-nums text-primary" data-testid="score">{{ store.totalScore }}</span>
      </p>
    </div>

    <ProgressDots
      class="mt-4"
      :statuses="store.history"
      :total="store.totalQuestions"
      :current="dotCurrent"
    />

    <div class="mt-6">
      <ReadyCountdown v-if="store.phase === 'ready'" @done="store.loadQuestion()" />

      <div v-else-if="store.phase === 'error' && store.error">
        <ErrorMessage :message="errorText" :retryable="store.canRetry" @retry="store.retry()" />
        <button
          v-if="canRestart"
          type="button"
          class="mt-3 min-h-11 rounded-xl bg-primary px-5 font-semibold text-white transition hover:opacity-90"
          @click="begin"
        >
          Yeniden başla
        </button>
      </div>

      <div v-else-if="showCard && store.question">
        <CountdownRing :remaining-ms="countdown.remainingMs.value" :limit-ms="store.timeLimitMs" />

        <div class="relative mt-5">
          <ScoreBurst
            v-if="inFeedback && store.lastAnswer && store.lastAnswer.points > 0"
            :key="store.question.question.id"
            :points="store.lastAnswer.points"
          />
          <Transition name="slide" mode="out-in">
            <QuestionCard
              :key="store.question.question.id"
              :question="store.question"
              :correct-choice-id="correctChoiceId"
              :selected-choice-id="store.selectedChoiceId"
              :locked="store.phase !== 'question'"
              @pick="pick"
            />
          </Transition>
        </div>

        <p
          class="mt-3 h-7 text-center text-lg font-bold"
          :class="feedback?.tone"
          role="status"
          aria-live="polite"
        >
          {{ feedback?.text }}
        </p>
        <p class="mt-2 hidden text-center text-sm text-muted md:block">
          İpucu: şıkları 1–4 tuşlarıyla da seçebilirsin
        </p>
      </div>

      <p v-else class="py-16 text-center text-muted" role="status">Yükleniyor…</p>
    </div>

    <ConfirmDialog
      :open="leaveDialogOpen"
      title="Quiz bitecek, emin misin?"
      message="Şimdi çıkarsan bu oyunun ilerlemesi kaybolur."
      confirm-text="Çık"
      cancel-text="Devam et"
      @confirm="answerLeave(true)"
      @cancel="answerLeave(false)"
    />
  </section>
</template>
