const HEX_COLOR = /^#[0-9a-f]{6}$/i

export const FALLBACK_COLOR = '#7c3aed'

/** API'den gelen rengi stile koymadan önce doğrular; geçersizse varsayılana döner. */
export function safeColor(value: string): string {
  return HEX_COLOR.test(value) ? value : FALLBACK_COLOR
}

/** Rengin açık tonu (ikon zemini için). */
export function tint(color: string, percent = 14): string {
  return `color-mix(in srgb, ${safeColor(color)} ${percent}%, white)`
}
