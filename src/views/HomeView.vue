<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import type { Category } from '@/api/types'
import CategoryCard from '@/components/CategoryCard.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'

const categories = ref<Category[]>([])
const loading = ref(true)
const errorMessage = ref('')

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    categories.value = await fetchCategories()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Kategoriler yüklenemedi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section>
    <h1 class="font-display text-4xl font-extrabold leading-tight tracking-tight">
      5 saniye. 20 soru.<br />
      <span class="text-primary">Hazır mısın?</span>
    </h1>
    <p class="mt-3 text-muted">Bir kategori seç, hızını ve bilgini göster.</p>

    <div
      v-if="loading"
      class="mt-6 grid gap-3"
      aria-busy="true"
      aria-label="Kategoriler yükleniyor"
    >
      <div v-for="n in 5" :key="n" class="h-[76px] animate-pulse rounded-2xl bg-surface/70"></div>
    </div>

    <ErrorMessage
      v-else-if="errorMessage"
      class="mt-6"
      :message="errorMessage"
      retryable
      :home-link="false"
      @retry="load"
    />

    <p v-else-if="categories.length === 0" class="mt-6 rounded-2xl bg-surface p-5 text-muted">
      Henüz kategori yok.
    </p>

    <ul v-else class="mt-6 grid gap-3">
      <li v-for="category in categories" :key="category.slug">
        <CategoryCard :category="category" />
      </li>
    </ul>

    <RouterLink
      :to="{ name: 'leaderboard' }"
      class="mt-6 inline-block font-semibold text-primary underline-offset-4 hover:underline"
    >
      Oynamadan skor tablosuna bak →
    </RouterLink>
  </section>
</template>
