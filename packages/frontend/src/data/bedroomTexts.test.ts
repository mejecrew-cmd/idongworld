import { describe, expect, it } from 'vitest'
import { BEDROOM_TEXT_IDS, createBedroomTextResolver } from './bedroomTexts'

describe('bedroom text resolver', () => {
  it('uses fallback text when no table value exists', () => {
    const text = createBedroomTextResolver()

    expect(text(BEDROOM_TEXT_IDS.outfitJeansName)).toBe('청바지')
  })

  it('overrides fallback text with table values', () => {
    const text = createBedroomTextResolver({
      [BEDROOM_TEXT_IDS.outfitJeansName]: '데님 팬츠',
    })

    expect(text(BEDROOM_TEXT_IDS.outfitJeansName)).toBe('데님 팬츠')
  })

  it('supports future table indexes and variable replacement', () => {
    const text = createBedroomTextResolver({
      CUSTOM_ROOM_TITLE: '{{name}} 전용방',
    })

    expect(text('CUSTOM_ROOM_TITLE', { name: '황금멍' })).toBe('황금멍 전용방')
  })
})
