import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role, scale } from '../../tokens/colourRoles'
import { Winner } from './Winner'

describe('Winner', () => {
  it('shows the label, the name and the line, in that order', () => {
    const { container } = render(
      <Winner average="7,8" label="Uitblinker vorige wedstrijd" line="Thuis tegen Testclub, 3–1" name="Testspeler A" />,
    )

    expect(container.querySelector('.hf-winner-text')?.textContent).toBe(
      'Uitblinker vorige wedstrijdTestspeler AThuis tegen Testclub, 3–1',
    )
  })

  it('has the average as text, with "gemiddeld cijfer" for a screen reader', () => {
    const { container } = render(<Winner average="7,8" label="Uitblinker" name="Testspeler A" />)
    const star = container.querySelector('.hf-winner-star')

    expect(star?.textContent).toBe('Gemiddeld cijfer 7,8')
    expect(star?.querySelector('.hf-visually-hidden')?.textContent).toBe('Gemiddeld cijfer ')
  })

  it('draws the star with CSS, so it holds no image and nothing that a screen reader would skip', () => {
    const { container } = render(<Winner average="7,8" label="Uitblinker" name="Testspeler A" />)

    expect(container.querySelector('img, svg')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('leaves the line out when there is none or it is empty', () => {
    const { container, rerender } = render(<Winner average="7,8" label="Uitblinker" name="Testspeler A" />)

    expect(container.querySelector('.hf-winner-line')).toBeNull()
    rerender(<Winner average="7,8" label="Uitblinker" line="" name="Testspeler A" />)
    expect(container.querySelector('.hf-winner-line')).toBeNull()
  })

  it('passes other props to the outer element', () => {
    const { container } = render(
      <Winner average="7,8" className="extra" data-extra="1" label="Uitblinker" name="Testspeler A" />,
    )
    const outer = container.firstElementChild as HTMLElement

    expect(outer.className).toContain('hf-winner')
    expect(outer.className).toContain('extra')
    expect(outer.getAttribute('data-extra')).toBe('1')
  })
})

const css = readFileSync(join(import.meta.dirname, 'winner.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

const tokens = readFileSync(join(import.meta.dirname, '../../tokens/colour.css'), 'utf8')

describe('the look of a Winner', () => {
  it('takes its colours from colour roles, never from a scale', () => {
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|steel|sand)-/)
  })

  it('puts the text under the star where the box is narrow, by the width of the box', () => {
    expect(css).toContain('container-type: inline-size;')
    expect(css).toMatch(/@container hf-winner \(inline-size < /)
  })

  it('draws a faceted star in two blues, a step apart, with a white number', () => {
    expect(css).toContain('color: var(--hf-colour-text-on-star);')
    expect(css).toMatch(/&::before \{\s*background-color: var\(--hf-colour-background-star\);/)
    expect(css).toMatch(/&::after \{\s*background-color: var\(--hf-colour-background-star-facet\);/)
    expect(tokens).toContain('--hf-colour-background-star: var(--hf-colour-blue-600);')
    expect(tokens).toContain('--hf-colour-background-star-facet: var(--hf-colour-blue-500);')
    expect(tokens).toContain('--hf-colour-text-on-star: var(--hf-colour-white);')
  })

  it('has five tips, and a facet on one side of each', () => {
    const [whole = [], facets = []] = [...css.matchAll(/clip-path: polygon\(([^)]*)\)/g)].map(([, points = '']) =>
      points.split(',').map((point) => point.trim()),
    )

    expect(whole).toHaveLength(10)
    // Each facet is the centre, a tip and the corner after it.
    expect(facets).toHaveLength(15)
    facets.forEach((point, index) => {
      if (index % 3 !== 0) expect(whole).toContain(point)
    })
  })

  it.each(['blue-500', 'blue-600'])('has an average that reaches 4.5:1 on the facets in %s', (blue) => {
    expect(contrast(scale('white'), scale(blue))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the number above the facets inside the star', () => {
    expect(css).toMatch(/\.hf-winner-star \{[^}]*isolation: isolate;/)
    expect(css).toMatch(/\.hf-winner-average \{[^}]*z-index: 1;/)
  })

  it.each(['light', 'dark'] as const)('has text that reaches 4.5:1 on the surfaces in %s', (theme) => {
    for (const surface of ['surface', 'surface-soft', 'surface-strong']) {
      for (const text of ['text-accent', 'text-heading', 'text-secondary']) {
        expect(contrast(role(text)[theme], role(`background-${surface}`)[theme])).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
