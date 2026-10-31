import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// Without the comments, which mention the sizes in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')

const cssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? cssFiles(join(dir, entry.name))
      : entry.name.endsWith('.css')
        ? [relative(src, join(dir, entry.name))]
        : [],
  )

// The tokens define the steps, and the documentation is not a component.
const outside = ['fonts.css', 'tokens/space.css']
const components = cssFiles(src).filter((file) => !outside.includes(file) && !file.startsWith('docs/'))

const read = (file: string) => strip(readFileSync(join(src, file), 'utf8'))

// The files that still have a number of rem for space, which the next issues (#480 and #481)
// convert. Each of them takes its own lines off this list, one file per line, in the order of
// the alphabet. The test below fails on a file that is on the list and has no such number any
// more, so the list can only get shorter, and the last issue leaves it empty.
const notConverted = [
  'components/navigation/navigation.css',
  'components/news-item/news-item.css',
  'components/pagination/pagination.css',
  'components/pull-to-refresh/pull-to-refresh.css',
  'components/rich-text-editor/rich-text-editor.css',
  'components/season-picker/season-picker.css',
  'components/segmented-control/segmented-control.css',
  'components/select/select.css',
  'components/short-match/short-match.css',
  'components/text/text.css',
  'components/wikipedia-credit/wikipedia-credit.css',
]

// What the guard looks at: padding, margin and gap (also row-gap, column-gap and the logical
// sides), and the custom properties that carry a space under a name with one of those words in
// it, such as --hf-card-padding-block. Scroll padding and scroll margin are about where a
// scroll stops, not about space, and have no step.
const declarations = (css: string) => [
  ...[...css.matchAll(/(?<![\w-])(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)*\s*:\s*([^;{}]+)/g)].map(
    ([declaration, value]) => ({ declaration: declaration.trim(), value: value ?? '' }),
  ),
  ...[...css.matchAll(/(--hf-[a-z0-9-]*(?:gap|padding|margin|space|gutter)[a-z0-9-]*)\s*:\s*([^;{}]+)/g)].map(
    ([declaration, , value]) => ({ declaration: declaration.trim(), value: value ?? '' }),
  ),
]

// A number of rem that is not a step: what is left of the value without the tokens, apart from
// 0.125rem, the optical correction between two small controls, which is no space.
const loose = (value: string) =>
  [...value.replace(/var\(--hf-space-(?:xs|s|m|l|xl)\)/g, '').matchAll(/(?<![\w.])(\d*\.?\d+)rem/g)]
    .map(([, number]) => number ?? '')
    .filter((number) => Number(number) !== 0.125)

const violations = (file: string) =>
  declarations(read(file))
    .filter(({ value }) => loose(value).length > 0)
    .map(({ declaration }) => declaration)

describe('the space tokens in tokens/space.css', () => {
  const tokens = read('tokens/space.css')
  const steps = ['xs', 's', 'm', 'l', 'xl']
  const value = (step: string) => Number(tokens.match(new RegExp(`--hf-space-${step}: (\\d*\\.?\\d+)rem;`))?.[1])

  it('has five steps, from extra small to extra large, in the layer hf.tokens', () => {
    expect([...tokens.matchAll(/(--hf-space-[a-z]+):/g)].map(([, name]) => name)).toEqual(
      steps.map((step) => `--hf-space-${step}`),
    )
    expect(tokens).toMatch(/@layer hf\.tokens \{\s*:root \{/)
  })

  it('makes every step larger than the one before, with extra large as the space in the grid of the page', () => {
    const values = steps.map(value)

    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(new Set(values).size).toBe(5)
    expect(value('m')).toBe(1)
    expect(value('xl')).toBe(2)
  })

  it('is loaded with the other tokens', () => {
    expect(read('index.css')).toContain("@import url('./tokens/space.css');")
  })
})

describe('the space in the CSS of the components', () => {
  it('finds the CSS files to check', () => {
    expect(components).toContain('components/page/page.css')
    expect(components).toContain('components/card/card.css')
    expect(components).toContain('tokens/layout.css')
    expect(components).not.toContain('tokens/space.css')
    expect(components).not.toContain('docs/docs.css')
    expect(components.length).toBeGreaterThan(40)
  })

  it('finds a number of rem for space, and none in a step, in 0.125rem or in a custom property of a step', () => {
    expect(violations('tokens/layout.css')).toEqual([])
    expect(loose('0 var(--hf-space-s)')).toEqual([])
    expect(loose('calc(-1 * var(--hf-space-l))')).toEqual([])
    expect(loose('0.125rem')).toEqual([])
    expect(loose('0.5rem')).toEqual(['0.5'])
    expect(loose('max(0.75rem, env(safe-area-inset-top, 0px)) var(--hf-space-xs)')).toEqual(['0.75'])
    expect(loose('calc(1.5rem + 5px)')).toEqual(['1.5'])
  })

  it('writes no number of rem for padding, margin or gap in a file that is not on the list', () => {
    for (const file of components.filter((file) => !notConverted.includes(file))) {
      expect(violations(file), file).toEqual([])
    }
  })

  it('lists only files that exist, once, in the order of the alphabet', () => {
    expect(notConverted.filter((file) => !components.includes(file))).toEqual([])
    expect(new Set(notConverted).size).toBe(notConverted.length)
    expect(notConverted).toEqual([...notConverted].sort())
  })

  it('lists only files that still have a number of rem for space, so a converted file comes off the list', () => {
    for (const file of notConverted) {
      expect(violations(file).length, `${file} is converted: take it off the list`).toBeGreaterThan(0)
    }
  })

  it('has converted the page and the card', () => {
    for (const file of [
      'tokens/layout.css',
      'components/page/page.css',
      'components/page/shortcuts.css',
      'components/page/top-link.css',
      'components/card/card.css',
    ]) {
      expect(notConverted, file).not.toContain(file)
    }
  })
})
