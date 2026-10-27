import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'chart.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('chart.css', () => {
  it('takes the colours of the tones from the outcome tokens, never the scales', () => {
    expect(declarationsOf('.hf-chart-tone-positive')).toMatch(/--hf-chart-colour: var\(--hf-colour-outcome-win\)/u)
    expect(declarationsOf('.hf-chart-tone-neutral')).toMatch(/--hf-chart-colour: var\(--hf-colour-outcome-draw\)/u)
    expect(declarationsOf('.hf-chart-tone-negative')).toMatch(/--hf-chart-colour: var\(--hf-colour-outcome-loss\)/u)
    expect(css).not.toMatch(/--hf-colour-(?:blue|red|green|grey|steel|sand)-\d/u)
  })

  it('gives a win and a loss 70% of their colour and a draw 80%', () => {
    expect(declarationsOf('.hf-chart-tone-positive')).toMatch(/--hf-chart-strength: 70%/u)
    expect(declarationsOf('.hf-chart-tone-negative')).toMatch(/--hf-chart-strength: 70%/u)
    expect(declarationsOf('.hf-chart-tone-neutral')).toMatch(/--hf-chart-strength: 80%/u)
  })
})
