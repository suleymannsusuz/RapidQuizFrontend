<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const cancelButton = ref<HTMLButtonElement | null>(null)

// Açılınca odağı güvenli seçeneğe (devam et) ver
watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      cancelButton.value?.focus()
    }
  },
)
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 grid place-items-center bg-ink/50 p-4"
    @click.self="emit('cancel')"
    @keydown.esc="emit('cancel')"
  >
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      class="anim-pop-in w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl"
    >
      <h2 id="confirm-title" class="text-xl font-extrabold">{{ title }}</h2>
      <p id="confirm-message" class="mt-2 text-muted">{{ message }}</p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          ref="cancelButton"
          type="button"
          class="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-white transition hover:opacity-90"
          @click="emit('cancel')"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          class="min-h-12 flex-1 rounded-xl px-5 font-semibold text-ink ring-1 ring-ink/15 transition hover:bg-canvas"
          @click="emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
