import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'match.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the rule that starts with this selector. */
const rule = (selector: string) => {
  const start = css.indexOf(`${selector} {`)

  expect(start).not.toBe(-1)

  return css.slice(start, css.indexOf('}', start))
}

describe('match.css', () => {
  it('makes the minute of a goal of sc Heerenveen green and bold, so colour is not the only sign', () => {
    expect(rule('.hf-match-goal-ours')).toMatch(/color: var\(--hf-colour-outcome-win\)/u)
    expect(rule('.hf-match-goal-ours')).toMatch(/font-weight: var\(--hf-figure-font-weight\)/u)
  })

  it('makes the minute of a goal of the opponent red and not bold', () => {
    expect(rule('.hf-match-goal-theirs')).toMatch(/color: var\(--hf-colour-outcome-loss\)/u)
    expect(rule('.hf-match-goal-theirs')).not.toMatch(/font-weight/u)
  })

  it('gives "Gegevens nog niet beschikbaar" the plain colour of the other small lines, not a colour that means something', () => {
    expect(css).toMatch(/\.hf-match-missing,/u)
    expect(rule('.hf-match-missing')).not.toMatch(/outcome|accent/u)
  })

  it('does not take the colour away in forced colours: the weight stays whatever the browser does', () => {
    expect(css).not.toMatch(/forced-color-adjust/u)
  })
})
