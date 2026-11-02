import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer, so the test reads the files' text, without the
// comments, which mention the rules in words.
const read = (file: string) =>
  readFileSync(join(import.meta.dirname, '..', file), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The text between the braces of the first block that starts with this selector. */
const block = (css: string, selector: string) => {
  const open = css.search(
    new RegExp(`[{}]\\s*${selector.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`)} \\{`, 'mu'),
  )
  const start = css.indexOf('{', open)

  return open === -1 ? '' : css.slice(start + 1, css.indexOf('\n  }', start))
}

const elements = read('base/elements.css')
const table = read('base/table.css')
const text = read('components/text/text.css')
const heading = read('components/heading/heading.css')
const list = read('components/list/list.css')

describe('the elements and the text set no vertical space to the outside', () => {
  it.each([
    ['blockquote', elements],
    ['pre', elements],
    ['hr', elements],
    ['figure', elements],
    ['table', table],
    ['p', text],
    [':is(h1, h2, h3, h4, h5, h6)', heading],
    ['ul,\n  ol', list],
    ['dl', list],
  ])('%s has no margin to its neighbours', (selector, css) => {
    const rule = block(css, selector)

    expect(rule).not.toBe('')
    expect(rule).toMatch(/margin-block: 0;/u)
    expect(rule).not.toMatch(/margin-block-(?:start|end):/u)
  })

  it('puts the space between the parts of a quote and of a figure in a gap', () => {
    expect(block(elements, 'blockquote')).toMatch(/display: grid;\s+gap: var\(--hf-space-m\);/u)
    expect(block(elements, 'figure')).toMatch(/display: grid;\s+gap: var\(--hf-space-s\);/u)
  })

  it('puts the space between the items of a loose list in a gap', () => {
    expect(block(list, '.hf-list-loose')).toMatch(/display: grid;\s+gap: var\(--hf-space-m\);/u)
  })

  it('keeps the margin of a caption and a description, where a gap can not reach', () => {
    expect(block(table, 'caption')).toMatch(/margin-block-end: var\(--hf-space-s\);/u)
    expect(block(list, 'dd')).toMatch(/margin-block-end: var\(--hf-space-s\);/u)
    expect(block(list, 'dd')).toMatch(/&:last-child \{\s+margin-block-end: 0;/u)
  })
})
