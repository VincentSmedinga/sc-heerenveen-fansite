import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'
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
    const seal = container.querySelector('.hf-winner-seal')

    expect(seal?.textContent).toBe('Gemiddeld cijfer 7,8')
    expect(seal?.querySelector('.hf-visually-hidden')?.textContent).toBe('Gemiddeld cijfer ')
  })

  it('draws the seal with CSS, so it holds no image and nothing that a screen reader would skip', () => {
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

  it('marks the seal that stands out, and no other', () => {
    const { container, rerender } = render(<Winner average="7,8" label="Uitblinker" name="Testspeler A" />)

    expect(container.querySelector('.hf-winner-highlight')).toBeNull()
    rerender(<Winner average="7,8" highlight label="Uitblinker" name="Testspeler A" />)
    expect(container.querySelector('.hf-winner-highlight .hf-winner-seal')).not.toBeNull()
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

describe('the look of a Winner', () => {
  it('takes its colours from colour roles, never from a scale', () => {
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|steel|sand)-/)
  })

  it('puts the text under the seal where the box is narrow, by the width of the box', () => {
    expect(css).toContain('container-type: inline-size;')
    expect(css).toMatch(/@container hf-winner \(inline-size < /)
  })

  it('draws a seal in two colours: points and a disc in the colour of the surface', () => {
    expect(css).toContain('background-color: var(--hf-winner-seal-points);')
    expect(css).toMatch(/&::after \{[^}]*background-color: var\(--hf-colour-background-surface\);/)
    expect(css).toContain('--hf-winner-seal-points: var(--hf-colour-background-button);')
  })

  it('makes the seal of the highlight larger, with red points', () => {
    expect(css).toMatch(
      /\.hf-winner-highlight \.hf-winner-seal \{\s*--hf-winner-seal-size: 5\.25rem;\s*--hf-winner-seal-points: var\(--hf-colour-background-seal-highlight\);/,
    )
  })

  it.each(['light', 'dark'] as const)('has an average that reaches 4.5:1 on the disc in %s', (theme) => {
    expect(contrast(role('text-heading')[theme], role('background-surface')[theme])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)('has points that reach 3:1 against the disc and every card in %s', (theme) => {
    for (const points of ['background-button', 'background-seal-highlight']) {
      for (const surface of ['surface', 'surface-soft', 'surface-strong']) {
        const ratio = contrast(role(points)[theme], role(`background-${surface}`)[theme])

        expect(ratio, `${points} on ${surface}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it.each(['light', 'dark'] as const)('has text that reaches 4.5:1 on the surfaces in %s', (theme) => {
    for (const surface of ['surface', 'surface-soft', 'surface-strong']) {
      for (const text of ['text-accent', 'text-heading', 'text-secondary']) {
        expect(contrast(role(text)[theme], role(`background-${surface}`)[theme])).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
