import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type MatchSubstitute, MatchSubstitutes, substituteSentence } from './MatchSubstitutes'

const name = (surname: string, givenName?: string) => ({ givenName, surname })

const kuipers: MatchSubstitute = {
  goals: [{ minute: 85 }],
  minute: 62,
  minutesPlayed: 28,
  name: name('Kuipers', 'Sven'),
  playerOut: name('Dijkstra', 'Lars'),
  shirtNumber: 2,
}

const arcOf = (item: Element | null) => {
  const ring = item?.querySelector<HTMLElement>('.hf-pitch-player-ring')

  return {
    length: ring?.style.getPropertyValue('--hf-ring-length'),
    start: ring?.style.getPropertyValue('--hf-ring-start'),
  }
}

describe('substituteSentence', () => {
  it('says a goal without a minute as a goal, with no minute', () => {
    const sentence = substituteSentence({ ...kuipers, goals: [{ minute: null }, { minute: null, ownGoal: true }] })

    expect(sentence).toBe('Sven Kuipers, rugnummer 2, doelpunt, eigen doelpunt, erin in minuut 62 voor Lars Dijkstra')
  })

  it('says who came on, when, for whom and what he scored', () => {
    expect(substituteSentence(kuipers)).toBe(
      'Sven Kuipers, rugnummer 2, doelpunt in minuut 85, erin in minuut 62 voor Lars Dijkstra',
    )
  })

  it('has no goal part for a player who did not score', () => {
    expect(substituteSentence({ ...kuipers, goals: undefined })).toBe(
      'Sven Kuipers, rugnummer 2, erin in minuut 62 voor Lars Dijkstra',
    )
  })

  it('has his name and no word about the number for a player without a shirt number', () => {
    const sentence = substituteSentence({ ...kuipers, shirtNumber: null })

    expect(sentence).toBe('Sven Kuipers, doelpunt in minuut 85, erin in minuut 62 voor Lars Dijkstra')
    expect(sentence).not.toMatch(/rugnummer|null|leeg/)
  })

  it('names added time, own goals and several goals', () => {
    expect(
      substituteSentence({
        ...kuipers,
        goals: [{ minute: 90, ownGoal: true, stoppageMinutes: 3 }, { minute: 12 }],
        minute: 45,
        stoppageMinutes: 2,
      }),
    ).toBe(
      'Sven Kuipers, rugnummer 2, eigen doelpunt in minuut 90+3, doelpunt in minuut 12, erin in minuut 45+2 voor Lars Dijkstra',
    )
  })
})

describe('MatchSubstitutes', () => {
  it('has the heading "Wissels <team>" at the level it is given', () => {
    const { container } = render(
      <MatchSubstitutes headingLevel={3} ours substitutes={[kuipers]} team="sc Heerenveen" />,
    )

    expect(container.querySelector('h3')?.textContent).toBe('Wissels sc Heerenveen')
  })

  it('makes a list with a name and one sentence for each line', () => {
    const { container } = render(
      <MatchSubstitutes headingLevel={3} ours substitutes={[kuipers]} team="sc Heerenveen" />,
    )
    const list = container.querySelector('ul')
    const item = list?.querySelector('li')

    expect(list?.getAttribute('aria-label')).toBe('Wissels sc Heerenveen')
    expect(item?.querySelector('.hf-visually-hidden')?.textContent).toBe(substituteSentence(kuipers))
    expect(item?.querySelector('.hf-match-substitutes-line')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('draws a disc without a figure for substitutes without a shirt number, also several in a team', () => {
    const { container } = render(
      <MatchSubstitutes
        headingLevel={3}
        ours
        substitutes={[
          { ...kuipers, shirtNumber: null },
          { ...kuipers, minute: 70, name: name('Bakker', 'Jan'), shirtNumber: null },
        ]}
        team="sc Heerenveen"
      />,
    )

    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect([...container.querySelectorAll('.hf-pitch-player-number')].map((node) => node.textContent)).toEqual(['', ''])
    expect(container.textContent).not.toContain('null')
  })

  it('writes "Geen wissels." for a team without substitutes, and no list', () => {
    const { container } = render(<MatchSubstitutes headingLevel={3} ours={false} substitutes={[]} team="Testdorp FC" />)

    expect(container.textContent).toContain('Geen wissels.')
    expect(container.querySelector('ul')).toBeNull()
  })

  it('puts the substitutes in the order of the clock, added time in its place', () => {
    const { container } = render(
      <MatchSubstitutes
        headingLevel={3}
        ours
        substitutes={[
          { ...kuipers, goals: undefined, minute: 46, shirtNumber: 3 },
          { ...kuipers, goals: undefined, minute: 45, shirtNumber: 4, stoppageMinutes: 2 },
          { ...kuipers, goals: undefined, minute: 30, shirtNumber: 5 },
        ]}
        team="sc Heerenveen"
      />,
    )
    const numbers = [...container.querySelectorAll('li')].map(
      (item) => item.querySelector('.hf-pitch-player-number')?.textContent,
    )

    expect(numbers).toEqual(['5', '4', '3'])
  })

  it('puts the goals by his own name and the substitution on a line of its own', () => {
    const { container } = render(
      <MatchSubstitutes
        headingLevel={3}
        ours
        substitutes={[{ ...kuipers, goals: [{ minute: 61 }, { minute: 84 }, { minute: 90, stoppageMinutes: 3 }] }]}
        team="sc Heerenveen"
      />,
    )
    const title = container.querySelector('.hf-match-substitutes-title')
    const detail = container.querySelector('.hf-match-substitutes-detail')

    expect(title?.textContent).toContain('Kuipers')
    expect(title?.textContent).toMatch(/· .*61' · .*84' · .*90\+3'/u)
    expect(title?.querySelectorAll('.hf-match-substitutes-goal svg')).toHaveLength(3)
    expect(detail?.textContent).toContain("62' voor Lars Dijkstra")
    expect(detail?.textContent).not.toMatch(/·|61'|84'/u)
    expect(detail?.querySelectorAll('svg')).toHaveLength(1)
  })

  it('shows only the name and the substitution for a substitute without goals', () => {
    const { container } = render(
      <MatchSubstitutes headingLevel={3} ours substitutes={[{ ...kuipers, goals: undefined }]} team="sc Heerenveen" />,
    )

    expect(container.querySelector('.hf-match-substitutes-goal')).toBeNull()
    expect(container.querySelector('.hf-match-substitutes-title')?.textContent).not.toContain('·')
  })

  it('gives an own goal its own icon among the goals', () => {
    const { container } = render(
      <MatchSubstitutes
        headingLevel={3}
        ours
        substitutes={[{ ...kuipers, goals: [{ minute: 61 }, { minute: 70, ownGoal: true }] }]}
        team="sc Heerenveen"
      />,
    )
    const goals = container.querySelectorAll('.hf-match-substitutes-goal')

    expect(goals).toHaveLength(2)
    expect(goals[0]?.innerHTML).not.toBe(goals[1]?.innerHTML.replace('70', '61'))
  })

  it('draws the ring from the minute he came on, as on the pitch', () => {
    const { container } = render(
      <MatchSubstitutes headingLevel={3} ours substitutes={[kuipers]} team="sc Heerenveen" />,
    )

    // On at 62, played 28 of 90: starts at 248 degrees and covers 112.
    expect(arcOf(container.querySelector('li'))).toEqual({ length: '112deg', start: '248deg' })
  })

  it('runs the ring to 120 minutes in extra time', () => {
    const { container } = render(
      <MatchSubstitutes
        extraTime
        headingLevel={3}
        ours
        substitutes={[{ ...kuipers, minute: 90, minutesPlayed: 30 }]}
        team="sc Heerenveen"
      />,
    )

    expect(arcOf(container.querySelector('li'))).toEqual({ length: '90deg', start: '270deg' })
  })

  it('fills the disc for sc Heerenveen and leaves it open for the opponent', () => {
    const own = render(<MatchSubstitutes headingLevel={3} ours substitutes={[kuipers]} team="sc Heerenveen" />)
    const other = render(<MatchSubstitutes headingLevel={3} ours={false} substitutes={[kuipers]} team="Testdorp FC" />)

    expect(own.container.querySelector('.hf-pitch-player-disc-ours')).not.toBeNull()
    expect(other.container.querySelector('.hf-pitch-player-disc-theirs')).not.toBeNull()
  })

  it('puts the two teams in a group', () => {
    const { container } = render(
      <MatchSubstitutes.Group>
        <MatchSubstitutes headingLevel={3} ours substitutes={[kuipers]} team="sc Heerenveen" />
        <MatchSubstitutes headingLevel={3} ours={false} substitutes={[]} team="Testdorp FC" />
      </MatchSubstitutes.Group>,
    )

    expect(
      container.querySelectorAll('.hf-match-substitutes-group > .hf-match-substitutes-columns > .hf-match-substitutes'),
    ).toHaveLength(2)
  })

  it('makes the line of a substitute with a page one link, named by the sentence, and no other', () => {
    const { container } = render(
      <MatchSubstitutes
        headingLevel={3}
        ours
        substitutes={[
          { ...kuipers, name: { ...kuipers.name, href: '/spelers/sven-kuipers' } },
          { ...kuipers, name: name('Zonder', 'Pagina'), shirtNumber: 3 },
        ]}
        team="sc Heerenveen"
      />,
    )
    const links = container.querySelectorAll('a')

    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute('href')).toBe('/spelers/sven-kuipers')
    expect(links[0]?.querySelector('.hf-visually-hidden')?.textContent).toBe(substituteSentence(kuipers))
    // Nothing focusable stands inside the hidden drawing.
    expect(container.querySelector('[aria-hidden] a')).toBeNull()
  })
})
