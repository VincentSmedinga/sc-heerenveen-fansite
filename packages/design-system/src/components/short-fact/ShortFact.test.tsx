import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlayerName } from '../player-name/PlayerName'
import { Text } from '../text/Text'
import { ShortFact } from './ShortFact'

describe('ShortFact', () => {
  it('writes the fact in the classes of a short match, so a List draws the lines between its lines', () => {
    const { container } = render(<ShortFact>1 van de 17 doelpunten</ShortFact>)

    expect(container.querySelector('.hf-short-match.hf-short-fact')).not.toBeNull()
    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('1 van de 17 doelpunten')
  })

  it('has the quiet style of "thuis" for a line that says there is nothing', () => {
    const { container } = render(<ShortFact empty>Nog geen</ShortFact>)

    expect(container.querySelector('.hf-short-match-where')?.textContent).toBe('Nog geen')
    expect(container.querySelector('.hf-short-match-opponent')).toBeNull()
  })

  it('keeps the name above it in the same item, first, so a screen reader reads it first', () => {
    const { container } = render(
      <ul>
        <li>
          <Text appearance="meta">Hattricks</Text>
          <ShortFact>
            <PlayerName givenName="Testspeler" surname="Een" />
          </ShortFact>
        </li>
      </ul>,
    )

    expect(container.querySelector('li')?.textContent).toBe('HattricksTestspeler Een')
    expect(container.querySelector('li > .hf-short-fact')).not.toBeNull()
    expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('Een')
  })

  it('passes other props on', () => {
    const { container } = render(<ShortFact id="feit">Een feit</ShortFact>)

    expect(container.querySelector('#feit')).not.toBeNull()
  })
})
