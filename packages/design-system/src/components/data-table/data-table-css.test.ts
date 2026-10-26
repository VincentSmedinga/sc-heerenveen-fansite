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
})
