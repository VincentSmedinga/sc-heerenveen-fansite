import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  codeOnlyCountries,
  countryName,
  countryNames,
  flagAddress,
  flagDrawings,
  isCodeOnly,
  simplifiedFlags,
} from './flags'

// The list of the shared package is read from its source: the design system has no dependency
// on it, and a country that is added there makes this test red until it has a name and a
// drawing or a place in the list of codes.
const countriesSource = readFileSync(join(import.meta.dirname, '../../../../shared/src/countries.ts'), 'utf8')
const countryCodes = [...(countriesSource.match(/\n {2}'[A-Z ]+',/gu) ?? []).join('').matchAll(/[A-Z]{2}/gu)].map(
  (match) => match[0],
)

const codes = Object.keys(flagDrawings)
const drawings = { ...flagDrawings, ...simplifiedFlags }

describe('the flags', () => {
  it('reads the 250 countries of countryCodes', () => {
    expect(countryCodes).toHaveLength(250)
    expect(new Set(countryCodes).size).toBe(250)
  })

  it('has a Dutch name for every country of countryCodes, and for no other', () => {
    expect(Object.keys(countryNames).sort()).toEqual([...countryCodes].sort())

    for (const [code, name] of Object.entries(countryNames)) {
      expect(code, name).toMatch(/^[A-Z]{2}$/u)
      expect(name.length, code).toBeGreaterThan(2)
    }
  })

  it('gives every country a drawing or a place in the list of codes, never both, and no other country either', () => {
    const real = new Set(Object.keys(flagDrawings))
    const simplified = new Set(Object.keys(simplifiedFlags))
    const codeOnly = new Set(codeOnlyCountries)

    for (const code of countryCodes) {
      const kinds = [real.has(code), simplified.has(code), codeOnly.has(code)].filter(Boolean)

      expect(kinds, code).toHaveLength(1)
    }

    const known = new Set(countryCodes)

    for (const code of [...real, ...simplified, ...codeOnly]) {
      expect(known.has(code), code).toBe(true)
    }

    expect(codeOnlyCountries).toHaveLength(codeOnly.size)
  })

  it('names the countries in Dutch', () => {
    expect(countryName('NL')).toBe('Nederland')
    expect(countryName('nl')).toBe('Nederland')
    expect(countryName('DE')).toBe('Duitsland')
    expect(countryName('BE')).toBe('België')
    expect(countryName('JP')).toBe('Japan')
    expect(countryName('FI')).toBe('Finland')
    expect(countryName('US')).toBe('Verenigde Staten')
    expect(countryName('BR')).toBe('Brazilië')
    expect(countryName('ZZ')).toBeUndefined()
    expect(countryName('')).toBeUndefined()
    expect(countryName('constructor')).toBeUndefined()
  })

  it('has the flags with a lot of white, so the line round a flag is tested on them', () => {
    expect(codes).toEqual(expect.arrayContaining(['NL', 'FI', 'JP']))
  })

  it('keeps each flag small, a simplified flag smaller, and the whole set too', () => {
    for (const [code, drawing] of Object.entries(flagDrawings)) {
      expect(drawing.length, code).toBeLessThanOrEqual(2048)
    }

    for (const [code, drawing] of Object.entries(simplifiedFlags)) {
      expect(drawing.length, code).toBeLessThanOrEqual(900)
    }

    expect(Object.values(drawings).join('').length).toBeLessThan(120_000)
  })

  it('has a simplified flag only for a country whose real flag is too heavy, and says so in its name', () => {
    expect(Object.keys(simplifiedFlags).sort()).toEqual(
      expect.arrayContaining(['AR', 'BR', 'ES', 'HR', 'IR', 'MX', 'PT', 'RS', 'SA', 'XK']),
    )
    expect(Object.keys(simplifiedFlags).filter((code) => code in flagDrawings)).toEqual([])
  })

  it('is a plain drawing: an svg with the shapes and nothing that asks for something or runs', () => {
    for (const [code, drawing] of Object.entries(drawings)) {
      expect(drawing, code).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" [^>]*viewBox="0 0 640 480"/u)
      expect(drawing, code).toMatch(/<\/svg>$/u)
      expect(drawing, code).not.toMatch(
        /<(?:script|image|use|a|foreignObject|style|iframe)\b|\bon\w+=|href=|url\((?!#)/iu,
      )
      expect(drawing.match(/https?:\/\/[^"']*/gu), code).toEqual(['http://www.w3.org/2000/svg'])
      expect(drawing, code).not.toContain("'")
      expect(drawing, code).not.toMatch(/\sid="flag-icons/u)
    }
  })

  it('gives an address with the drawing in it, which asks for nothing', () => {
    const address = flagAddress('NL')

    expect(address).toMatch(/^data:image\/svg\+xml,%3Csvg /u)
    expect(address).not.toMatch(/[<>"#]/u)
    expect(flagAddress('nl')).toBe(address)
    expect(decodeURIComponent((address ?? '').replace('data:image/svg+xml,', ''))).toBe(flagDrawings['NL'])
  })

  it('gives an address for a simplified flag too, and none for a country that shows its code', () => {
    expect(flagAddress('BR')).toMatch(/^data:image\/svg\+xml,/u)
    expect(flagAddress('KZ')).toBeUndefined()
    expect(isCodeOnly('kz')).toBe(true)
    expect(isCodeOnly('NL')).toBe(false)
    expect(isCodeOnly('ZZ')).toBe(false)
  })

  it('gives no address for something that is not a country, never a broken one', () => {
    expect(flagAddress('ZZ')).toBeUndefined()
    expect(flagAddress('')).toBeUndefined()
    expect(flagAddress('toString')).toBeUndefined()
  })

  it('has the licence of the drawings next to it, and says where they come from', () => {
    const licence = readFileSync(join(import.meta.dirname, 'flag-icons-licence.txt'), 'utf8')
    const source = readFileSync(join(import.meta.dirname, 'flags.ts'), 'utf8')

    expect(licence).toContain('The MIT License (MIT)')
    expect(licence).toContain('Panayiotis Lipiridis')
    expect(source).toContain('flag-icons 7.6.0')
    expect(source).toContain('flag-icons-licence.txt')
  })
})
