import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GameHeading } from './GameHeading'

describe('GameHeading', () => {
  it('is a heading of the level asked with the id for the card, and the small text next to it', () => {
    render(
      <GameHeading id="kop" level={2} meta="Van de fans">
        Prognose
      </GameHeading>,
    )

    const heading = screen.getByRole('heading', { level: 2, name: 'Prognose' })

    expect(heading.id).toBe('kop')
    expect(screen.getByText('Van de fans')).toBeTruthy()
    expect(heading.closest('.hf-game-heading')).not.toBeNull()
  })
})
