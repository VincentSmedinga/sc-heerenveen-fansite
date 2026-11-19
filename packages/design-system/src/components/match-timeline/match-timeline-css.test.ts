import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'match-timeline.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('match-timeline.css', () => {
  it('writes the score of a goal bold, in tabular figures', () => {
    expect(declarationsOf('.hf-match-event-score')).toMatch(/font-variant-numeric: tabular-nums/u)
    expect(declarationsOf('.hf-match-event-score')).toMatch(/font-weight: var\(--hf-figure-font-weight\)/u)
  })

  it('gives the score the colour of the outcome for sc Heerenveen: win, draw and loss', () => {
    expect(declarationsOf('.hf-match-event-score-win')).toMatch(/color: var\(--hf-colour-outcome-win\)/u)
    expect(declarationsOf('.hf-match-event-score-draw')).toMatch(/color: var\(--hf-colour-outcome-draw\)/u)
    expect(declarationsOf('.hf-match-event-score-loss')).toMatch(/color: var\(--hf-colour-outcome-loss\)/u)
  })

  it('makes no colour of its own for the score', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/iu)
  })
})
