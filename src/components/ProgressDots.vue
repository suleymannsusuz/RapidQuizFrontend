<script setup lang="ts">
import { computed } from 'vue'
import type { DotStatus } from '@/stores/quiz'

const props = defineProps<{
  statuses: DotStatus[]
  total: number
  /** Şu an cevaplanmakta olan sorunun sırası (yoksa -1). */
  current: number
}>()

function dotClass(index: number) {
  const status = props.statuses[index]
  if (status === 'correct') return 'bg-success'
  if (status === 'wrong') return 'bg-accent'
  if (status === 'timeout') return 'bg-muted/50'
  if (index === props.current) return 'bg-primary ring-4 ring-primary/20'
  return 'bg-ink/10'
}

const summary = computed(() => {
  const correct = props.statuses.filter((s) => s === 'correct').length
  const wrong = props.statuses.filter((s) => s === 'wrong').length
  const timeout = props.statuses.filter((s) => s === 'timeout').length
  return (
    `${props.total} sorudan ${props.statuses.length} tanesi cevaplandı: ` +
    `${correct} doğru, ${wrong} yanlış, ${timeout} süre aşımı`
  )
})
</script>

<template>
  <div class="flex items-center justify-between gap-1" role="img" :aria-label="summary">
    <span
      v-for="index in total"
      :key="index"
      class="h-2.5 min-w-0 flex-1 rounded-full transition-colors duration-300"
      :class="dotClass(index - 1)"
      data-testid="progress-dot"
    ></span>
  </div>
</template>
