<script setup lang="ts">
/** Kazanılan puan (+138) yukarı süzülür. Hareketi azalt açıkken animasyon kapanır (global kural). */
defineProps<{ points: number }>()
</script>

<template>
  <p
    class="anim-float-up pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 font-display text-4xl font-extrabold text-success"
    aria-hidden="true"
  >
    +{{ points }}
  </p>
</template>
