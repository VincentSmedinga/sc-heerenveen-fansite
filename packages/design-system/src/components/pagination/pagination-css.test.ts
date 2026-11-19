import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply container queries, so the test reads the file, without the comments.
const css = readFileSync(join(import.meta.dirname, 'pagination.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('pagination.css', () => {
  it('makes the nav the container of its own width, by a name', () => {
    expect(css).toMatch(/\.hf-pagination \{\s*container: hf-pagination \/ inline-size;\s*\}/u)
  })

  it('puts the text on top at 24rem of the pagination itself, and never by the width of the window', () => {
    expect(css).not.toMatch(/@media/u)
    expect(css).toMatch(
      /@container hf-pagination \(inline-size <= 24rem\) \{\s*\.hf-pagination-row \{\s*grid-template-columns: 1fr 1fr;/u,
    )
  })
})
