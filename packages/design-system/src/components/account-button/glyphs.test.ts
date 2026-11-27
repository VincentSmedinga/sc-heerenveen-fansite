import { describe, expect, it } from 'vitest'

import { glyphOf, glyphs } from './glyphs'

describe('glyphs', () => {
  it('draws every capital from A to Z', () => {
    expect(Object.keys(glyphs)).toEqual([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'])
  })

  it('stays inside the box of 4 by 5, so two letters fit in the ring', () => {
    for (const [letter, path] of Object.entries(glyphs)) {
      // The end points of each command; the radii of an arc are left out.
      const points = path
        .replace(/A[\d.]+ [\d.]+ 0 [01] [01] /g, 'L')
        .match(/-?\d*\.?\d+/g)
        ?.map(Number)

      expect(
        points?.every((value) => value >= 0 && value <= 5),
        letter,
      ).toBe(true)
    }
  })

  it('draws a letter with an accent as the letter without it, and has no drawing for another script', () => {
    expect(glyphOf('É')).toBe(glyphs['E'])
    expect(glyphOf('ö')).toBe(glyphs['O'])
    expect(glyphOf('Ж')).toBeUndefined()
  })
})
