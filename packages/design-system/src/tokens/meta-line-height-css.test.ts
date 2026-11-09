import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// Without the comments, which mention the rules in words.
const read = (file: string) => readFileSync(join(src, file), 'utf8').replace(/\/\*.*?\*\//gs, '')

// jsdom doesn't compute a cascade layer, so the test reads the text of the files.
const declarationsOf = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`)
  expect(start, selector).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('}', start))
}

describe('the line height of meta text', () => {
  it('is 24 px at 14 px, so the lines of running meta text have room', () => {
    expect(read('tokens/typography.css')).toMatch(/--hf-meta-line-height: calc\(24 \/ 14\);/u)
  })

  it.each([
    ['components/match/match.css', '.hf-match-goals'],
    ['components/tooltip/tooltip.css', '.hf-tooltip'],
    ['components/match-penalty-series/match-penalty-series.css', '.hf-match-penalty-word'],
  ])('is used by %s %s', (file, selector) => {
    expect(declarationsOf(read(file), selector)).toMatch(/line-height: var\(--hf-meta-line-height\)/u)
  })
})
