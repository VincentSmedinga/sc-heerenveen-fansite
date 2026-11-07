import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchLineup, type MatchLineupPlayer, type MatchLineupProps } from './MatchLineup'

const player = (shirtNumber: number, surname: string, extra: Partial<MatchLineupPlayer> = {}): MatchLineupPlayer => ({
  name: { givenName: 'Test', surname },
  shirtNumber,
  ...extra,
})

const props: MatchLineupProps = {
  bench: [player(16, 'Oosting', { notes: ['Gewisseld in de 61e minuut voor Jansen'] })],
  headingLevel: 3,
  starters: [
    player(1, 'Brandsma', { captain: true }),
    player(2, 'Boerema', { notes: ['Gele kaart in de 34e minuut'] }),
  ],
  team: 'sc Heerenveen',
}

describe('MatchLineup', () => {
  it('has the team as a heading of the level given, and a label for the line-up and the bench', () => {
    const { container } = render(<MatchLineup {...props} />)

    expect(container.querySelector('h3')?.textContent).toBe('sc Heerenveen')
    expect([...container.querySelectorAll('ul')].map((list) => list.getAttribute('aria-label'))).toEqual([
      'Basis sc Heerenveen',
      'Bank sc Heerenveen',
    ])
  })

  it('lists the players with their shirt number in front of the name', () => {
    const { container } = render(<MatchLineup {...props} />)
    const lists = container.querySelectorAll('ul')

    expect(
      [...lists[0]!.querySelectorAll('li')].map((item) => item.querySelector('.hf-player-name-number')?.textContent),
    ).toEqual(['1', '2'])
    expect(lists[1]?.querySelectorAll('li')).toHaveLength(1)
  })

  it('says in a word that a player is the captain', () => {
    const { container } = render(<MatchLineup {...props} />)

    expect(container.querySelector('li')?.textContent).toContain('aanvoerder')
    expect(container.querySelectorAll('li')[1]?.textContent).not.toContain('aanvoerder')
  })

  it('writes what happened to a player in sentences under his name', () => {
    const { container } = render(<MatchLineup {...props} />)

    expect([...container.querySelectorAll('.hf-match-lineup-note')].map((note) => note.textContent)).toEqual([
      'Gele kaart in de 34e minuut',
      'Gewisseld in de 61e minuut voor Jansen',
    ])
  })

  it('shows no list for a team without a bench', () => {
    const { container } = render(<MatchLineup {...props} bench={[]} />)

    expect(container.querySelectorAll('ul')).toHaveLength(1)
  })

  it('hides the word in front of a list from a screen reader, since the list has its name', () => {
    const { container } = render(<MatchLineup {...props} />)

    expect(
      [...container.querySelectorAll('.hf-match-lineup-label')].every(
        (label) => label.getAttribute('aria-hidden') === 'true',
      ),
    ).toBe(true)
  })

  it('puts the formation under the name of the team, as a short line', () => {
    const { container } = render(<MatchLineup {...props} formation="4-3-3" />)
    const line = container.querySelector('.hf-match-lineup-formation')

    expect(line?.textContent).toBe('Formatie: 4-3-3')
    expect(container.querySelector('h3')?.nextElementSibling).toBe(line)
  })

  it('shows nothing for a team without a formation, also an empty one', () => {
    expect(render(<MatchLineup {...props} />).container.querySelector('.hf-match-lineup-formation')).toBeNull()
    expect(
      render(<MatchLineup {...props} formation="" />).container.querySelector('.hf-match-lineup-formation'),
    ).toBeNull()
  })
})
