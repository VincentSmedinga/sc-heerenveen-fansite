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

  it('adds no weight beyond 400 to 700, 800 for the key figures and 900 for the wordmark', () => {
    const values = [...read('tokens/typography.css').matchAll(/-font-weight: (\d{3});/g)].map(([, weight]) => weight)

    expect(new Set(values)).toEqual(new Set(['400', '500', '600', '700', '800', '900']))
  })
})

// The CSS of tables. Bold means one thing there: the key figure (`hf-key`), the row with the
// total, the caption and the legend. Headers and row headers are semibold and never heavier.
const tableFiles = [
  'base/table.css',
  'components/bar/bar.css',
  'components/data-table/data-table.css',
  'components/input-table/input-table.css',
  'components/record-table/record-table.css',
  'components/standings-table/standings-table.css',
]

type WeightRule = { selector: string; value: string }

// The declarations of font-weight with the selector they are in, nested rules joined and
// at-rules (@layer, @container) left out.
const weightRules = (css: string): WeightRule[] => {
  const rules: WeightRule[] = []
  const path: string[] = []

  for (const [, text = '', delimiter] of css.matchAll(/([^{};]*)([{};])/g)) {
    const declaration = /^font-weight\s*:\s*(.+)$/s.exec(text.trim())

    if (delimiter === '{') {
      path.push(text.trim())
    } else {
      if (declaration) {
        rules.push({
          selector: path.filter((part) => !part.startsWith('@')).join(' '),
          value: (declaration[1] ?? '').trim(),
        })
      }

      if (delimiter === '}') {
        path.pop()
      }
    }
  }

  return rules
}

const token = (name: string) => `var(--hf-${name}-font-weight)`
const header = /(^|[\s,>])th\b/
const heaviest = /hf-key|hf-data-table-total|tfoot|^caption|hf-bar-legend/

describe('the font weights in the CSS of tables', () => {
  const rules = tableFiles.flatMap((file) => weightRules(read(file)).map((rule) => ({ ...rule, file })))

  it('finds the rules to check', () => {
    expect(rules.length).toBeGreaterThan(5)
    expect(rules).toContainEqual(expect.objectContaining({ selector: '.hf-key', value: token('figure') }))
  })

  it('sets the heaviest weight only on the key figure, the total, the caption and the legend', () => {
    for (const { file, selector, value } of rules) {
      if (value === token('strong') || value === token('figure')) {
        expect(selector, `${file}: ${selector} { font-weight: ${value} }`).toMatch(heaviest)
      }
    }
  })

  it('sets the semibold weight only on headers and row headers, and nothing heavier on them', () => {
    for (const { file, selector, value } of rules) {
      if (value === token('name')) {
        expect(selector, `${file}: ${selector} { font-weight: ${value} }`).toMatch(header)
      }

      if (header.test(selector) && !heaviest.test(selector)) {
        expect(value, `${file}: ${selector}`).not.toMatch(/strong|figure/)
      }
    }
  })

  it('lets nothing else set a weight but to take the weight of the parent or the normal weight', () => {
    for (const { file, selector, value } of rules) {
      if (!header.test(selector) && !heaviest.test(selector)) {
        expect(['inherit', token('body')], `${file}: ${selector} { font-weight: ${value} }`).toContain(value)
      }
    }
  })

  it('does not mark the row of our own club or a highlighted row by weight', () => {
    expect(rules.filter(({ selector }) => /hf-highlight|hf-standings-table-own/.test(selector))).toEqual([])
  })

  it('sets the surname of a player in the weight of a row header', () => {
    const surname = weightRules(read('components/player-name/player-name.css')).find(({ selector }) =>
      selector.includes('hf-player-name-surname'),
    )

    expect(surname?.value).toBe(token('name'))
  })
})
