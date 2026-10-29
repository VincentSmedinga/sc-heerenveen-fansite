import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Match, type MatchProps } from './Match'

const played: MatchProps = {
  competition: 'Eredivisie',
  dateTime: '2026-10-11',
  goalsAgainst: 0,
  goalsFor: 2,
  home: true,
  opponent: 'Testdorp FC',
  round: 'Speelronde 9',
  stadium: 'Stadion Proeflaan',
  status: 'played',
  time: 'zo 11 okt',
}

const scheduled: MatchProps = {
  competition: 'Eredivisie',
  dateTime: '2026-11-01T13:30:00Z',
  home: false,
  opponent: 'Voorbeeld United',
  round: 'Speelronde 12',
  stadium: 'Voorbeeldpark',
  status: 'scheduled',
  time: 'zo 1 nov 14:30',
}

const textOf = (container: HTMLElement) => container.textContent.replace(/\s+/gu, ' ').trim()

describe('Match', () => {
  it('writes the competition and the round, the clubs and when and where', () => {
    const { container } = render(<Match {...scheduled} />)

    expect(container.querySelector('.hf-match-label')?.textContent).toBe('Eredivisie · Speelronde 12')
    expect(container.querySelector('.hf-match-clubs')?.textContent).toBe('Voorbeeld United –tegen sc Heerenveen')
    expect(container.querySelector('.hf-match-when')?.textContent).toBe('zo 1 nov 14:30 · Uit · Voorbeeldpark')
  })

  it('names the home club first, and says "Thuis" or "Uit"', () => {
    const { container, rerender } = render(<Match {...scheduled} home />)

    expect(container.querySelector('.hf-match-clubs')?.firstElementChild?.textContent).toBe('sc Heerenveen')
    expect(container.querySelector('.hf-match-when')?.textContent).toContain('Thuis')

    rerender(<Match {...scheduled} home={false} />)

    expect(container.querySelector('.hf-match-clubs')?.firstElementChild?.textContent).toBe('Voorbeeld United')
    expect(container.querySelector('.hf-match-when')?.textContent).toContain('Uit')
  })

  it('shows the result from the side of the home club, and a screen reader hears "tegen"', () => {
    const { container, rerender } = render(<Match {...played} />)
    const score = () => container.querySelector('.hf-match-score')

    expect(score()?.querySelector('[aria-hidden="true"]')?.textContent).toBe('2–0')
    expect(score()?.querySelector('.hf-visually-hidden')?.textContent).toBe('2 tegen 0')

    rerender(<Match {...played} goalsAgainst={3} goalsFor={1} home={false} />)

    expect(score()?.querySelector('[aria-hidden="true"]')?.textContent).toBe('3–1')
    expect(score()?.querySelector('.hf-visually-hidden')?.textContent).toBe('3 tegen 1')
  })

  it.each([
    { goalsAgainst: 0, goalsFor: 2, home: true, outcome: 'win', shown: '2–0' },
    { goalsAgainst: 2, goalsFor: 0, home: true, outcome: 'loss', shown: '0–2' },
    { goalsAgainst: 1, goalsFor: 1, home: true, outcome: 'draw', shown: '1–1' },
    { goalsAgainst: 0, goalsFor: 2, home: false, outcome: 'win', shown: '0–2' },
    { goalsAgainst: 2, goalsFor: 0, home: false, outcome: 'loss', shown: '2–0' },
    { goalsAgainst: 1, goalsFor: 1, home: false, outcome: 'draw', shown: '1–1' },
  ])('colours a $shown result for $outcome when home is $home', ({ goalsAgainst, goalsFor, home, outcome, shown }) => {
    const { container } = render(<Match {...played} goalsAgainst={goalsAgainst} goalsFor={goalsFor} home={home} />)
    const score = container.querySelector('.hf-match-score')

    // The outcome is for sc Heerenveen: it follows the goals of our club, not the home club's.
    expect(score?.className).toBe(`hf-match-score hf-match-${outcome}`)
    expect(score?.querySelector('[aria-hidden="true"]')?.textContent).toBe(shown)
  })

  it('gives a level cup tie the colour of a draw', () => {
    const { container } = render(
      <Match {...played} competition="KNVB Beker" goalsAgainst={2} goalsFor={2} round="Tweede ronde" />,
    )

    expect(container.querySelector('.hf-match-score')?.className).toBe('hf-match-score hf-match-draw')
  })

  it('adds no letter or word for the outcome, so a screen reader still hears only the goals', () => {
    const { container } = render(<Match {...played} />)
    const score = container.querySelector('.hf-match-score')

    expect(score?.textContent).toBe('2–02 tegen 0')
    expect(score?.hasAttribute('aria-label')).toBe(false)
  })

  it('gives a match that is not played no outcome', () => {
    const { container, rerender } = render(<Match {...scheduled} />)
    const cls = () => container.querySelector('.hf-match-score')?.className

    expect(cls()).toBe('hf-match-score hf-match-versus')

    rerender(<Match competition="Eredivisie" home opponent="Demo Boys" round="Speelronde 5" status="postponed" />)

    expect(cls()).toBe('hf-match-score hf-match-versus')
  })

  describe('extra time and a shoot-out', () => {
    const cup = { ...played, competition: 'KNVB Beker', goalsAgainst: 1, goalsFor: 1, round: 'Tweede ronde' } as const
    const label = (container: HTMLElement) => container.querySelector('.hf-match-label')
    const score = (container: HTMLElement) => container.querySelector('.hf-match-score')
    const seen = (container: HTMLElement) => score(container)?.querySelector('[aria-hidden="true"]')
    const heard = (container: HTMLElement) => score(container)?.querySelector('.hf-visually-hidden')?.textContent

    it('says "n.v." right after the result, with the full words in the title and for a screen reader', () => {
      const { container } = render(<Match {...cup} extraTime goalsFor={2} />)

      expect(seen(container)?.textContent).toBe('2–1 n.v.')
      expect(seen(container)?.querySelector('abbr')?.getAttribute('title')).toBe('Na verlenging')
      expect(heard(container)).toBe('2 tegen 1, na verlenging')
    })

    it('says "n.s." and the shoot-out right after the result, in the order of the clubs', () => {
      const { container, rerender } = render(<Match {...cup} extraTime penaltiesAgainst={3} penaltiesFor={4} />)

      expect(seen(container)?.textContent).toBe('1–1 (4–3 n.s.)')
      expect(seen(container)?.querySelector('abbr')?.getAttribute('title')).toBe('Na strafschoppen')
      expect(heard(container)).toBe('1 tegen 1, na strafschoppen 4 tegen 3')

      rerender(<Match {...cup} extraTime home={false} penaltiesAgainst={3} penaltiesFor={4} />)

      expect(seen(container)?.textContent).toBe('1–1 (3–4 n.s.)')
      expect(heard(container)).toBe('1 tegen 1, na strafschoppen 3 tegen 4')
    })

    it('says only "n.s." after a shoot-out, since a shoot-out comes after extra time', () => {
      const { container } = render(<Match {...cup} extraTime penaltiesAgainst={3} penaltiesFor={4} />)

      expect(seen(container)?.textContent).not.toContain('n.v.')
    })

    it('keeps the label to the competition and the round, and adds nothing to a match without extra time', () => {
      const { container } = render(<Match {...cup} extraTime penaltiesAgainst={3} penaltiesFor={4} />)

      expect(label(container)?.textContent).toBe('KNVB Beker · Tweede ronde')

      const plain = render(<Match {...cup} />)

      expect(seen(plain.container)?.textContent).toBe('1–1')
      expect(plain.container.querySelector('abbr')).toBeNull()
      expect(heard(plain.container)).toBe('1 tegen 1')
    })

    it.each([
      { against: 3, for: 4, home: true, outcome: 'win' },
      { against: 5, for: 4, home: true, outcome: 'loss' },
      { against: 3, for: 4, home: false, outcome: 'win' },
      { against: 5, for: 4, home: false, outcome: 'loss' },
      { against: 4, for: 4, home: true, outcome: 'draw' },
    ])(
      'colours a level score by the shoot-out, $for to $against for sc Heerenveen at home $home, as a $outcome',
      ({ against, for: goals, home, outcome }) => {
        const { container } = render(
          <Match {...cup} extraTime home={home} penaltiesAgainst={against} penaltiesFor={goals} />,
        )

        expect(score(container)?.className).toBe(`hf-match-score hf-match-${outcome}`)
      },
    )

    it('colours a win after extra time by the score, and a level score without a shoot-out neutral', () => {
      const { container, rerender } = render(<Match {...cup} extraTime goalsAgainst={1} goalsFor={2} />)

      expect(score(container)?.className).toBe('hf-match-score hf-match-win')

      rerender(<Match {...cup} extraTime />)

      expect(score(container)?.className).toBe('hf-match-score hf-match-draw')
    })

    it('does not pass extra time or the shoot-out on to the element', () => {
      const { container } = render(<Match {...cup} extraTime penaltiesAgainst={3} penaltiesFor={4} />)

      expect(container.firstElementChild?.hasAttribute('extratime')).toBe(false)
      expect(container.firstElementChild?.hasAttribute('penaltiesfor')).toBe(false)
    })

    it('needs both scores of a shoot-out, and has none for a match that is not played', () => {
      const half = (
        // @ts-expect-error A shoot-out has two scores.
        <Match
          competition="KNVB Beker"
          dateTime="2026-11-01"
          extraTime
          goalsAgainst={1}
          goalsFor={1}
          home
          opponent="Testdorp FC"
          penaltiesFor={4}
          round="Tweede ronde"
          status="played"
          time="zo 1 nov"
        />
      )
      const early = (
        // @ts-expect-error A match that is not played has no extra time.
        <Match
          competition="KNVB Beker"
          dateTime="2026-11-01"
          extraTime
          home
          opponent="Testdorp FC"
          round="Tweede ronde"
          status="scheduled"
          time="zo 1 nov"
        />
      )

      expect(half).toBeTruthy()
      expect(early).toBeTruthy()
    })
  })

  it('shows a goalless draw as 0–0', () => {
    const { container } = render(<Match {...played} goalsAgainst={0} goalsFor={0} />)

    expect(container.querySelector('.hf-match-score [aria-hidden="true"]')?.textContent).toBe('0–0')
  })

  it('has a dash between the clubs of a match that is not played, and no result', () => {
    const { container } = render(<Match {...scheduled} />)

    expect(container.querySelector('.hf-match-score')?.className).toContain('hf-match-versus')
    expect(container.querySelector('.hf-match-score [aria-hidden="true"]')?.textContent).toBe('–')
  })

  it('puts the time in a time element with the machine value', () => {
    render(<Match {...scheduled} />)
    const time = screen.getByText('zo 1 nov 14:30')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-11-01T13:30:00Z')
  })

  it('writes a weekend as it is given, with the first day for machines', () => {
    render(<Match {...scheduled} dateTime="2027-02-12" time="weekend 12–14 februari" />)
    const time = screen.getByText('weekend 12–14 februari')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2027-02-12')
  })

  it('says "Uitgesteld" for a postponed match, without a time', () => {
    const { container } = render(
      <Match competition="Eredivisie" home opponent="Demo Boys" round="Speelronde 5" status="postponed" />,
    )

    expect(container.querySelector('.hf-match-postponed')?.textContent).toBe('Uitgesteld')
    expect(container.querySelector('time')).toBeNull()
    expect(container.querySelector('.hf-match-when')?.textContent).toBe('Uitgesteld · Thuis')
  })

  describe('a match without a result', () => {
    it('says "Gegevens nog niet beschikbaar" as the last line and keeps the time and the dash', () => {
      const { container } = render(<Match {...scheduled} resultMissing />)

      expect(container.querySelector('.hf-match-missing')?.textContent).toBe('Gegevens nog niet beschikbaar')
      expect(container.querySelector('.hf-match-when + .hf-match-missing')).not.toBeNull()
      expect(container.querySelector('.hf-match-missing')?.nextElementSibling).toBeNull()
      expect(container.querySelector('time')?.textContent).toBe('zo 1 nov 14:30')
      expect(container.querySelector('.hf-match-versus')).not.toBeNull()
    })

    it('is plain text for a screen reader, in a paragraph with the other small lines', () => {
      const { container } = render(<Match {...scheduled} resultMissing />)
      const missing = container.querySelector('.hf-match-missing')

      expect(missing?.tagName).toBe('P')
      expect(missing?.getAttribute('aria-hidden')).toBeNull()
      expect(missing?.className).toMatch(/hf-meta/u)
    })

    it('says nothing without the property, and does not pass it on to the element', () => {
      const { container } = render(<Match {...scheduled} resultMissing={false} />)

      expect(container.querySelector('.hf-match-missing')).toBeNull()
      expect(container.firstElementChild?.hasAttribute('resultmissing')).toBe(false)
    })

    it('gives way to the result: a played match has no such line', () => {
      const { container } = render(<Match {...played} />)

      expect(container.querySelector('.hf-match-missing')).toBeNull()
      expect(textOf(container)).toContain('2–0')
    })
  })

  it('leaves out the stadium when it has none', () => {
    const { container } = render(<Match {...scheduled} stadium={null} />)

    expect(container.querySelector('.hf-match-when')?.textContent).toBe('zo 1 nov 14:30 · Uit')
  })

  it('marks our own club, and only that club', () => {
    const { container } = render(<Match {...scheduled} />)

    expect(container.querySelectorAll('.hf-match-own')).toHaveLength(1)
    expect(container.querySelector('.hf-match-own')?.textContent).toBe('sc Heerenveen')
  })

  it('has no link and no image: a match has no page of its own and no club badge', () => {
    const { container } = render(<Match {...played} />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(container.querySelector('img, svg, picture')).toBeNull()
  })

  it('shows names as text, not as HTML', () => {
    // A string in braces: JSX would turn the &amp; in an attribute into a & itself.
    const { container } = render(<Match {...scheduled} opponent={'<b>FC</b> &amp; Co'} stadium="<i>Park</i>" />)

    expect(textOf(container)).toContain('<b>FC</b> &amp; Co')
    expect(container.querySelector('b, i')).toBeNull()
  })

  it('hides the dots between the parts from a screen reader, and keeps the spaces around them', () => {
    const { container } = render(<Match {...scheduled} />)

    expect([...container.querySelectorAll('[aria-hidden="true"]')].map((dot) => dot.textContent)).toEqual([
      '·',
      '–',
      '·',
      '·',
    ])
    expect(container.querySelector('.hf-match-label')?.innerHTML).toContain(
      'Eredivisie <span aria-hidden="true">·</span> Speelronde',
    )
  })

  it('is a div, passes other props on and adds its own class to a given one', () => {
    const { container } = render(<Match {...scheduled} className="extra" id="een" />)

    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild?.className).toBe('hf-match extra')
    expect(container.firstElementChild?.id).toBe('een')
  })

  it('needs the goals of a played match and has none for another', () => {
    const base = { competition: 'Eredivisie', home: true, opponent: 'Testdorp FC', round: 'Speelronde 9' }
    const when = { dateTime: '2026-10-11', time: 'zo 11 okt' }
    // @ts-expect-error A played match without a result is no match.
    const withoutGoals = <Match {...base} {...when} status="played" />
    // @ts-expect-error A match that is not played has no result.
    const withGoals = <Match {...base} {...when} goalsAgainst={0} goalsFor={1} status="scheduled" />

    expect(withoutGoals).toBeTruthy()
    expect(withGoals).toBeTruthy()
  })
})

describe('the scorers', () => {
  const away = { ...played, goalsAgainst: 1, goalsFor: 2, home: false, opponent: 'FC Twente' } as const
  const goals = [
    { minute: 34, ours: true, player: 'Trenskow' },
    { minute: 45, ours: true, player: 'Vente', stoppageMinutes: 1 },
    { minute: 80, ours: false, player: 'Vennegoor of Hesselink' },
  ]

  /** What a sighted visitor reads: the text without the words for a screen reader. */
  const seen = (element: Element | null) => {
    const copy = element?.cloneNode(true) as HTMLElement

    copy.querySelectorAll('.hf-visually-hidden').forEach((hidden) => hidden.remove())

    return textOf(copy)
  }
  /** What a screen reader reads: the text without what is hidden from it. */
  const heard = (element: Element | null) => {
    const copy = element?.cloneNode(true) as HTMLElement

    copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove())

    return textOf(copy)
  }

  it('shows one line between the clubs and the time, in the order given, without the name of a club', () => {
    const { container } = render(<Match {...away} goals={goals} />)
    const line = container.querySelector('.hf-match-goals')

    expect(container.querySelectorAll('.hf-match-goals')).toHaveLength(1)
    expect(seen(line)).toBe('34’ Trenskow, 45’+1 Vente, 80’ Vennegoor of Hesselink')
    expect(line?.previousElementSibling?.className).toBe('hf-match-clubs')
    expect(line?.nextElementSibling?.className).toContain('hf-match-when')
  })

  it('keeps the minute with the name by a space that does not break', () => {
    const { container } = render(<Match {...away} goals={goals} />)

    expect(container.querySelector('.hf-match-goal')?.textContent).toContain(' Trenskow')
  })

  it('gives the minute the colour of the club: green for sc Heerenveen, red for the opponent', () => {
    const { container } = render(<Match {...away} goals={goals} />)
    const minutes = [...container.querySelectorAll('.hf-match-goal > span:first-child')]

    expect(minutes.map((minute) => minute.className)).toEqual([
      'hf-match-goal-ours',
      'hf-match-goal-ours',
      'hf-match-goal-theirs',
    ])
  })

  it('has a screen reader hear each goal in full, with the club and without the apostrophe', () => {
    const { container } = render(<Match {...away} goals={goals} />)

    expect(heard(container.querySelector('.hf-match-goals'))).toBe(
      'minuut 34, Trenskow, sc Heerenveen; minuut 45 plus 1, Vente, sc Heerenveen; minuut 80, Vennegoor of Hesselink, FC Twente',
    )
  })

  it('writes e.d. and pen. after the name, as abbreviations with the full words', () => {
    const { container } = render(
      <Match
        {...played}
        goals={[
          { minute: 7, ours: true, ownGoal: true, player: 'Klaverboer' },
          { minute: 23, ours: false, penalty: true, player: 'Chery' },
        ]}
      />,
    )
    const line = container.querySelector('.hf-match-goals')

    expect(seen(line)).toBe('7’ Klaverboer e.d., 23’ Chery pen.')
    expect(
      [...container.querySelectorAll('.hf-match-goals abbr')].map((abbr) => [
        abbr.textContent,
        abbr.getAttribute('title'),
      ]),
    ).toEqual([
      ['e.d.', 'Eigen doelpunt'],
      ['pen.', 'Penalty'],
    ])
    expect(heard(line)).toBe(
      'minuut 7, Klaverboer, eigen doelpunt, sc Heerenveen; minuut 23, Chery, penalty, Testdorp FC',
    )
  })

  it('shows two goals of one player as two', () => {
    const { container } = render(
      <Match
        {...played}
        goals={[
          { minute: 12, ours: true, player: 'Proefman' },
          { minute: 77, ours: true, player: 'Proefman' },
        ]}
      />,
    )

    expect(seen(container.querySelector('.hf-match-goals'))).toBe('12’ Proefman, 77’ Proefman')
  })

  it('shows a minute in extra time as it is', () => {
    const { container } = render(
      <Match {...played} extraTime goals={[{ minute: 105, ours: true, player: 'Proefman' }]} />,
    )

    expect(seen(container.querySelector('.hf-match-goals'))).toBe('105’ Proefman')
  })

  it.each([
    ['no goals given', undefined],
    ['an empty list', []],
  ])('shows no line for scorers with %s', (_name, none) => {
    const { container } = render(<Match {...played} goals={none} />)

    expect(container.querySelector('.hf-match-goals')).toBeNull()
  })

  it('shows names as text, not as HTML', () => {
    const { container } = render(
      <Match {...played} goals={[{ minute: 3, ours: true, player: '<b>Speler</b> &amp; Co' }]} />,
    )

    expect(seen(container.querySelector('.hf-match-goals'))).toBe('3’ <b>Speler</b> &amp; Co')
    expect(container.querySelector('.hf-match-goals b')).toBeNull()
  })

  it('has no link and no image in the line', () => {
    const { container } = render(<Match {...played} goals={goals} />)

    expect(container.querySelector('.hf-match-goals a, .hf-match-goals img')).toBeNull()
  })

  it('does not pass the goals on to the element', () => {
    const { container } = render(<Match {...played} goals={goals} />)

    expect(container.firstElementChild?.hasAttribute('goals')).toBe(false)
  })

  it('has scorers only for a played match', () => {
    // @ts-expect-error A match that is not played has no goals.
    const planned = <Match {...scheduled} goals={goals} />

    expect(planned).toBeTruthy()
  })
})
