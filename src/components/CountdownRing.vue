<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  remainingMs: number
  limitMs: number
}>()

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const fraction = computed(() =>
  props.limitMs > 0 ? Math.min(1, Math.max(0, props.remainingMs / props.limitMs)) : 0,
)
const seconds = computed(() => Math.ceil(props.remainingMs / 1000))

// 5–3 sn yeşil, 3–2 sn sarı, son 2 sn pembe ve hafif nabız
const tone = computed(() => {
  if (props.remainingMs > 3000) return 'success'
  if (props.remainingMs > 2000) return 'warning'
  return 'accent'
})

const strokeClass = computed(
  () =>
    ({ success: 'stroke-success', warning: 'stroke-warning', accent: 'stroke-accent' })[tone.value],
)
const textClass = computed(
  () => ({ success: 'text-ink', warning: 'text-ink', accent: 'text-accent' })[tone.value],
)

// Ekran okuyucu yalnızca son 3 saniyeyi bildirir (her saniye bir kez)
const announcement = computed(() =>
  seconds.value > 0 && seconds.value <= 3 ? `${seconds.value}` : '',
)
</script>

<template>
  <div
    class="relative mx-auto grid size-28 place-items-center"
    :class="{ 'anim-soft-pulse': tone === 'accent' && remainingMs > 0 }"
    data-testid="countdown-ring"
    :data-tone="tone"
  >
    <svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" :r="RADIUS" fill="none" class="stroke-ink/10" stroke-width="8" />
      <circle
        cx="50"
        cy="50"
        :r="RADIUS"
        fill="none"
        stroke-width="8"
        stroke-linecap="round"
        :class="strokeClass"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="CIRCUMFERENCE * (1 - fraction)"
      />
    </svg>
    <span
      class="font-display text-4xl font-extrabold tabular-nums"
      :class="textClass"
      aria-hidden="true"
    >
      {{ seconds }}
    </span>
    <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{
      announcement
    }}</span>
  </div>
</template>
