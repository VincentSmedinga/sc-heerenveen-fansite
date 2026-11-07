import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchTimeline, type MatchTimelineEvent } from './MatchTimeline'

const name = (surname: string, givenName?: string) => ({ givenName, surname })

const events: MatchTimelineEvent[] = [
  {
    assist: name('Idzenga', 'Thijs'),
    kind: 'goal',
    minute: 12,
    ours: true,
    player: name('Demo', 'Rick'),
    team: 'sc Heerenveen',
  },
  { kind: 'yellow-card', minute: 34, ours: true, player: name('Boerema', 'Daan'), team: 'sc Heerenveen' },
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

const items = (container: HTMLElement) => [...container.querySelectorAll('li')]

describe('MatchTimeline', () => {
  it('is an ordered list with an item for each event, in the order given', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(container.querySelector('ol')).not.toBeNull()
    expect(items(container)).toHaveLength(3)
  })

  it('writes the name of every kind of event in words, so a colour or a sign is never the only one', () => {
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

      expect(container.querySelector('.hf-match-event-kind')?.textContent).toBe(words)
      unmount()
    }
  })

  it('names a goal, a goal from a penalty and an own goal differently, and gives the assist in words', () => {
    const goal = (extra: object) =>
      render(
        <MatchTimeline
          events={[{ kind: 'goal', minute: 9, ours: true, player: name('Demo'), team: 'sc Heerenveen', ...extra }]}
        />,
      )

    expect(goal({}).container.querySelector('.hf-match-event-kind')?.textContent).toBe('Doelpunt')
    expect(goal({ penalty: true }).container.querySelector('.hf-match-event-kind')?.textContent).toBe(
      'Doelpunt uit een strafschop',
    )
    expect(goal({ ownGoal: true }).container.querySelector('.hf-match-event-kind')?.textContent).toBe('Eigen doelpunt')
    expect(render(<MatchTimeline events={events} />).container.textContent).toContain('assist: Thijs Idzenga')
  })

  it('says who comes on and who goes off in a substitution', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(items(container)[2]?.textContent).toContain('Wim Maquettelaan erin, Gijs Testwijk eruit')
  })

  it('shows the minute with its added time for the eye, and says it in words to a screen reader', () => {
    const { container } = render(<MatchTimeline events={events} />)
    const second = items(container)[2]!

    expect(second.querySelector('[aria-hidden]')?.textContent).toBe('45’+2')
    expect(second.querySelector('.hf-visually-hidden')?.textContent).toBe('Minuut 45 plus 2. ')
    expect(items(container)[0]?.querySelector('[aria-hidden]')?.textContent).toBe('12’')
  })

  it('names the team at every event, and marks our own', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(items(container).map((item) => item.querySelector('.hf-match-event-team')?.textContent)).toEqual([
      ', sc Heerenveen',
      ', sc Heerenveen',
      ', Testdorp FC',
    ])
    expect(items(container).map((item) => item.classList.contains('hf-match-event-ours'))).toEqual([true, true, false])
  })

  it('gives the surname the stronger weight through the name of a player', () => {
    const { container } = render(<MatchTimeline events={events} />)

    expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('Demo')
    expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Rick')
  })

  it('passes the attributes of a list on, such as the label', () => {
    const { container } = render(<MatchTimeline aria-labelledby="verloop" events={[]} />)

    expect(container.querySelector('ol')?.getAttribute('aria-labelledby')).toBe('verloop')
  })
})
