import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(join(import.meta.dirname, '..', file), 'utf8')
const fonts = read('fonts.css')
const tokens = read('tokens/typography.css')

/** The styles that use Truculenta: the headings, the label and the wordmark. */
const displayStyles = ['wordmark', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'label']

/** The range a Truculenta `@font-face` declares for a descriptor: `font-stretch: 115% 125%`. */
const range = (descriptor: string): [number, number] => {
  const faces = fonts.match(/@font-face \{[^}]*font-family: Truculenta;[^}]*\}/g) ?? []

  expect(faces).toHaveLength(2)

  const ranges = faces.map((face) => new RegExp(`${descriptor}: (\\d+)%? (\\d+)%?;`).exec(face)?.slice(1).map(Number))

  expect(ranges[0]).toEqual(ranges[1])

  return ranges[0] as [number, number]
}

describe('the axes of our own Truculenta (see "De lettertypes zijn kleiner gemaakt" in docs/beslissingen/designsysteem.md)', () => {
  it('has a range of weights and widths that holds every weight and width a type style sets', () => {
    const [weightFrom, weightTo] = range('font-weight')
    const [widthFrom, widthTo] = range('font-stretch')

    for (const style of displayStyles) {
      const weight = Number(new RegExp(`--hf-${style}-font-weight: (\\d+);`).exec(tokens)?.[1])
      const width = Number(new RegExp(`--hf-${style}-font-stretch: (\\d+)%;`).exec(tokens)?.[1])

      expect(weight, style).toBeGreaterThanOrEqual(weightFrom)
      expect(weight, style).toBeLessThanOrEqual(weightTo)
      expect(width, style).toBeGreaterThanOrEqual(widthFrom)
      expect(width, style).toBeLessThanOrEqual(widthTo)
    }
  })

  it('has a fallback font for each width the styles use, with the width of the real font', () => {
    const widths = new Set(
      displayStyles.map((style) => Number(new RegExp(`--hf-${style}-font-stretch: (\\d+)%;`).exec(tokens)?.[1])),
    )
    const fallbacks = (fonts.match(/@font-face \{[^}]*font-family: 'Truculenta Fallback';[^}]*\}/g) ?? []).map((face) =>
      Number(/font-stretch: (\d+)%;/.exec(face)?.[1]),
    )

    expect(new Set(fallbacks)).toEqual(widths)
    expect(fonts.match(/size-adjust:/g)).toHaveLength(4)
    expect(tokens).toContain("truculenta, 'Truculenta Fallback'")
    expect(tokens).toContain("'Atkinson Hyperlegible Next', 'Atkinson Fallback'")
  })
})
