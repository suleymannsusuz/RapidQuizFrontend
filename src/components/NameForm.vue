<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  submitting: boolean
  /** Sunucudan gelen hata (ör. uygunsuz isim). */
  error?: string
}>()

const emit = defineEmits<{ submit: [name: string] }>()

// Sunucu kurallarının aynısı (2–20 karakter; harf, rakam, boşluk, _). Asıl doğrulama sunucudadır.
const NAME_MIN = 2
const NAME_MAX = 20
const NAME_PATTERN = /^[\p{L}\p{N}_ ]+$/u

const name = ref('')
const localError = ref('')

const shownError = computed(() => localError.value || props.error || '')

function onSubmit() {
  if (props.submitting) return // kayıt sürerken ikinci gönderim (Enter, çift tıklama) yok sayılır
  const value = name.value.trim().replace(/ {2,}/g, ' ')
  if (value.length < NAME_MIN || value.length > NAME_MAX) {
    localError.value = `İsim ${NAME_MIN}–${NAME_MAX} karakter olmalı.`
    return
  }
  if (!NAME_PATTERN.test(value)) {
    localError.value = 'İsimde yalnızca harf, rakam, boşluk ve _ kullanılabilir.'
    return
  }
  localError.value = ''
  emit('submit', value)
}
</script>

<template>
  <form
    class="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-ink/5"
    novalidate
    @submit.prevent="onSubmit"
  >
    <label for="player-name" class="block font-display text-lg font-bold">Adını yaz</label>
    <p class="mt-1 text-sm text-muted">Skor tablosunda bu isimle görünürsün.</p>

    <input
      id="player-name"
      v-model="name"
      type="text"
      autocomplete="off"
      maxlength="40"
      :aria-invalid="shownError ? 'true' : 'false'"
      aria-describedby="player-name-error"
      class="mt-3 min-h-12 w-full rounded-xl border-2 border-transparent bg-canvas px-4 text-lg font-semibold outline-none ring-1 ring-ink/10 focus:border-primary"
      placeholder="Örn. Ayşe"
      @input="localError = ''"
    />
    <p id="player-name-error" class="mt-2 min-h-5 text-sm font-semibold text-accent" role="alert">
      {{ shownError }}
    </p>

    <button
      type="submit"
      :disabled="submitting"
      class="mt-2 min-h-12 w-full rounded-xl bg-primary px-5 text-lg font-bold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {{ submitting ? 'Kaydediliyor…' : 'Skoru kaydet' }}
    </button>
  </form>
</template>
