import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchTimeline, type MatchTimelineEvent } from './MatchTimeline'

const name = (surname: string, givenName?: string) => ({ givenName, surname })

const card = (minute: number, stoppageMinutes?: number): MatchTimelineEvent => ({
  kind: 'yellow-card',
  minute,
  ours: true,
  player: name('Boerema', 'Daan'),
  stoppageMinutes,
  team: 'sc Heerenveen',
})

const events: MatchTimelineEvent[] = [
  {
    assist: name('Idzenga', 'Thijs'),
    kind: 'goal',
    minute: 12,
    ours: true,
    player: name('Demo', 'Rick'),
    team: 'sc Heerenveen',
  },
  card(34),
  {
    kind: 'substitution',
    minute: 45,
    ours: false,
    playerIn: name('Maquettelaan', 'Wim'),
    playerOut: name('Testwijk', 'Gijs'),
    stoppageMinutes: 2,
    team: 'Testdorp FC',
  },
]

const blocks = (container: HTMLElement) => [...container.querySelectorAll('.hf-match-timeline-block')]
const items = (container: HTMLElement) => [...container.querySelectorAll('li')]
const spoken = (item: Element) => item.querySelector('.hf-visually-hidden')?.textContent

describe('MatchTimeline', () => {
  it('has a block for each half, with a heading and a numbered list with the same name', () => {
    const { container } = render(<MatchTimeline events={[...events, card(60)]} />)

    expect(blocks(container).map((block) => block.querySelector('h3')?.textContent)).toEqual([
      'Eerste helft',
      'Tweede helft',
    ])
    expect(blocks(container).map((block) => block.querySelector('ol')?.getAttribute('aria-label'))).toEqual([
      'Eerste helft',
      'Tweede helft',
    ])
  })

  it('puts 45+2 in the first half, 90+3 in the second and minute 91 in extra time', () => {
    const { container } = render(
      <MatchTimeline events={[card(10), card(45, 2), card(46), card(90, 3), card(91), card(118)]} extraTime />,
    )
    const minutes = (block: Element | undefined) =>
      [...(block?.querySelectorAll('.hf-match-event-minute') ?? [])].map((minute) => minute.textContent)

    expect(minutes(blocks(container)[0])).toEqual(['10’', '45+2’'])
    expect(minutes(blocks(container)[1])).toEqual(['46’', '90+3’'])
    expect(minutes(blocks(container)[2])).toEqual(['91’', '118’'])
    expect(blocks(container)[2]?.querySelector('h3')?.textContent).toBe('Verlenging')
    expect(blocks(container)[2]?.className).toContain('hf-match-timeline-extra-time')
  })

  it('has no block for extra time, and keeps a late minute in the second half, without extra time', () => {
    const { container } = render(<MatchTimeline events={[card(91)]} />)

    expect(blocks(container)).toHaveLength(2)
    expect(blocks(container)[1]?.querySelectorAll('li')).toHaveLength(1)
  })

  it('says "Niets wat we bijhouden." in a block without events, and has no list there', () => {
    const { container } = render(<MatchTimeline events={[card(10)]} extraTime />)

    expect(blocks(container)[1]?.textContent).toContain('Niets wat we bijhouden.')
    expect(blocks(container)[1]?.querySelector('ol')).toBeNull()
    expect(blocks(container)[2]?.textContent).toContain('Niets wat we bijhouden.')
  })

  it('uses the level of heading it is given', () => {
    const { container } = render(<MatchTimeline events={[]} headingLevel={4} />)

    expect(container.querySelector('h4')?.textContent).toBe('Eerste helft')
    expect(container.querySelector('h3')).toBeNull()
  })

  it('shows the minute for the eye in a pill, filled for sc Heerenveen and open for the opponent', () => {
    const { container } = render(<MatchTimeline events={events} />)
    const pills = [...container.querySelectorAll('.hf-match-event-minute')]

    expect(pills.map((pill) => pill.textContent)).toEqual(['12’', '34’', '45+2’'])
    expect(pills.map((pill) => pill.classList.contains('hf-match-event-minute-ours'))).toEqual([true, true, false])
    expect(pills.every((pill) => pill.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('says the team, the minute and the kind first to a screen reader', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(items(container).map(spoken)).toEqual([
      'sc Heerenveen: Minuut 12, Doelpunt: ',
      'sc Heerenveen: Minuut 34, Gele kaart: ',
      'Testdorp FC: Minuut 45 plus 2, Wissel: ',
    ])
  })

  it('names a goal from a penalty and an own goal after the name, and says them first to a screen reader', () => {
    const goal = (extra: object) =>
      render(
        <MatchTimeline
          events={[{ kind: 'goal', minute: 9, ours: true, player: name('Demo'), team: 'sc Heerenveen', ...extra }]}
        />,
      ).container.querySelector('li')!

    expect(goal({}).querySelector('.hf-match-event-note')).toBeNull()
    expect(spoken(goal({ penalty: true }))).toBe('sc Heerenveen: Minuut 9, Doelpunt (strafschop): ')
    expect(goal({ penalty: true }).querySelector('.hf-match-event-note')?.textContent).toBe(' (strafschop)')
    expect(spoken(goal({ ownGoal: true }))).toBe('sc Heerenveen: Minuut 9, Eigen doelpunt: ')
    expect(goal({ ownGoal: true }).querySelector('.hf-match-event-note')?.textContent).toBe(' (eigen doelpunt)')
    // What is said first covers the note, so a screen reader does not hear it twice.
    expect(goal({ penalty: true }).querySelector('.hf-match-event-note')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('puts the assist on a line of its own', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(items(container)[0]?.querySelector('.hf-match-event-assist')?.textContent).toBe('assist Thijs Idzenga')
  })

  it('writes a substitution as "A voor B" with one icon', () => {
    const { container } = render(<MatchTimeline events={events} />)
    const line = items(container)[2]!.querySelector('.hf-match-event-line')!

    expect(line.textContent).toBe('Wim Maquettelaan voor Gijs Testwijk')
    expect(line.querySelectorAll('svg')).toHaveLength(1)
  })

  it('has an icon on every line, hidden from a screen reader', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(items(container).map((item) => item.querySelectorAll('svg').length)).toEqual([1, 1, 1])
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('leaves out a word beside an icon that says the same, but keeps it for a missed or a saved penalty', () => {
    const word = (kind: 'penalty-missed' | 'penalty-saved' | 'red-card') =>
      render(
        <MatchTimeline events={[{ kind, minute: 5, ours: true, player: name('Demo'), team: 'sc Heerenveen' }]} />,
      ).container.querySelector('.hf-match-event-kind')?.textContent

    expect(word('red-card')).toBeUndefined()
    expect(word('penalty-missed')).toBe('Gemiste strafschop')
    expect(word('penalty-saved')).toBe('Gestopte strafschop')
  })

  it('names every kind of event in the text for a screen reader', () => {
    const kinds = [
      ['yellow-card', 'Gele kaart'],
      ['yellow-red-card', 'Geel-rode kaart'],
      ['red-card', 'Rode kaart'],
      ['penalty-missed', 'Gemiste strafschop'],
      ['penalty-saved', 'Gestopte strafschop'],
    ] as const

    for (const [kind, words] of kinds) {
      const { container, unmount } = render(
        <MatchTimeline events={[{ kind, minute: 5, ours: true, player: name('Demo'), team: 'sc Heerenveen' }]} />,
      )

      expect(spoken(container.querySelector('li')!)).toBe(`sc Heerenveen: Minuut 5, ${words}: `)
      unmount()
    }
  })

  it('gives the surname the stronger weight through the name of a player', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('Demo')
    expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Rick')
  })

  it('is a group that takes the attributes given, such as the label', () => {
    const { container } = render(<MatchTimeline aria-labelledby="verloop" events={[]} />)
    const root = container.firstElementChild!

    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('aria-labelledby')).toBe('verloop')
  })
})
