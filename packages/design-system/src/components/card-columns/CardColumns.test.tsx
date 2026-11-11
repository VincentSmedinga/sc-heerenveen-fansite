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
})
