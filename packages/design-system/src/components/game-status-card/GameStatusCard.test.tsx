import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GameStatusCard } from './GameStatusCard'

const tag = { text: 'Open tot za 16.45', tone: 'open' } as const

describe('GameStatusCard', () => {
  it('is named by an h2, carries the watermark of its game and says how it stands', () => {
    render(
      <GameStatusCard
        action={{ href: '/fans/prognose', label: 'Naar de Prognose', type: 'link' }}
        game="prognose"
        heading="Prognose"
        tag={tag}
      >
        <p>48 fans voorspelden al.</p>
      </GameStatusCard>,
    )

    const card = screen.getByRole('region', { name: 'Prognose' })

    expect(card.className).toContain('hf-card-game-prognose')
    expect(screen.getByRole('heading', { level: 2, name: 'Prognose' })).toBeDefined()
    expect(screen.getByText('Open tot za 16.45').className).toContain('hf-tag-open')
    expect(screen.getByText('48 fans voorspelden al.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Naar de Prognose' }).getAttribute('href')).toBe('/fans/prognose')
  })

  it('has a button that goes to the page for what is still to be done, and then no link', () => {
    const { container } = render(
      <GameStatusCard
        action={{ href: '/fans/fjouwer', label: 'Kies je vier', type: 'button' }}
        game="fjouwer"
        heading="Fjouwer"
        tag={{ text: 'Nog te doen', tone: 'todo' }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Kies je vier' })).toBeDefined()
    expect(container.querySelector('form')?.getAttribute('action')).toBe('/fans/fjouwer')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
