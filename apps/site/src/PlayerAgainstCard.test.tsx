import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { AgainstMatch, PlayerAgainst } from './player-against'

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

const render = (against: PlayerAgainst, href: (match: AgainstMatch) => string | undefined = () => undefined) =>
  withoutIcons(renderToStaticMarkup(<PlayerAgainstCard against={against} matchHref={href} name="Test Speler" />))

describe('againstSummary', () => {
  it('counts the matches and the goals, with the singular for one', () => {
    expect(againstSummary([match(1), match(2, { goals: 0 }), match(3, { goals: 0 })])).toBe('3 wedstrijden, 1 doelpunt')
    expect(againstSummary([match(1, { goals: 0 })])).toBe('1 wedstrijd, 0 doelpunten')
  })
})

describe('the card Tegen ons', () => {
  it('shows a table for each group that has a match, with the headings and the line of figures', () => {
    const html = render({
      after: [match(3, { goals: 2 })],
      before: [match(1), match(2, { goals: 0 })],
      between: [],
    })

    expect(html).toMatch(/<h2[^>]*>Tegen ons<\/h2>/)
    expect(html).toContain('Voor zijn tijd bij sc Heerenveen')
    expect(html).toContain('Na zijn tijd bij sc Heerenveen')
    expect(html).not.toContain('Tussendoor')
    expect(html).toContain('2 wedstrijden, 1 doelpunt')
    expect(html).toContain('1 wedstrijd, 2 doelpunten')
    expect(html.match(/<table/g)).toHaveLength(2)
    expect(html).toContain(againstNote)
  })

  it('shows Tussendoor only when it has a match', () => {
    expect(render({ after: [], before: [], between: [match(1)] })).toContain('Tussendoor')
  })

  it('has a caption, column headers and a link that says which match it is, with the club, the score and the figures', () => {
    const html = render(
      {
        after: [],
        before: [match(1), match(2, { day: '2008-02-02', goalsAgainst: 0, goalsFor: 2, home: false })],
        between: [],
      },
      ({ id }) => `/wedstrijden/${id}`,
    )

    expect(html).toMatch(/<caption[^>]*>De wedstrijden van Test Speler tegen sc Heerenveen, voor zijn tijd/)
    expect(html).toMatch(/<th scope="col">Wedstrijd<\/th>/)
    expect(html).toContain('<a href="/wedstrijden/1">sc Heerenveen – Ajax, 3 november 2007</a>')
    expect(html).toContain('Ajax – sc Heerenveen, 2 februari 2008')
    expect(html).toContain('thuis 3–1')
    expect(html).toContain('uit 0–2')
  })

  it('shows the match without a link when the address is not known', () => {
    const html = render({ after: [], before: [match(1)], between: [] })

    expect(html).toContain('sc Heerenveen – Ajax, 3 november 2007')
    expect(html).not.toContain('<a href')
  })
})
