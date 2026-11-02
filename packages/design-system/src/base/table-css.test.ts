import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('table.css', () => {
  it('makes a short number column 2ch wide at least, so a number of three digits widens it', () => {
    expect(declarationsOf('.hf-numeric-short')).toMatch(/min-inline-size: 2ch;/u)
    expect(declarationsOf('.hf-numeric-short')).not.toMatch(/(?:max-|^|\s)inline-size: (?!2ch)/u)
  })

  it('gives a short number column the padding of the token xs on both sides', () => {
    expect(declarationsOf('.hf-numeric-short')).toMatch(/padding-inline: var\(--hf-space-xs\);/u)
  })

  it('takes no pixels or rem for the short column: the room comes from ch and a token', () => {
    expect(declarationsOf('.hf-numeric-short')).not.toMatch(/\d(?:px|rem)\b/u)
  })

  it('leaves the numbers aligned to the end', () => {
    expect(declarationsOf('.hf-numeric')).toMatch(/text-align: end/u)
    expect(declarationsOf('.hf-numeric-short')).not.toMatch(/text-align/u)
  })
})
