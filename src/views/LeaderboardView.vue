<script setup lang="ts">
// Kategori sekmeli ilk 10 tablosu sonraki adımda yazılacak.
defineProps<{ category?: string }>()
</script>

<template>
  <section>
    <h1 class="text-3xl font-extrabold">Skor tablosu</h1>
    <p v-if="category" class="mt-2 text-muted">Kategori: {{ category }}</p>
  </section>
</template>
