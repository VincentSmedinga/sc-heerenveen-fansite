import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'donut-chart.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')
const typography = readFileSync(join(import.meta.dirname, '../../tokens/typography.css'), 'utf8').replaceAll(
  /\/\*.*?\*\//gsu,
  '',
)

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('donut-chart.css', () => {
  it('colours the slices with the outcome tokens, never the scales', () => {
    expect(css).toMatch(/--hf-donut-colour: var\(--hf-colour-outcome-win\)/u)
    expect(css).toMatch(/--hf-donut-colour: var\(--hf-colour-outcome-loss\)/u)
    expect(css).toMatch(/--hf-donut-colour: var\(--hf-colour-outcome-draw\)/u)
    expect(css).not.toMatch(/--hf-colour-(?:blue|red|green|grey|steel|sand)-\d/u)
  })

  it('makes a slice a part of the colour, with a light outline round it and not the colour of the surface', () => {
    expect(declarationsOf('.hf-donut-chart-slice')).toMatch(
      /fill: color-mix\(\s*in srgb,\s*var\(--hf-colour-text-default\) var\(--hf-donut-deepen, 0%\),\s*color-mix\(in srgb, var\(--hf-donut-colour\) var\(--hf-donut-strength\), transparent\)\s*\)/u,
    )
    expect(declarationsOf('.hf-donut-chart-slice')).toMatch(/stroke: var\(--hf-colour-border-chart-slice\)/u)
    expect(declarationsOf('.hf-donut-chart-slice')).not.toMatch(/--hf-colour-background-/u)
  })

  it('gives each tone of a slice its colour, and the swatch of a table the colour of the slice', () => {
    expect(declarationsOf('.hf-donut-chart-slice-positive')).toMatch(/--hf-colour-outcome-win/u)
    expect(declarationsOf('.hf-donut-chart-slice-neutral')).toMatch(/--hf-colour-outcome-draw/u)
    expect(declarationsOf('.hf-donut-chart-slice-negative')).toMatch(/--hf-colour-outcome-loss/u)
    expect(declarationsOf('.hf-donut-chart-swatch')).toMatch(
      /background-color: color-mix\(\s*in srgb,\s*var\(--hf-colour-text-default\) var\(--hf-donut-deepen, 0%\),\s*color-mix\(in srgb, var\(--hf-donut-colour\) var\(--hf-donut-strength\), transparent\)\s*\)/u,
    )
  })

  it('makes a small chart narrower than the other, with a smaller text in the hole', () => {
    expect(declarationsOf('.hf-donut-chart-small')).toMatch(
      /max-inline-size: calc\(var\(--hf-donut-small-size, 7\) \* 1rem\)/u,
    )
    expect(declarationsOf('.hf-donut-chart-small .hf-donut-chart-title')).toMatch(
      /color: var\(--hf-colour-text-secondary\);\s*font-size: var\(--hf-meta-font-size\);\s*font-weight: var\(--hf-meta-font-weight\)/u,
    )
    expect(declarationsOf('.hf-donut-chart-small .hf-donut-chart-total')).toMatch(
      /font-size: var\(--hf-body-font-size\);\s*font-weight: var\(--hf-name-font-weight\)/u,
    )
  })

  it('puts each chart of a pair in the middle of a column as wide as the chart, so the columns relate as the charts', () => {
    // The widths are written once, as properties of the group, for the rings and the columns.
    const group = declarationsOf('.hf-donut-chart-group')
    const widths = {
      bare: /--hf-donut-bare-size: (\d+);/u.exec(group)?.[1],
      small: /--hf-donut-small-size: (\d+);/u.exec(group)?.[1],
    }

    expect(widths).toEqual({ bare: '12', small: '7' })
    expect(declarationsOf('.hf-donut-chart-bare')).toMatch(
      /max-inline-size: calc\(var\(--hf-donut-bare-size, 12\) \* 1rem\)/u,
    )

    // A small chart is also bare, so its width has to come later in the file to win.
    expect(css.indexOf('.hf-donut-chart-small {')).toBeGreaterThan(css.indexOf('.hf-donut-chart-bare {'))

    const pair = declarationsOf('.hf-donut-chart-group:has(.hf-donut-chart-small)')

    // The first column is its share of the width without the gap, the second takes the rest.
    expect(pair).toMatch(
      /grid-template-columns:\s*minmax\(\s*0,\s*calc\(\s*\(100% - var\(--hf-space-m\)\) \* var\(--hf-donut-bare-size\) \/\s*\(var\(--hf-donut-bare-size\) \+ var\(--hf-donut-small-size\)\)\s*\)\s*\)\s*minmax\(0, 1fr\)/u,
    )
    // Not a fixed size for one column: that leaves the small chart no room beside it.
    expect(pair).not.toMatch(/\d+rem/u)
    // Each chart takes the margins on both sides, so it is in the middle of its column.
    expect(declarationsOf('.hf-donut-chart')).toMatch(/margin-inline: auto/u)
  })

  it('has no animation or transition, so nothing moves', () => {
    expect(css).not.toMatch(/animation|transition|@keyframes/u)
  })

  it('gives the slices one colour with an outline in forced colours, and keeps the track and lines visible', () => {
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
    expect(declarationsOf('.hf-donut-chart-total')).toMatch(/font-size: var\(--hf-figure-large-font-size\)/u)
    expect(typography).toMatch(/--hf-figure-large-font-size: [\d.]+rem;/u)
    expect(declarationsOf('.hf-donut-chart-name')).toMatch(/font-size: var\(--hf-meta-font-size\)/u)
  })
})
