import { render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type MatchPenaltyRound, MatchPenaltySeries } from './MatchPenaltySeries'

const rounds: MatchPenaltyRound[] = [
  { ours: { player: { givenName: 'Jens', surname: 'Bouwman' }, result: 'scored' }, theirs: { result: 'scored' } },
  {
    ours: { player: { givenName: 'Mees', surname: 'Hoekstra' }, result: 'missed' },
    theirs: { player: { givenName: 'Bas', surname: 'Meijer' }, result: 'scored' },
  },
  {
    ours: { player: { givenName: 'Okke', surname: 'Terpstra' }, result: 'scored' },
    theirs: { player: { givenName: 'Joris', surname: 'Kok' }, result: 'saved' },
  },
]

const show = (more: Partial<Parameters<typeof MatchPenaltySeries>[0]> = {}) =>
  render(<MatchPenaltySeries headingLevel={2} opponent="Testdorp FC" rounds={rounds} {...more} />)

const cells = (container: HTMLElement) =>
  [...container.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('th, td')])

describe('MatchPenaltySeries', () => {
  it('has the heading "Strafschoppenserie" at the level it is given', () => {
    const { container } = show({ headingLevel: 3 })

    expect(container.querySelector('h3')?.textContent).toBe('Strafschoppenserie')
  })

  it('gives each team the total of its goals, with the team in the hidden text', () => {
    const { container } = show()
    const totals = [...container.querySelectorAll('.hf-match-penalty-total')]

    expect(totals.map((total) => total.textContent)).toEqual(['sc Heerenveen: 2', 'Testdorp FC: 2'])
    expect(totals.map((total) => total.querySelector('.hf-visually-hidden')?.textContent)).toEqual([
      'sc Heerenveen: ',
      'Testdorp FC: ',
    ])
  })

  it('shows a kick for each round in the row, a ball for a goal and a ring with a cross otherwise', () => {
    const { container } = show()
    const [ours, theirs] = [...container.querySelectorAll('.hf-match-penalty-kicks')]

    expect(ours?.querySelectorAll('.hf-match-penalty-kick')).toHaveLength(3)
    expect(ours?.querySelectorAll('.hf-match-event-icon-ball')).toHaveLength(2)
    expect(ours?.querySelectorAll('.hf-match-event-icon-ring')).toHaveLength(1)
    expect(theirs?.querySelectorAll('.hf-match-event-icon-ball')).toHaveLength(2)
  })

  it('leaves a gap before the deciding rounds, after the fifth', () => {
    const six = Array.from({ length: 6 }, () => ({ ours: { result: 'scored' as const } }))
    const { container } = show({ rounds: six })
    const ours = container.querySelector('.hf-match-penalty-kicks')

    expect(ours?.querySelectorAll('.hf-match-penalty-deciding')).toHaveLength(1)
    expect(ours?.children[5]?.classList.contains('hf-match-penalty-deciding')).toBe(true)
    expect(show({ rounds }).container.querySelector('.hf-match-penalty-deciding')).toBeNull()
  })

  it('has a real table with a hidden caption that says the score', () => {
    const { container } = show()
    const table = container.querySelector('table')

    expect(table?.querySelector('caption')?.textContent).toBe('Strafschoppenserie, stand 2–2')
    expect(table?.querySelector('caption')?.classList.contains('hf-visually-hidden')).toBe(true)
  })

  it('has column headers with a scope, none of them empty, and a row header for each round', () => {
    const { container } = show()
    const headers = [...container.querySelectorAll('thead th')]

    expect(headers.map((header) => header.getAttribute('scope'))).toEqual(['col', 'col', 'col', 'col'])
    expect(headers.map((header) => header.textContent)).toEqual(['Nr.Ronde', 'sc Heerenveen', 'Testdorp FC', 'Stand'])
    expect(headers.every((header) => (header.textContent ?? '') !== '')).toBe(true)
    expect([...container.querySelectorAll('tbody th')].map((header) => header.getAttribute('scope'))).toEqual([
      'row',
      'row',
      'row',
    ])
  })

  it('starts every cell with Raak:, Naast: or Gestopt: for a screen reader', () => {
    const { container } = show()
    const [first, second, third] = cells(container)
    const spoken = (cell: Element | undefined) => cell?.querySelector('.hf-visually-hidden')?.textContent

    expect([spoken(first?.[1]), spoken(first?.[2])]).toEqual(['Raak: ', 'Raak: '])
    expect([spoken(second?.[1]), spoken(second?.[2])]).toEqual(['Naast: ', 'Raak: '])
    expect([spoken(third?.[1]), spoken(third?.[2])]).toEqual(['Raak: ', 'Gestopt: '])
  })

  it('names the player with the surname in the stronger weight, and says "Speler onbekend" for none', () => {
    const { container } = show()
    const [first, second] = cells(container)

    expect(first?.[1]?.querySelector('.hf-player-name-given')?.textContent).toBe('Jens')
    expect(first?.[1]?.querySelector('.hf-player-name-surname')?.textContent).toBe('Bouwman')
    expect(first?.[2]?.textContent).toContain('Speler onbekend')
    expect(second?.[2]?.textContent).not.toContain('Speler onbekend')
  })

  it('writes "(naast)" or "(gestopt)" beside a kick that did not score, and nothing beside a goal', () => {
    const { container } = show()
    const [first, second, third] = cells(container)

    expect(first?.[1]?.textContent).not.toMatch(/\(/u)
    expect(second?.[1]?.textContent).toContain('(naast)')
    expect(third?.[2]?.textContent).toContain('(gestopt)')
  })

  it('gives the score after each round, ours first, for the eye and for a screen reader', () => {
    const { container } = show()
    const standings = cells(container).map((row) => row[3])

    expect(standings.map((cell) => cell?.querySelector('[aria-hidden]')?.textContent)).toEqual(['1–1', '1–2', '2–2'])
    expect(standings.map((cell) => cell?.querySelector('.hf-visually-hidden')?.textContent)).toEqual([
      '1 tegen 1',
      '1 tegen 2',
      '2 tegen 2',
    ])
  })

  it('says "Geen schot" for a round in which a team did not kick', () => {
    const { container } = show({ rounds: [{ ours: { result: 'scored' } }] })

    expect(within(container).getByText('Geen schot')).toBeTruthy()
  })
})
