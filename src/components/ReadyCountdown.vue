<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** "Hazır ol" 3-2-1. Bu sırada soru istenmez, yani sunucuda süre başlamaz. */
const emit = defineEmits<{ done: [] }>()

const props = withDefaults(defineProps<{ from?: number; intervalMs?: number }>(), {
  from: 3,
  intervalMs: 1000,
})

const count = ref(props.from)
let timer = 0

onMounted(() => {
  timer = window.setInterval(() => {
    if (count.value > 1) {
      count.value -= 1
    } else {
      window.clearInterval(timer)
      emit('done')
    }
  }, props.intervalMs)
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="flex flex-col items-center py-16 text-center" role="status" aria-live="assertive">
    <p class="font-display text-xl font-bold text-muted">Hazır ol</p>
    <p
      :key="count"
      class="anim-pop-in mt-2 font-display text-9xl font-extrabold leading-none text-primary"
    >
      {{ count }}
    </p>
    <p class="mt-6 text-sm text-muted">Süre ilk soruyla birlikte başlar</p>
  </div>
</template>
