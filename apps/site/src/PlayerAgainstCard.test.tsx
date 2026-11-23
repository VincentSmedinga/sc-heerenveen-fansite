import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { AgainstMatch } from './player-against'
import type { AsideGoal } from './player-aside'
import type { CareerMatch } from './player-seasons'

import { againstNote, againstSummary, PlayerAgainstCard } from './PlayerAgainstCard'
import { withoutIcons } from './without-icons'

const match = (id: number, extra: Partial<AgainstMatch> = {}): AgainstMatch => ({
  club: 'Ajax',
  competition: 'Eredivisie',
  day: '2007-11-03',
  goals: 1,
  goalsAgainst: 1,
  goalsFor: 3,
  home: true,
  id,
  minutes: 90,
  round: String(id),
  season: '2007/08',
  ...extra,
})

const careerMatch: CareerMatch = {
  clubSlug: 'roda-test',
  competition: 'Eredivisie',
  goalsAgainst: 3,
  goalsFor: 1,
  home: true,
  id: 9,
  matchDate: '1997-05-08',
  opponent: 'Roda Test',
  round: '9',
  season: '1996/97',
}
const goals = {
  goals: [{ match: careerMatch, minute: 5, stoppage: undefined } satisfies AsideGoal],
  intro: 'Voor hij hier kwam, scoorde hij één keer tegen sc Heerenveen.',
}

const render = ({
  goalHref = () => undefined,
  href = () => undefined,
  ...props
}: {
  goalHref?: (match: CareerMatch) => string | undefined
  goals?: typeof goals
  href?: (match: AgainstMatch) => string | undefined
  matches?: AgainstMatch[]
}) =>
  withoutIcons(
    renderToStaticMarkup(
      <PlayerAgainstCard
        goalHref={goalHref}
        goals={props.goals}
        matches={props.matches}
        matchHref={href}
        name="Test Speler"
      />,
    ),
  )

describe('againstSummary', () => {
  it('counts the matches and the goals, with the singular for one', () => {
    expect(againstSummary([match(1), match(2, { goals: 0 }), match(3, { goals: 0 })])).toBe('3 wedstrijden, 1 doelpunt')
    expect(againstSummary([match(1, { goals: 0 })])).toBe('1 wedstrijd, 0 doelpunten')
  })
})

describe('the card Tegen ons', () => {
  it('is one card with one heading, the goals on top, the figures, and one table behind a Disclosure', () => {
    const html = render({ goals, matches: [match(1), match(2, { goals: 0 })] })

    expect(html.match(/<h2/g)).toHaveLength(1)
    expect(html).toMatch(/<h2[^>]*>Tegen ons<\/h2>/)
    expect(html).not.toContain('<h3')
    expect(html).toContain('Voor hij hier kwam, scoorde hij één keer tegen sc Heerenveen.')
    expect(html).toContain('sc Heerenveen – Roda Test 1–3')
    expect(html).toContain('Test Speler speelde 2 wedstrijden, 1 doelpunt tegen ons.')
    expect(html.match(/<details/g)).toHaveLength(1)
    expect(html.match(/<table/g)).toHaveLength(1)
    expect(html.indexOf('<table')).toBeGreaterThan(html.indexOf('<details'))
    expect(html.indexOf('Roda Test')).toBeLessThan(html.indexOf('<details'))
    expect(html).toContain(againstNote)
  })

  it('has a caption, column headers and a link that says which match it is, with the club, the score and the figures', () => {
    const html = render({
      href: ({ id }) => `/wedstrijden/${id}`,
      matches: [match(1), match(2, { day: '2008-02-02', goalsAgainst: 0, goalsFor: 2, home: false })],
    })

    expect(html).toMatch(/<caption[^>]*>De wedstrijden van Test Speler tegen sc Heerenveen, per club/)
    expect(html).toMatch(/<th scope="col">Wedstrijd<\/th>/)
    expect(html).toContain('<a href="/wedstrijden/1">sc Heerenveen – Ajax, 3 november 2007</a>')
    expect(html).toContain('Ajax – sc Heerenveen, 2 februari 2008')
    expect(html).toContain('thuis 3–1')
    expect(html).toContain('uit 0–2')
  })

  it('shows the match without a link when the address is not known', () => {
    const html = render({ matches: [match(1)] })

    expect(html).toContain('sc Heerenveen – Ajax, 3 november 2007')
    expect(html).not.toContain('<a href')
  })

  it('has only the goals, without a Disclosure, for a player without a match from the reports', () => {
    const html = render({ goalHref: () => '/wedstrijden/9', goals })

    expect(html).toContain('<a href="/wedstrijden/9">sc Heerenveen – Roda Test 1–3</a>')
    expect(html).not.toContain('<details')
    expect(html).not.toContain('<table')
  })
})
