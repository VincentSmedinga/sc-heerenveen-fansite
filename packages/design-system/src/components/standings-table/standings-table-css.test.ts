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
  it('positions the area that scrolls, so the hidden words of the headers scroll with it and the page does not get wider', () => {
    expect(declarationsOf('.hf-standings-scroll')).toMatch(/overflow-x: auto/u)
    expect(declarationsOf('.hf-standings-scroll')).toMatch(/position: relative/u)
  })

  it('positions the wrapper too, for the short form, which has no area', () => {
    expect(declarationsOf('.hf-standings')).toMatch(/position: relative/u)
  })

  it('makes the points bold, like the row of our own club', () => {
    expect(declarationsOf('.hf-standings-table td.hf-standings-points')).toMatch(/font-weight: 700/u)
  })
})
