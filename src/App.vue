<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <a
    href="#main"
    class="sr-only rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
  >
    İçeriğe geç
  </a>

  <div class="mx-auto flex min-h-screen max-w-xl flex-col px-4">
    <header class="flex items-center justify-between py-5">
      <RouterLink
        :to="{ name: 'home' }"
        class="font-display text-2xl font-extrabold tracking-tight text-primary"
      >
        Rapid Quiz
      </RouterLink>
      <RouterLink
        :to="{ name: 'leaderboard' }"
        class="rounded-full px-4 py-2 text-sm font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-surface"
      >
        Skor tablosu
      </RouterLink>
    </header>

    <main id="main" class="flex-1 pb-10">
      <RouterView />
    </main>
  </div>
</template>
