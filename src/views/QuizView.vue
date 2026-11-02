<script setup lang="ts">
// Hazır ol geri sayımı, sorular, sayaç ve geri bildirim sonraki adımda yazılacak.
defineProps<{ category: string }>()
</script>

<template>
  <section>
    <h1 class="text-3xl font-extrabold">Quiz</h1>
    <p class="mt-2 text-muted">Kategori: {{ category }}</p>
  </section>
</template>
