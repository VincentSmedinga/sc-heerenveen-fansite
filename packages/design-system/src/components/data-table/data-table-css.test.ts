import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'data-table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('data-table.css', () => {
  it('lets a long row header break anywhere, so the page does not scroll sideways', () => {
    const start = css.indexOf('.hf-data-table tbody th {')

    expect(start).not.toBe(-1)
    expect(css.slice(start, css.indexOf('}', start))).toMatch(/overflow-wrap: anywhere/u)
  })

  it('folds a column under 44rem of the table itself, and not of the window', () => {
    expect(css).toMatch(/\.hf-data-table-fold \{[^}]*container-type: inline-size;/u)

    const start = css.indexOf('@container (inline-size < 44rem)')

    expect(start).not.toBe(-1)
    expect(css.slice(start)).toMatch(/\.hf-data-table-fold-column \{\s*display: none;/u)
    expect(css.slice(start)).toMatch(/\.hf-data-table-folded \{\s*display: block;/u)
    expect(css).toMatch(/\.hf-data-table-text \.hf-data-table-folded \{\s*display: none;/u)
  })
})
