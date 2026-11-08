import { render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchPitch, type MatchPitchTeam } from './MatchPitch'
import { type PitchPlayerData } from './PitchPlayer'

const squad = (prefix: string, count = 11): PitchPlayerData[] =>
  Array.from({ length: count }, (_, index) => ({
    captain: index === 0,
    minutesPlayed: 90,
    name: { givenName: prefix, surname: `Speler${index + 1}` },
    shirtNumber: index + 1,
  }))

const team = (name: string, formation: null | string | undefined, count = 11): MatchPitchTeam => ({
  formation,
  name,
  players: squad(name.slice(0, 1), count),
})

const renderPitch = (ours: MatchPitchTeam, opponent: MatchPitchTeam) =>
  render(<MatchPitch headingLevel={3} opponent={opponent} ours={ours} />)

describe('MatchPitch', () => {
  it('makes a list of eleven players for each team, named after the team and the formation', () => {
    const { container } = renderPitch(team('sc Heerenveen', '4-2-3-1'), team('Testdorp FC', '4-4-2'))
    const lists = container.querySelectorAll('.hf-match-pitch-field ol')

    expect([...lists].map((list) => list.getAttribute('aria-label'))).toEqual([
      'Opstelling sc Heerenveen, 4-2-3-1',
      'Opstelling Testdorp FC, 4-4-2',
    ])
    lists.forEach((list) => {
      expect(list.querySelectorAll(':scope > li')).toHaveLength(11)
    })
  })

  it('keeps the order of the formation in the list, goalkeeper first, with a sentence for each player', () => {
    const { container } = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', '4-4-2'))
    const first = container.querySelector('.hf-match-pitch-field ol')
    const sentences = [...(first?.querySelectorAll('.hf-visually-hidden') ?? [])].map((node) => node.textContent)

    expect(sentences[0]).toBe('s Speler1, rugnummer 1, aanvoerder, 90 minuten')
    expect(sentences[10]).toBe('s Speler11, rugnummer 11, 90 minuten')
  })

  it('shows each team above the pitch with its formation', () => {
    const { container } = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', '3-5-2'))
    const names = container.querySelectorAll('.hf-match-pitch-team-name')

    expect(names[0]?.textContent).toBe('sc Heerenveen4-3-3')
    expect(names[1]?.textContent).toBe('Testdorp FC3-5-2')
    expect(container.querySelector('.hf-match-pitch-swatch-ours')).not.toBeNull()
    expect(container.querySelectorAll('.hf-match-pitch-swatch')).toHaveLength(2)
  })

  it('leaves a team without a formation off the pitch and says so', () => {
    const { container, getByText } = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', null))

    expect(container.querySelectorAll('.hf-match-pitch-field ol')).toHaveLength(1)
    expect(
      getByText('Voor Testdorp FC past de formatie niet bij de spelers; de lijst hieronder toont de opstelling.'),
    ).not.toBeNull()
  })

  it('leaves a team out when its formation does not fit its players', () => {
    const { container, getByText } = renderPitch(team('sc Heerenveen', '4-3-3', 10), team('Testdorp FC', '4-4-2'))

    expect(container.querySelectorAll('.hf-match-pitch-field ol')).toHaveLength(1)
    expect(getByText(/Voor sc Heerenveen past de formatie niet bij de spelers/u)).not.toBeNull()
  })

  it('names both teams when neither fits', () => {
    const { getByText } = renderPitch(team('sc Heerenveen', 'x'), team('Testdorp FC', ''))

    expect(getByText(/Voor sc Heerenveen en Testdorp FC past de formatie/u)).not.toBeNull()
  })

  it('tells that the names do not fit on a narrow screen for five in a row, and for five rows', () => {
    const calm = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', '4-4-2'))
    const row = renderPitch(team('sc Heerenveen', '3-5-2'), team('Testdorp FC', '4-4-2'))
    const rows = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', '4-1-2-1-2'))
    const sentence = 'Bij deze formatie passen de namen niet op een smal scherm. De lijst hieronder noemt ze.'

    expect(calm.container.textContent).not.toContain(sentence)
    expect(calm.container.querySelector('.hf-match-pitch-crowded')).toBeNull()
    expect(row.container.textContent).toContain(sentence)
    expect(row.container.querySelector('.hf-match-pitch-crowded')).not.toBeNull()
    expect(rows.container.textContent).toContain(sentence)
  })

  it('explains the marks under the pitch, and the list as a disclosure under that', () => {
    const { container } = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', '4-4-2'))
    const legend = container.querySelector('[aria-label="Uitleg van de merken"]')
    const children = [...(container.querySelector('.hf-match-pitch')?.children ?? [])]

    expect(legend?.textContent).toContain('Rugnummer')
    expect(legend?.textContent).toContain('Ring: minuten gespeeld')
    expect(legend?.textContent).toContain('Doelpunt')
    expect(legend?.textContent).toContain('Kaart')
    expect(legend?.textContent).toContain('Eruit gewisseld')
    expect(legend?.textContent).toContain('Aanvoerder')
    expect(children.indexOf(legend as Element)).toBeLessThan(
      children.indexOf(container.querySelector('details') as Element),
    )
    expect(container.querySelector('details summary')?.textContent).toBe('Opstelling als lijst')
  })

  it('lists the players of both teams in the disclosure, also for a team that is not on the pitch', () => {
    const { container } = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', null))
    const details = container.querySelector('details') as HTMLElement
    const headings = [...details.querySelectorAll('h3')].map((heading) => heading.textContent)

    expect(headings).toEqual(['sc Heerenveen · 4-3-3', 'Testdorp FC'])
    expect(details.querySelectorAll('li')).toHaveLength(22)
    expect(within(details).getAllByText('aanvoerder')).toHaveLength(2)
  })

  it('puts a team without shirt numbers on the pitch, with no figure and no column in the list', () => {
    const ours = team('sc Heerenveen', '4-3-3')
    const { container } = renderPitch(
      { ...ours, players: ours.players.map((player) => ({ ...player, shirtNumber: null })) },
      team('Testdorp FC', '4-4-2'),
    )
    const sentences = [
      ...container.querySelectorAll('.hf-match-pitch-field ol')[0]!.querySelectorAll('.hf-visually-hidden'),
    ]
    const rosters = container.querySelectorAll('.hf-match-pitch-roster')

    expect(sentences[0]?.textContent).toBe('s Speler1, aanvoerder, 90 minuten')
    expect(container.querySelectorAll('.hf-match-pitch-team')[0]?.querySelectorAll('li')).toHaveLength(11)
    expect(rosters[0]?.querySelector('.hf-player-name-number')).toBeNull()
    expect(rosters[1]?.querySelector('.hf-player-name-number')).not.toBeNull()
    expect(container.textContent).not.toContain('null')
  })

  it('puts only sc Heerenveen on the pitch and in the list when the opponent is left out, without a word about him', () => {
    const { container } = render(<MatchPitch headingLevel={3} ours={team('sc Heerenveen', '4-3-3')} />)

    expect(container.querySelectorAll('.hf-match-pitch-field ol')).toHaveLength(1)
    expect(container.querySelectorAll('.hf-match-pitch-team-name')).toHaveLength(1)
    expect(container.querySelector('.hf-match-pitch-note')).toBeNull()
    expect([...container.querySelectorAll('details h3')].map((heading) => heading.textContent)).toEqual([
      'sc Heerenveen · 4-3-3',
    ])
  })

  it('puts its children between the explanation of the marks and the list', () => {
    const { container } = render(
      <MatchPitch headingLevel={3} opponent={team('Testdorp FC', '4-4-2')} ours={team('sc Heerenveen', '4-3-3')}>
        <p>Wissels</p>
      </MatchPitch>,
    )
    const children = [...container.querySelector('.hf-match-pitch')!.children]
    const place = (node: Element | null) => children.findIndex((child) => node !== null && child.contains(node))

    expect(place(container.querySelector('.hf-match-pitch > p:not(.hf-match-pitch-note)'))).toBeGreaterThan(
      place(container.querySelector('.hf-match-pitch-legend')),
    )
    expect(place(container.querySelector('.hf-match-pitch > p:not(.hf-match-pitch-note)'))).toBeLessThan(
      place(container.querySelector('details')),
    )
  })

  it('puts the heading of the teams in the list at the level it is given', () => {
    const { container } = render(
      <MatchPitch headingLevel={2} opponent={team('Testdorp FC', '4-4-2')} ours={team('sc Heerenveen', '4-3-3')} />,
    )

    expect(container.querySelectorAll('details h2')).toHaveLength(2)
  })

  it('has no controls of its own on the pitch', () => {
    const { container } = renderPitch(team('sc Heerenveen', '4-3-3'), team('Testdorp FC', '4-4-2'))

    expect(
      container.querySelector(
        '.hf-match-pitch-field button, .hf-match-pitch-field a, .hf-match-pitch-field [tabindex]',
      ),
    ).toBeNull()
  })

  it('runs the rings to 120 minutes in extra time', () => {
    const ours = team('sc Heerenveen', '4-3-3')
    const long: MatchPitchTeam = {
      ...ours,
      players: ours.players.map((player, index) =>
        index === 1 ? { ...player, minutesFrom: 90, minutesPlayed: 30 } : player,
      ),
    }
    const { container } = render(
      <MatchPitch extraTime headingLevel={3} opponent={team('Testdorp FC', '4-4-2')} ours={long} />,
    )
    const ring = container.querySelectorAll<HTMLElement>('.hf-pitch-player-ring')[1]

    expect(ring?.style.getPropertyValue('--hf-ring-start')).toBe('270deg')
    expect(ring?.style.getPropertyValue('--hf-ring-length')).toBe('90deg')
  })
})
