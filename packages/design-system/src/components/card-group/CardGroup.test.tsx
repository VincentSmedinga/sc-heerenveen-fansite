import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { CardGroup } from './CardGroup'

describe('CardGroup', () => {
  it('is a region named by its heading of level 2, which is the anchor', () => {
    render(
      <CardGroup id="uitslagen" title="Uitslagen">
        <Card>
          <Heading level={3}>Reeksen</Heading>
        </Card>
      </CardGroup>,
    )

    const region = screen.getByRole('region', { name: 'Uitslagen' })

    expect(within(region).getByRole('heading', { level: 2, name: 'Uitslagen' }).id).toBe('uitslagen')
    expect(within(region).getByRole('heading', { level: 3, name: 'Reeksen' })).toBeTruthy()
  })

  it('keeps the cards in the order they are given, in the columns of CardColumns', () => {
    const { container } = render(
      <CardGroup id="groep" title="Groep">
        <p>A</p>
        <p>B</p>
      </CardGroup>,
    )

    expect(container.querySelector('.hf-card-columns-grid')?.textContent).toBe('AB')
  })

  it('passes a class and attributes on', () => {
    const { container } = render(<CardGroup className="extra" data-x="1" id="groep" title="Groep" />)

    expect(container.querySelector('section.hf-card-group.extra[data-x="1"]')).not.toBeNull()
  })
})

// jsdom applies no rules in a cascade layer, so the test reads the text.
describe('card-group.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'card-group.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('draws the line above the heading in the colour of the groups', () => {
    expect(css).toContain('border-block-start: 2px solid var(--hf-colour-border-group);')
  })
})
