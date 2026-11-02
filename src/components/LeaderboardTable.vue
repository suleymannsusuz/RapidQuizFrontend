<script setup lang="ts">
import type { ScoreRow } from '@/api/types'
import { formatDate } from '@/lib/format'

export interface Highlight {
  rank: number
  score: number
  name: string
}

const props = defineProps<{
  rows: ScoreRow[]
  /** Oyuncunun kendi satırı (vurgulanır). */
  highlight?: Highlight | null
  totalQuestions?: number
}>()

const MEDALS: Record<number, { label: string; classes: string }> = {
  1: { label: 'Altın madalya', classes: 'bg-warning text-ink' },
  2: { label: 'Gümüş madalya', classes: 'bg-medal-silver text-ink' },
  3: { label: 'Bronz madalya', classes: 'bg-medal-bronze text-ink' },
}

function isMine(row: ScoreRow) {
  const mine = props.highlight
  return (
    !!mine && row.rank === mine.rank && row.score === mine.score && row.player_name === mine.name
  )
}
</script>

<template>
  <div class="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-ink/5">
    <table class="w-full text-left">
      <caption class="sr-only">
        Skor tablosu, ilk 10
      </caption>
      <thead class="bg-canvas text-xs font-semibold uppercase tracking-wide text-muted">
        <tr>
          <th scope="col" class="w-14 py-3 pl-4">Sıra</th>
          <th scope="col" class="py-3">Oyuncu</th>
          <th scope="col" class="py-3 text-right">Doğru</th>
          <th scope="col" class="py-3 pr-4 text-right">Puan</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="`${row.rank}-${row.player_name}-${row.created_at}`"
          class="border-t border-ink/5"
          :class="isMine(row) ? 'bg-primary/10 font-bold' : ''"
          :aria-current="isMine(row) ? 'true' : undefined"
          data-testid="score-row"
        >
          <td class="py-3 pl-4">
            <span
              v-if="MEDALS[row.rank]"
              class="grid size-8 place-items-center rounded-full font-display font-extrabold"
              :class="MEDALS[row.rank]?.classes"
            >
              {{ row.rank }}
              <span class="sr-only">{{ MEDALS[row.rank]?.label }}</span>
            </span>
            <span v-else class="grid size-8 place-items-center font-display font-bold text-muted">
              {{ row.rank }}
            </span>
          </td>
          <td class="min-w-0 py-3">
            <!-- Oyuncu adı her zaman düz metin olarak basılır -->
            <span class="block truncate font-semibold">{{ row.player_name }}</span>
            <span class="block text-xs font-normal text-muted">
              {{ formatDate(row.created_at) }}<template v-if="isMine(row)"> · sen</template>
            </span>
          </td>
          <td class="py-3 text-right tabular-nums text-muted">
            {{ row.correct_count }}<template v-if="totalQuestions">/{{ totalQuestions }}</template>
          </td>
          <td class="py-3 pr-4 text-right font-display text-lg font-bold tabular-nums">
            {{ row.score }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
