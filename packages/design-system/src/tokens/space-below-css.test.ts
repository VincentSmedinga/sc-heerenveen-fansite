import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// jsdom doesn't apply rules in a cascade layer, so the tests read the text of the files,
// without the comments, which mention the rules in words.
const read = (file: string) => readFileSync(join(src, file), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

const cssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? cssFiles(join(dir, entry.name))
      : entry.name.endsWith('.css')
        ? [relative(src, join(dir, entry.name))]
        : [],
  )

/** The text between the braces of the first block with this selector, nested blocks too. */
const block = (file: string, selector: string) => {
  const css = read(file)
  const open = css.indexOf(`${selector} {`)

  if (open === -1) {
    return ''
  }

  let depth = 0

  for (let index = css.indexOf('{', open); index < css.length; index += 1) {
    depth += css[index] === '{' ? 1 : css[index] === '}' ? -1 : 0

    if (depth === 0) {
      return css.slice(css.indexOf('{', open) + 1, index)
    }
  }

  return ''
}

/** The own declarations of a block: what is left when its nested blocks are taken out. */
const own = (text: string) => text.replaceAll(/[^{};]*\{[^{}]*\}/gu, '')

const large = /margin-block: [^;]*var\(--hf-space-l\);/u

describe('the large space below a heading', () => {
  it('is one rule in heading.css, for h1 to h6, with the large step below and the grid step above', () => {
    expect(own(block('components/heading/heading.css', ':is(h1, h2, h3, h4, h5, h6)'))).toContain(
      'margin-block: var(--hf-space-xl) var(--hf-space-l);',
    )
  })

  it('is set nowhere else: no other rule for a heading or a heading style has a margin', () => {
    const others = cssFiles(src)
      .filter((file) => !['components/heading/heading.css', 'docs/docs.css'].includes(file))
      .flatMap((file) =>
        [...read(file).matchAll(/([^{};]+)\{([^{}]*)\}/gu)]
          .filter(
            ([, selector, body]) =>
              /(?<![\w-])h[1-6](?![\w-])|hf-heading-\d/u.test(selector ?? '') && /margin/u.test(body ?? ''),
          )
          .map(([, selector]) => `${file}: ${selector?.trim()}`),
      )

    expect(others).toEqual([])
  })

  it('has no space below it when it is the last in a card or a cell, so the gap between cells does not double', () => {
    expect(own(block('components/card/card.css', '.hf-card'))).not.toMatch(/margin-block-end: var/u)
    expect(block('components/card/card.css', '> :last-child')).toContain('margin-block-end: 0;')
    expect(block('components/page/page.css', '.hf-page-cell,\n  .hf-page-intro')).toContain('margin-block-end: 0;')
  })
})

describe('the large space below a large building block', () => {
  it('is below a table, in the rule for every table', () => {
    expect(block('base/table.css', 'table')).toMatch(large)
    expect(block('base/table.css', 'table')).toContain('margin-block: 0 var(--hf-space-l);')
  })

  it('is below the table of the standings and of the top scorers, and not when it is the last in its place', () => {
    const table = block('components/bar/bar.css', '.hf-bar-place > table')

    expect(own(table)).toContain('margin-block-end: var(--hf-space-l);')
    expect(table).toMatch(/&:last-child \{\s*margin-block-end: 0;\s*\}/u)
  })

  it('leaves the data table to the rule for every table: it sets no margin of its own', () => {
    expect(read('components/data-table/data-table.css')).not.toMatch(/margin/u)
  })

  it('is below a chart: the bar chart, the group of donut charts and the chart of the form', () => {
    expect(block('components/bar-chart/bar-chart.css', '.hf-bar-chart')).toContain(
      'margin-block: var(--hf-space-s) var(--hf-space-l);',
    )
    expect(block('components/donut-chart/donut-chart.css', '.hf-donut-chart-group')).toContain(
      'margin-block: var(--hf-space-m) var(--hf-space-l);',
    )
    expect(block('components/form-chart/form-chart.css', '.hf-form-chart')).toContain(
      'margin-block-end: var(--hf-space-l);',
    )
  })

  it('is not below the smaller building blocks: a paragraph, a list and a figure keep the medium step', () => {
    expect(block('components/text/text.css', '  p')).not.toMatch(/space-l/u)
    expect(read('components/list/list.css')).not.toMatch(/margin[^;]*space-l/u)
    expect(block('base/elements.css', 'figure')).toContain('margin-block: 0 var(--hf-space-m);')
  })
})
