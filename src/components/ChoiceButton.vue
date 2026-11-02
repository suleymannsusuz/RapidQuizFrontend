<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'
import { computed } from 'vue'

export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dimmed'

const props = defineProps<{
  text: string
  index: number
  state?: ChoiceState
  disabled?: boolean
}>()

defineEmits<{ pick: [] }>()

const state = computed(() => props.state ?? 'idle')

const classes = computed(
  () =>
    ({
      idle: 'border-transparent bg-surface ring-1 ring-ink/10 hover:border-primary active:scale-[0.99]',
      correct: 'border-success bg-success/10 ring-1 ring-success/30',
      wrong: 'border-accent bg-accent/10 ring-1 ring-accent/30 anim-shake',
      dimmed: 'border-transparent bg-surface/60 opacity-60 ring-1 ring-ink/5',
    })[state.value],
)
</script>

<template>
  <button
    type="button"
    class="flex min-h-14 w-full items-center gap-3 rounded-choice border-2 px-4 py-3 text-left text-[17px] font-semibold leading-snug transition"
    :class="classes"
    :disabled="disabled"
    @click="$emit('pick')"
  >
    <span
      class="grid size-8 shrink-0 place-items-center rounded-lg bg-ink/5 text-sm font-bold text-muted"
      aria-hidden="true"
    >
      {{ index + 1 }}
    </span>
    <span class="flex-1">{{ text }}</span>
    <!-- Renk tek başına anlam taşımasın diye ikon ve gizli metin de var -->
    <template v-if="state === 'correct'">
      <Check class="size-6 shrink-0 text-success" aria-hidden="true" />
      <span class="sr-only">Doğru cevap</span>
    </template>
    <template v-else-if="state === 'wrong'">
      <X class="size-6 shrink-0 text-accent" aria-hidden="true" />
      <span class="sr-only">Yanlış cevap</span>
    </template>
  </button>
</template>
