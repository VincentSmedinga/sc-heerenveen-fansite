import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'mark-row.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('mark-row.css', () => {
  it('writes a mark bold in the full colour of its tone, at 1.125rem', () => {
    expect(declarationsOf('.hf-mark-row-mark')).toMatch(/color: var\(--hf-chart-colour\)/u)
    expect(declarationsOf('.hf-mark-row-mark')).toMatch(/font-size: 1\.125rem/u)
    expect(declarationsOf('.hf-mark-row-mark')).toMatch(/font-weight: var\(--hf-figure-font-weight\)/u)
  })

  it('takes no colour from the scales', () => {
    expect(css).not.toMatch(/--hf-colour-(?:blue|red|green|grey|steel|sand)-\d/u)
  })

  it('lets the row wrap, so a narrow place does not get wider', () => {
    expect(declarationsOf('.hf-mark-row')).toMatch(/flex-wrap: wrap/u)
  })

  it('shows the marks in a system colour in forced colours', () => {
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*\.hf-mark-row-mark \{\s*color: CanvasText/u)
  })
})
