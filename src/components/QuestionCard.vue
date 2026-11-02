<script setup lang="ts">
import { computed } from 'vue'
import type { QuestionResponse } from '@/api/types'
import ChoiceButton, { type ChoiceState } from './ChoiceButton.vue'

const props = defineProps<{
  question: QuestionResponse
  /** Cevap sonrası doğru şıkkın kimliği; cevaplanana kadar null. */
  correctChoiceId: number | null
  selectedChoiceId: number | null
  /** Seçim kapalıyken (cevap gönderilmiş ya da geri bildirim) true. */
  locked: boolean
}>()

defineEmits<{ pick: [choiceId: number] }>()

function stateOf(choiceId: number): ChoiceState {
  if (props.correctChoiceId === null) return 'idle'
  if (choiceId === props.correctChoiceId) return 'correct'
  if (choiceId === props.selectedChoiceId) return 'wrong'
  return 'dimmed'
}

const heading = computed(
  () => `Soru ${props.question.position + 1} / ${props.question.total_questions}`,
)
</script>

<template>
  <section class="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-ink/5" :aria-label="heading">
    <p class="text-sm font-semibold text-muted">{{ heading }}</p>
    <h2 class="mt-2 text-[22px] font-bold leading-snug">{{ question.question.text }}</h2>
    <div class="mt-5 grid gap-3">
      <ChoiceButton
        v-for="(choice, index) in question.choices"
        :key="choice.id"
        :text="choice.text"
        :index="index"
        :state="stateOf(choice.id)"
        :disabled="locked"
        @pick="$emit('pick', choice.id)"
      />
    </div>
  </section>
</template>
