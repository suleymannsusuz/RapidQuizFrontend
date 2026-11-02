<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Category } from '@/api/types'
import { safeColor, tint } from '@/lib/color'
import { categoryIcon } from '@/lib/categoryIcons'

const props = defineProps<{ category: Category }>()

const color = computed(() => safeColor(props.category.color))
const icon = computed(() => categoryIcon(props.category.icon))
</script>

<template>
  <RouterLink
    :to="{ name: 'quiz', params: { category: category.slug } }"
    class="flex min-h-[76px] items-center gap-4 rounded-2xl border-l-4 bg-surface p-4 shadow-sm ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-md"
    :style="{ borderLeftColor: color }"
  >
    <span
      class="grid size-14 shrink-0 place-items-center rounded-2xl"
      :style="{ backgroundColor: tint(category.color), color }"
      aria-hidden="true"
    >
      <component :is="icon" class="size-7" />
    </span>
    <span class="min-w-0">
      <span class="block font-display text-lg font-bold leading-tight">{{ category.name }}</span>
      <span class="block text-sm text-muted">{{ category.description }}</span>
    </span>
  </RouterLink>
</template>
