import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ShortPlayer } from './ShortPlayer'

describe('ShortPlayer', () => {
  it('writes the shirt number and the name, in the classes of a short match', () => {
    const { container } = render(<ShortPlayer givenName="Testspeler" shirtNumber={4} surname="Een" />)

    expect(container.querySelector('.hf-short-match.hf-short-player')).not.toBeNull()
    expect(container.querySelector('.hf-short-player-number')?.textContent).toBe('4')
    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testspeler Een')
    expect(container.textContent).toBe('4Testspeler Een')
  })

  it('keeps an empty column for a player without a number, and has none when the list has no numbers', () => {
    const { container, rerender } = render(<ShortPlayer shirtNumber={null} surname="Twee" />)

    expect(container.querySelector('.hf-short-player-number')?.textContent).toBe('')

    rerender(<ShortPlayer surname="Twee" />)

    expect(container.querySelector('.hf-short-player-number')).toBeNull()
  })

  it('has the given name in the normal weight and the surname in the stronger weight', () => {
    const { container } = render(<ShortPlayer givenName="Testspeler" surname="van Twee" />)

    expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Testspeler')
    expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('van Twee')
  })
})
