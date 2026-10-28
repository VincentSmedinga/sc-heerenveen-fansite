import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// Without the comments, which mention the weights in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')

const cssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? cssFiles(join(dir, entry.name))
      : entry.name.endsWith('.css')
        ? [relative(src, join(dir, entry.name))]
        : [],
  )

// The font files say which weights they carry, the tokens define them, and the documentation
// is not a component.
const outside = ['fonts.css', 'tokens/typography.css']
const components = cssFiles(src).filter((file) => !outside.includes(file) && !file.startsWith('docs/'))

const read = (file: string) => strip(readFileSync(join(src, file), 'utf8'))

// What a component may set a weight to: a token, or `inherit`, which takes it from the parent.
const weights = (css: string) =>
  [...css.matchAll(/(?<![\w-])font-weight\s*:\s*([^;}]+)/g)].map(([, value]) => (value ?? '').trim())

describe('the font weights in the CSS of the components', () => {
  it('finds the CSS files to check', () => {
    expect(components).toContain('components/navigation/navigation.css')
    expect(components).toContain('base/forms.css')
    expect(components).not.toContain('fonts.css')
    expect(components).not.toContain('docs/docs.css')
    expect(components.length).toBeGreaterThan(40)
  })

  it('writes no bare number, only a token', () => {
    let seen = 0

    for (const file of components) {
      for (const value of weights(read(file))) {
        seen += 1
        expect(
          value === 'inherit' || (value.startsWith('var(--hf-') && value.endsWith('-font-weight)')),
          `${file}: font-weight: ${value}`,
        ).toBe(true)
      }
    }

    expect(seen).toBeGreaterThan(40)
  })

  it('has a value for every token that a component uses', () => {
    const tokens = read('tokens/typography.css')

    for (const file of components) {
      for (const [, name] of read(file).matchAll(/var\((--hf-[a-z0-9-]+-font-weight)\)/g)) {
        expect(tokens, `${file}: ${name}`).toMatch(new RegExp(`${name}: \\d{3};`))
      }
    }
  })

  it('gives the tokens of the bars a current item that is 200 heavier', () => {
    const tokens = read('tokens/typography.css')
    const value = (name: string) => Number(tokens.match(new RegExp(`${name}: (\\d{3});`))?.[1])

    for (const bar of ['menu', 'submenu', 'anchor']) {
      expect(value(`--hf-${bar}-current-font-weight`) - value(`--hf-${bar}-font-weight`), bar).toBe(200)
    }
  })

  it('adds no weight that the site did not have: 400 to 900', () => {
    const values = [...read('tokens/typography.css').matchAll(/-font-weight: (\d{3});/g)].map(([, weight]) => weight)

    expect(new Set(values)).toEqual(new Set(['400', '500', '600', '700', '800', '900']))
  })
})
