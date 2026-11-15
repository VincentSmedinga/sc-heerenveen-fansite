import { describe, expect, it } from 'vitest'

import { countryCodes, isCountryCode } from './countries.ts'

describe('countryCodes', () => {
  it('holds the 249 codes of ISO 3166-1, Kosovo and the four countries of the United Kingdom, each once, in capitals and in order', () => {
    expect(countryCodes).toHaveLength(254)
    expect(new Set(countryCodes).size).toBe(254)
    expect(countryCodes.every((code) => /^[A-Z]{2}(?:-[A-Z]{3})?$/u.test(code))).toBe(true)
    expect([...countryCodes].sort()).toEqual(countryCodes)
  })

  it('knows a code in capitals only, and no country that is gone', () => {
    expect(isCountryCode('NL')).toBe(true)
    expect(isCountryCode('XK')).toBe(true)
    expect(isCountryCode('GB')).toBe(true)
    for (const code of ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']) expect(isCountryCode(code)).toBe(true)
    for (const code of ['GB-XYZ', 'gb-eng', 'ENG', 'GB-', 'GB-ENGL']) expect(isCountryCode(code)).toBe(false)
    expect(isCountryCode('nl')).toBe(false)
    expect(isCountryCode('YU')).toBe(false)
    expect(isCountryCode('')).toBe(false)
  })
})
