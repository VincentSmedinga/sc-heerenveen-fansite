import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { countryName, countryNames, flagAddress, flagDrawings } from './flags'

const codes = Object.keys(flagDrawings)

describe('the flags', () => {
  it('has a Dutch name for each flag, and a flag for each name', () => {
    expect(Object.keys(countryNames).sort()).toEqual([...codes].sort())

    for (const [code, name] of Object.entries(countryNames)) {
      expect(code, name).toMatch(/^[A-Z]{2}$/u)
      expect(name.length, code).toBeGreaterThan(2)
    }
  })

  it('names the countries in Dutch', () => {
    expect(countryName('NL')).toBe('Nederland')
    expect(countryName('nl')).toBe('Nederland')
    expect(countryName('DE')).toBe('Duitsland')
    expect(countryName('BE')).toBe('België')
    expect(countryName('JP')).toBe('Japan')
    expect(countryName('FI')).toBe('Finland')
    expect(countryName('US')).toBe('Verenigde Staten')
    expect(countryName('ZZ')).toBeUndefined()
    expect(countryName('')).toBeUndefined()
    expect(countryName('constructor')).toBeUndefined()
  })

  it('has the flags with a lot of white, so the line round a flag is tested on them', () => {
    expect(codes).toEqual(expect.arrayContaining(['NL', 'FI', 'JP']))
  })

  it('keeps each flag small, and the whole set too', () => {
    for (const [code, drawing] of Object.entries(flagDrawings)) {
      expect(drawing.length, code).toBeLessThanOrEqual(900)
    }

    expect(Object.values(flagDrawings).join('').length).toBeLessThan(21_000)
  })

  it('is a plain drawing: an svg with the shapes and nothing that asks for something or runs', () => {
    for (const [code, drawing] of Object.entries(flagDrawings)) {
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

  it('gives no address for a country without a flag here, never a broken one', () => {
    expect(flagAddress('BR')).toBeUndefined()
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
