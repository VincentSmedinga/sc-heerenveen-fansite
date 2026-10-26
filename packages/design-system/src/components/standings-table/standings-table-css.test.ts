import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'standings-table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('standings-table.css', () => {
  it('marks the row of our own club with a bar on the start side, which also shows in forced colours', () => {
    expect(declarationsOf('.hf-standings-table-own > :first-child')).toMatch(/border-inline-start: 0\.25rem solid/u)
  })

  it('gives the bars of our own row the whole green of a win', () => {
    expect(declarationsOf('.hf-standings-table-own .hf-bar::before')).toMatch(
      /background-color: var\(--hf-colour-outcome-win\)/u,
    )
  })

  it('leaves the look of the bar and its query to bar.css', () => {
    expect(css).not.toMatch(/@container|@media|container-type|inline-size: calc/u)
  })
})
