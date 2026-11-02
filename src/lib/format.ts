/** Toplam süreyi okunur yazar: "58,4 sn" ya da "1 dk 12 sn". */
export function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sn`
  }
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes} dk ${rest} sn`
}

/** "2 Kas" gibi kısa tarih (skor tablosunda satırın yanında gösterilir). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(iso))
}
