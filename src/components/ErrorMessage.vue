<script setup lang="ts">
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    message: string
    /** Geçici hatalarda "Tekrar dene" düğmesi gösterilir. */
    retryable?: boolean
    /** Ana sayfaya dön bağlantısı. */
    homeLink?: boolean
  }>(),
  // Vue, verilmeyen boolean özelliği false yapar; bağlantı varsayılan olarak açık olmalı.
  { homeLink: true },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <div role="alert" class="rounded-2xl bg-surface p-5 ring-1 ring-accent/30">
    <p class="font-semibold text-ink">{{ message }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-3">
      <button
        v-if="retryable"
        type="button"
        class="min-h-11 rounded-xl bg-primary px-5 font-semibold text-white transition hover:opacity-90"
        @click="$emit('retry')"
      >
        Tekrar dene
      </button>
      <RouterLink
        v-if="homeLink"
        :to="{ name: 'home' }"
        class="font-semibold text-primary underline-offset-4 hover:underline"
      >
        Ana sayfaya dön
      </RouterLink>
    </div>
  </div>
</template>
