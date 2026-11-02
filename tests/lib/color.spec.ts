import { describe, expect, it } from 'vitest'
import { categoryIcon } from '@/lib/categoryIcons'
import { FALLBACK_COLOR, safeColor, tint } from '@/lib/color'

describe('safeColor', () => {
  it('geçerli #RRGGBB değerini olduğu gibi döner', () => {
    expect(safeColor('#3B82F6')).toBe('#3B82F6')
    expect(safeColor('#ff8a3d')).toBe('#ff8a3d')
  })

  it.each(['', 'mavi', '#fff', '#12345', '#1234567', 'red; background: url(x)', 'javascript:1'])(
    'geçersiz değeri (%s) varsayılana çevirir',
    (value) => {
      expect(safeColor(value)).toBe(FALLBACK_COLOR)
    },
  )
})

describe('tint', () => {
  it('rengi beyazla karıştıran bir CSS ifadesi üretir', () => {
    expect(tint('#3b82f6')).toBe('color-mix(in srgb, #3b82f6 14%, white)')
  })

  it('geçersiz rengi ifadeye sızdırmaz', () => {
    expect(tint('red; x: y')).not.toContain('red')
  })
})

describe('categoryIcon', () => {
  it('bilinen ad için ikon döner', () => {
    expect(categoryIcon('code')).toBeDefined()
    expect(categoryIcon('code')).not.toBe(categoryIcon('brain'))
  })

  it('bilinmeyen ad için varsayılan ikona döner', () => {
    expect(categoryIcon('bilinmiyor')).toBe(categoryIcon('baska-bir-sey'))
    expect(categoryIcon('bilinmiyor')).not.toBe(categoryIcon('code'))
  })
})
