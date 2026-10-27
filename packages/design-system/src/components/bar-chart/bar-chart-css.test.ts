import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'bar-chart.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('bar-chart.css', () => {
  it('colours the bars with a part of the colour of their tone, from the tokens and not the scales', () => {
    expect(declarationsOf('.hf-bar-chart-bar')).toMatch(
      /background-color: color-mix\(in srgb, var\(--hf-chart-colour\) var\(--hf-chart-strength\), transparent\)/u,
    )
    expect(css).not.toMatch(/--hf-colour-(?:blue|red|green|grey|steel|sand)-\d/u)
    expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgb\(|hsl\(/iu)
  })

  it('makes a bar as high as its share, a stub of 0.25rem, and rounds only the end', () => {
    expect(declarationsOf('.hf-bar-chart-bar')).toMatch(/block-size: calc\(var\(--hf-bar-chart-share\) \* 1%\)/u)
    expect(declarationsOf('.hf-bar-chart-bar')).toMatch(/border-start-end-radius: 0\.125rem/u)
    expect(declarationsOf('.hf-bar-chart-bar')).toMatch(/border-start-start-radius: 0\.125rem/u)
    expect(declarationsOf('.hf-bar-chart-bar')).not.toMatch(/border-end-/u)
    expect(declarationsOf('.hf-bar-chart-stub')).toMatch(/block-size: 0\.25rem/u)
  })

  it('gives every place its room as padding and not as a gap, so the middle of place i is (i + 0.5) / places', () => {
    expect(declarationsOf('.hf-bar-chart-bars')).toMatch(
      /grid-template-columns: repeat\(var\(--hf-bar-chart-slots\), minmax\(0, 1fr\)\)/u,
    )
    expect(declarationsOf('.hf-bar-chart-bars')).not.toMatch(/\bgap\b/u)
    expect(declarationsOf('.hf-bar-chart-slot')).toMatch(/padding-inline: 1px/u)
  })

  it('draws the ground in the marker colour and the guides in the colour of the lines between rows', () => {
    expect(declarationsOf('.hf-bar-chart-plot')).toMatch(
      /border-block-end: [\d.]+rem solid var\(--hf-colour-marker-graphic\)/u,
    )
    expect(declarationsOf('.hf-bar-chart-guide')).toMatch(/var\(--hf-colour-border-default\)/u)
  })

  it('keeps the stroke of the line at 2 pixels and its edge at 5, whatever the stretch of the drawing', () => {
    expect(declarationsOf('.hf-bar-chart')).toMatch(/--hf-bar-chart-line: 2px/u)
    expect(declarationsOf('.hf-bar-chart')).toMatch(/--hf-bar-chart-edge: 5px/u)
    expect(declarationsOf('.hf-bar-chart-trend-line,\n  .hf-bar-chart-trend-edge')).toMatch(
      /vector-effect: non-scaling-stroke/u,
    )
    expect(declarationsOf('.hf-bar-chart-trend-line')).toMatch(/stroke: var\(--hf-colour-chart-line\)/u)
    expect(css).toMatch(/\.hf-bar-chart-trend-edge \{\s*stroke: var\(--hf-colour-chart-line-edge\)/u)
  })

  it('puts a dot of 10 pixels with a ring of 2 on the end of the line, in the colours of the line and the edge', () => {
    expect(declarationsOf('.hf-bar-chart-trend-dot')).toMatch(/background-color: var\(--hf-colour-chart-line\)/u)
    expect(declarationsOf('.hf-bar-chart-trend-dot')).toMatch(/border: 2px solid var\(--hf-colour-chart-line-edge\)/u)
    expect(declarationsOf('.hf-bar-chart-trend-dot')).toMatch(/inline-size: 0\.625rem/u)
  })

  it('follows the width of the place it sits in, with a container query and not the width of the screen', () => {
    expect(declarationsOf('.hf-bar-chart')).toMatch(/container-type: inline-size/u)
    expect(css).toMatch(/@container hf-bar-chart \(inline-size >= [\d.]+rem\)/u)
    expect(css).not.toMatch(/@media \((?:min|max)-width/u)
  })

  it('is 4.5rem high, and 6rem with room, with the numbers at the side only then', () => {
    expect(declarationsOf('.hf-bar-chart')).toMatch(/--hf-bar-chart-height: 4\.5rem/u)
    expect(declarationsOf('.hf-bar-chart-scale')).toMatch(/display: none/u)
    expect(css).toMatch(/@container[^{]*\{[\s\S]*--hf-bar-chart-height: 6rem/u)
    expect(css).toMatch(/@container[^{]*\{[\s\S]*\.hf-bar-chart-scale \{[^}]*display: block/u)
    expect(css).toMatch(/@container[^{]*\{[\s\S]*\.hf-bar-chart-number-wide \{[^}]*display: block/u)
  })

  it('shows the bars and the line in a system colour in forced colours, and the edge in the colour of the page', () => {
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*\.hf-bar-chart-bar \{\s*background-color: CanvasText/u)
    expect(css).toMatch(/\.hf-bar-chart-trend-line \{\s*stroke: CanvasText/u)
    expect(css).toMatch(/\.hf-bar-chart-trend-edge \{\s*stroke: Canvas/u)
  })

  it('has no animation, no transition and no hover or focus rule, so nothing moves and nothing is clicked', () => {
    expect(css).not.toMatch(/animation|transition|@keyframes|:hover|:focus/u)
  })
})
