import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setSessionTokenProvider } from '@/api/client'
import { ApiError } from '@/api/errors'
import { fetchQuestion, fetchResult, startSession, submitAnswer, submitScore } from '@/api/sessions'
import type {
  AnswerResponse,
  CategoryRef,
  QuestionResponse,
  ResultResponse,
  ScoreSubmitted,
} from '@/api/types'

export type Phase =
  | 'idle'
  | 'starting'
  | 'ready' // "Hazır ol" 3-2-1: süre henüz başlamadı
  | 'loading' // sıradaki soru isteniyor
  | 'question'
  | 'answering' // cevap gönderildi, sunucu yanıtı bekleniyor
  | 'feedback' // doğru/yanlış gösteriliyor
  | 'finished'
  | 'error'

export type DotStatus = 'correct' | 'wrong' | 'timeout'

type FailedStep = 'start' | 'question' | 'answer' | 'result'

const ACTIVE_PHASES: Phase[] = ['starting', 'ready', 'loading', 'question', 'answering', 'feedback']

/** Yeniden denenebilir (geçici) hatalar; diğerleri için oyun baştan başlatılır. */
const RETRYABLE_CODES = ['network_error', 'timeout', 'server_error', 'unknown_error']

/**
 * Oyunun durumu. Doğru cevap, süre ve puan sunucudan gelir; burada yalnızca gösterilir.
 * Oturum anahtarı bellekte tutulur (sayfa yenilenirse oyun yeniden başlar).
 */
export const useQuizStore = defineStore('quiz', () => {
  const sessionId = ref<string | null>(null)
  const token = ref<string | null>(null)
  const category = ref<CategoryRef | null>(null)
  const totalQuestions = ref(20)
  const timeLimitMs = ref(5000)

  const phase = ref<Phase>('idle')
  const question = ref<QuestionResponse | null>(null)
  const selectedChoiceId = ref<number | null>(null)
  const lastAnswer = ref<AnswerResponse | null>(null)
  const history = ref<DotStatus[]>([])
  const totalScore = ref(0)

  const result = ref<ResultResponse | null>(null)
  const submitted = ref<ScoreSubmitted | null>(null)
  const submittedName = ref('')
  const confettiPlayed = ref(false)

  const error = ref<ApiError | null>(null)
  const failedStep = ref<FailedStep | null>(null)

  let requestedSlug = ''
  let pendingChoice: number | null = null

  setSessionTokenProvider(() => token.value)

  const isActive = computed(() => ACTIVE_PHASES.includes(phase.value))
  const canRetry = computed(() => !!error.value && RETRYABLE_CODES.includes(error.value.code))

  function reset() {
    sessionId.value = null
    token.value = null
    category.value = null
    phase.value = 'idle'
    question.value = null
    selectedChoiceId.value = null
    lastAnswer.value = null
    history.value = []
    totalScore.value = 0
    result.value = null
    submitted.value = null
    submittedName.value = ''
    confettiPlayed.value = false
    error.value = null
    failedStep.value = null
    pendingChoice = null
  }

  function fail(step: FailedStep, cause: unknown) {
    error.value =
      cause instanceof ApiError
        ? cause
        : new ApiError('unknown_error', 'Beklenmeyen bir hata oluştu.')
    failedStep.value = step
    phase.value = 'error'
  }

  async function start(categorySlug: string) {
    reset()
    requestedSlug = categorySlug
    phase.value = 'starting'
    try {
      const session = await startSession({ category: categorySlug, platform: 'web' })
      sessionId.value = session.session_id
      token.value = session.session_token
      category.value = session.category
      totalQuestions.value = session.total_questions
      timeLimitMs.value = session.time_limit_ms
      phase.value = 'ready'
    } catch (cause) {
      fail('start', cause)
    }
  }

  /** Sıradaki soruyu ister; sunucu süreyi bu istekte başlatır. */
  async function loadQuestion() {
    if (!sessionId.value) return
    phase.value = 'loading'
    try {
      const next = await fetchQuestion(sessionId.value)
      question.value = next
      totalScore.value = next.current_score
      selectedChoiceId.value = null
      lastAnswer.value = null
      phase.value = 'question'
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'session_finished') {
        await finish()
        return
      }
      fail('question', cause)
    }
  }

  /** Cevabı gönderir; `null`, süre dolduğu anlamına gelir. */
  async function answer(choiceId: number | null) {
    if (phase.value !== 'question' || !question.value || !sessionId.value) return
    phase.value = 'answering'
    selectedChoiceId.value = choiceId
    pendingChoice = choiceId
    try {
      const response = await submitAnswer(sessionId.value, {
        question_id: question.value.question.id,
        choice_id: choiceId,
      })
      lastAnswer.value = response
      totalScore.value = response.total_score
      history.value.push(response.timed_out ? 'timeout' : response.is_correct ? 'correct' : 'wrong')
      phase.value = 'feedback'
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'already_answered') {
        // Cevap daha önce işlendi (yanıt kaybolmuş olabilir): sonucu bilmeden devam et;
        // doğru puan bir sonraki sorunun current_score alanından gelir.
        history.value.push('timeout')
        lastAnswer.value = null
        await advance()
        return
      }
      fail('answer', cause)
    }
  }

  /** Geri bildirimden sonra sıradaki soruya ya da sonuca geçer. */
  async function advance() {
    if (lastAnswer.value?.is_last || history.value.length >= totalQuestions.value) {
      await finish()
    } else {
      await loadQuestion()
    }
  }

  async function finish() {
    if (!sessionId.value) return
    phase.value = 'loading'
    try {
      result.value = await fetchResult(sessionId.value)
      totalScore.value = result.value.total_score
      phase.value = 'finished'
    } catch (cause) {
      fail('result', cause)
    }
  }

  async function retry() {
    const step = failedStep.value
    error.value = null
    failedStep.value = null
    if (step === 'start') await start(requestedSlug)
    else if (step === 'question') await loadQuestion()
    else if (step === 'result') await finish()
    else if (step === 'answer') {
      phase.value = 'question'
      await answer(pendingChoice)
    }
  }

  /** İsmi kaydeder; hata fırlatırsa çağıran (form) mesajı gösterir. */
  async function saveScore(playerName: string) {
    if (!sessionId.value) throw new ApiError('not_found', 'Oturum bulunamadı.', 404)
    submitted.value = await submitScore(sessionId.value, { player_name: playerName })
    submittedName.value = playerName
  }

  return {
    sessionId,
    category,
    totalQuestions,
    timeLimitMs,
    phase,
    question,
    selectedChoiceId,
    lastAnswer,
    history,
    totalScore,
    result,
    submitted,
    submittedName,
    confettiPlayed,
    error,
    isActive,
    canRetry,
    start,
    loadQuestion,
    answer,
    advance,
    retry,
    saveScore,
    reset,
  }
})
