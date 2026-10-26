import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'donut-chart.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('donut-chart.css', () => {
  it('colours the slices with the outcome tokens, never the scales', () => {
    expect(css).toMatch(/--hf-donut-colour: var\(--hf-colour-outcome-win\)/u)
    expect(css).toMatch(/--hf-donut-colour: var\(--hf-colour-outcome-loss\)/u)
    expect(css).not.toMatch(/--hf-colour-(?:blue|red|green|grey|steel|sand)-\d/u)
  })

  it('makes a slice a part of the colour, with a gap in the colour of the surface round it', () => {
    expect(declarationsOf('.hf-donut-chart-slice')).toMatch(
      /fill: color-mix\(in srgb, var\(--hf-donut-colour\) var\(--hf-donut-strength\), transparent\)/u,
    )
    expect(declarationsOf('.hf-donut-chart-slice')).toMatch(/stroke: var\(--hf-colour-background-surface\)/u)
  })

  it('has no animation or transition, so nothing moves', () => {
    expect(css).not.toMatch(/animation|transition|@keyframes/u)
  })

  it('gives the slices one colour with a gap in forced colours, and keeps the track and lines visible', () => {
    expect(css).toMatch(
      /@media \(forced-colors: active\) \{\s*\.hf-donut-chart-slice \{\s*fill: CanvasText;\s*stroke: Canvas/u,
    )
  })

  it('puts the charts side by side only as far as they fit, by the width of their place and not the screen', () => {
    expect(declarationsOf('.hf-donut-chart-group')).toMatch(
      /grid-template-columns: repeat\(auto-fit, minmax\(min\(\d+rem, 100%\), 1fr\)\)/u,
    )
    expect(css).not.toMatch(/@media \((?:min|max)-width/u)
  })

  it('sizes the texts in rem, so they follow the size of the text of the page and not the size of the drawing', () => {
    expect(declarationsOf('.hf-donut-chart-total')).toMatch(/font-size: [\d.]+rem/u)
    expect(declarationsOf('.hf-donut-chart-name')).toMatch(/font-size: var\(--hf-meta-font-size\)/u)
  })
})
