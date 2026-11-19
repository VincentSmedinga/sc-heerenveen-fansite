import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role } from '../../tokens/colourRoles'

const css = readFileSync(join(import.meta.dirname, 'data-table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('data-table.css', () => {
  it('lets a long row header break anywhere, so the page does not scroll sideways, and so can the header of that column', () => {
    const start = css.indexOf('.hf-data-table tbody th,')

    expect(start).not.toBe(-1)
    expect(css.slice(start, css.indexOf('}', start))).toContain('thead th:first-child')
    expect(css.slice(start, css.indexOf('}', start))).toMatch(/overflow-wrap: anywhere/u)
  })

  it('gives the second line of a row header secondary text in both kinds of table', () => {
    expect(css).toMatch(/\.hf-data-table \.hf-data-table-secondary \{[^}]*display: block;/u)
  })

  it('fills the total row and puts a heavier line above it', () => {
    expect(css).toMatch(
      /\.hf-data-table-total :is\(th, td\) \{[^}]*background-color:[^}]*border-block-start: 2px solid/u,
    )
  })

  it('folds a column under 44rem of the table itself, and not of the window', () => {
    expect(css).toMatch(/\.hf-data-table-fold \{[^}]*container: hf-data-table-fold \/ inline-size;/u)

    const start = css.indexOf('@container hf-data-table-fold (inline-size < 44rem)')

    expect(start).not.toBe(-1)
    expect(css.slice(start)).toMatch(/\.hf-data-table-fold-column \{\s*display: none;/u)
    expect(css.slice(start)).toMatch(/\.hf-data-table-folded \{\s*display: block;/u)
    expect(css).toMatch(/\.hf-data-table-text \.hf-data-table-folded \{\s*display: none;/u)
  })

  it('hides the more columns only in a block under 24rem of its own, and only after the script has run', () => {
    expect(css).toMatch(/\.hf-data-table-more \{[^}]*container: hf-data-table-more \/ inline-size;/u)
    expect(css).toMatch(/\.hf-data-table-more \.hf-data-table-more-button \{\s*display: none;/u)
    expect(css).toMatch(/\.hf-data-table-more-button \{[^}]*font-size: var\(--hf-body-font-size\);/u)

    const start = css.indexOf('@container hf-data-table-more (inline-size < 24rem)')

    expect(start).not.toBe(-1)
    expect(css.slice(start)).toMatch(
      /\.hf-data-table-more\[data-ready\] \.hf-data-table-more-button \{\s*display: inline-block;/u,
    )
    expect(css.slice(start)).toMatch(
      /\.hf-data-table-more\[data-ready\]:not\(\[data-open\]\) \.hf-more-column \{\s*display: none;/u,
    )
  })

  it('puts small tables side by side only as far as they fit, by the width of their place and not the screen', () => {
    const start = css.indexOf('.hf-data-table-group {')

    expect(start).not.toBe(-1)
    expect(css.slice(start, css.indexOf('\n  }\n', start))).toMatch(
      /grid-template-columns: repeat\(auto-fit, minmax\(min\(\d+(?:\.\d+)?rem, 100%\), 1fr\)\)/u,
    )
    expect(css).not.toMatch(/@media \((?:min|max)-width/u)
  })

  it('draws a sign in red text on a red fill', () => {
    expect(css).toMatch(
      /\.hf-data-table-mark \{[^}]*background-color: var\(--hf-colour-background-missing\);[^}]*color: var\(--hf-colour-text-missing\);/u,
    )
  })

  it.each(['light', 'dark'] as const)('has a sign whose text reaches 4.5:1 on its fill in %s', (theme) => {
    expect(contrast(role('text-missing')[theme], role('background-missing')[theme])).toBeGreaterThanOrEqual(4.5)
  })

  it('has a sign whose text reaches 4.5:1 on its fill in a browser without light-dark()', () => {
    expect(contrast(fallback('text-missing'), fallback('background-missing'))).toBeGreaterThanOrEqual(4.5)
  })
})
