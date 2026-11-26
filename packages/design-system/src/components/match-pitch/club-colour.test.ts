import { describe, expect, it } from 'vitest'

import { checkedClubColour, figureColourOn } from './club-colour'

/** The contrast of two colours as WCAG 2.2 counts it. */
function contrast(a: string, b: string) {
  const luminance = (colour: string) => {
    const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((at) => {
      const value = parseInt(colour.slice(at, at + 2), 16) / 255

      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }
  const [low = 0, high = 0] = [luminance(a), luminance(b)].sort((x, y) => x - y)

  return (high + 0.05) / (low + 0.05)
}

describe('figureColourOn', () => {
  it.each([
    ['red', '#e30613', '#ffffff'],
    ['blue', '#005baa', '#ffffff'],
    ['yellow', '#ffd500', '#000000'],
    ['orange', '#f07d00', '#000000'],
    ['green', '#00a651', '#000000'],
  ])('writes the number on %s in the colour with the most contrast', (_name, colour, figure) => {
    expect(figureColourOn(colour)).toBe(figure)
    expect(contrast(colour, figure)).toBeGreaterThanOrEqual(4.5)
  })

  it('always reaches 4.5:1', () => {
    const steps = Array.from({ length: 18 }, (_, index) => (index * 15).toString(16).padStart(2, '0'))
    const colours = steps.flatMap((r) => steps.flatMap((g) => steps.map((b) => `#${r}${g}${b}`)))

    expect(Math.min(...colours.map((colour) => contrast(colour, figureColourOn(colour))))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('checkedClubColour', () => {
  it('lets only a colour of six hexadecimal digits through', () => {
    expect(checkedClubColour('#E30613')).toBe('#E30613')

    for (const wrong of [undefined, '', 'red', '#fff', '#e30613;color:red', 'url(x)']) {
      expect(checkedClubColour(wrong)).toBeUndefined()
    }
  })
})
