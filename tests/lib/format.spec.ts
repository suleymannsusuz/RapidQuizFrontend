import { describe, expect, it } from 'vitest'
import { formatDate, formatDuration } from '@/lib/format'

describe('formatDuration', () => {
  it.each([
    [0, '0 sn'],
    [58_400, '58,4 sn'],
    [59_900, '59,9 sn'],
    [60_000, '1 dk 0 sn'],
    [63_400, '1 dk 3 sn'],
    [125_000, '2 dk 5 sn'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })
})

describe('formatDate', () => {
  it('kısa Türkçe tarih üretir', () => {
    expect(formatDate('2026-11-02T12:00:00Z')).toMatch(/^2 Kas/)
    expect(formatDate('2026-01-15T12:00:00Z')).toMatch(/^15 Oca/)
  })
})
