import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CardColumns } from './CardColumns'

describe('CardColumns', () => {
  it('keeps the cards in the order they are given, inside one grid', () => {
    const html = renderToStaticMarkup(
      <CardColumns>
        <p>A</p>
        <p>B</p>
        <p>C</p>
      </CardColumns>,
    )

    expect(html).toBe(
      '<div class="hf-card-columns"><div class="hf-card-columns-grid"><p>A</p><p>B</p><p>C</p></div></div>',
    )
  })

  it('has three columns only when asked, and two by default', () => {
    expect(renderToStaticMarkup(<CardColumns />)).not.toContain('hf-card-columns-three')
    expect(renderToStaticMarkup(<CardColumns columns={2} />)).not.toContain('hf-card-columns-three')
    expect(renderToStaticMarkup(<CardColumns columns={3} />)).toContain('class="hf-card-columns hf-card-columns-three"')
  })

  it('puts a lead card before the grid of the others, in the order of reading', () => {
    const html = renderToStaticMarkup(
      <CardColumns columns={3} lead={<p>A</p>}>
        <p>B</p>
        <p>C</p>
      </CardColumns>,
    )

    expect(html).toBe(
      '<div class="hf-card-columns hf-card-columns-three"><div class="hf-card-columns-split"><p>A</p><div class="hf-card-columns-grid"><p>B</p><p>C</p></div></div></div>',
    )
  })

  it('passes a class and attributes to the container', () => {
    const html = renderToStaticMarkup(<CardColumns className="extra" id="x" />)

    expect(html).toContain('class="hf-card-columns extra"')
    expect(html).toContain('id="x"')
  })
})

// jsdom applies no rules in a cascade layer or a container query, so the test reads the text.
describe('card-columns.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'card-columns.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('has a grid of two columns, and grid lanes only behind @supports', () => {
    expect(css).toContain('repeat(2, minmax(0, 1fr))')
    expect(css).toMatch(/@supports \(display: grid-lanes\) \{[^}]*display: grid-lanes;/s)
    expect(css.match(/display: grid-lanes;/g)).toHaveLength(1)
  })

  it('has three columns from 52rem, measured on the container, only for the three-column variant', () => {
    expect(css).toMatch(
      /@container hf-card-columns \(width >= 52rem\) \{\s*\.hf-card-columns-three > \.hf-card-columns-grid,\s*\.hf-card-columns-three > \.hf-card-columns-split \{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
    )
    expect(css).toContain('@container hf-card-columns (width >= 28rem)')
  })

  it('gives the cards beside a lead one column from 28rem and two from 52rem', () => {
    const [middle, wide] = css.split('@container hf-card-columns (width >= 52rem)')

    expect(middle).toMatch(
      /\.hf-card-columns-split > \.hf-card-columns-grid \{\s*grid-template-columns: minmax\(0, 1fr\);/,
    )
    expect(wide).toMatch(
      /\.hf-card-columns-three > \.hf-card-columns-split > \.hf-card-columns-grid \{\s*grid-column: span 2;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    )
  })

  it('gives a transparent card that is a part of a card no space at the sides', () => {
    expect(css).toMatch(
      /\.hf-card \.hf-card-columns-grid > \.hf-card-transparent \{\s*border-width: 0;\s*padding-inline: 0;\s*\}/,
    )
  })

  it('never makes the grid with the lead into grid lanes, so the lead keeps its column', () => {
    expect(css).toMatch(/@supports \(display: grid-lanes\) \{\s*\.hf-card-columns-grid \{\s*display: grid-lanes;/)
  })
})
