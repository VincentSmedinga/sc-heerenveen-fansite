import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { CoachResult } from './coachResults'

import { CoachResultsCard } from './CoachResultsCard'

const result = (extra: Partial<CoachResult>): CoachResult => ({
  drawn: 1,
  interim: false,
  lost: 1,
  name: 'Foppe de Haan',
  period: '2015 – 2016',
  played: 3,
  pointsPerMatch: '1,33',
  won: 1,
  ...extra,
})

describe('CoachResultsCard', () => {
  it('is nothing without a coach', () => {
    expect(renderToStaticMarkup(<CoachResultsCard choice="all" results={[]} since="2010/11" />)).toBe('')
  })

  it('shows the name with the surname in the stronger weight, the matches and points behind it, and the period on a line under it', () => {
    const html = renderToStaticMarkup(
      <CoachResultsCard choice="all" results={[result({ name: 'Kees van Wonderen' })]} since="2010/11" />,
    )

    expect(html).toContain(
      '<th scope="row"><span class="hf-player-name"><span class="hf-player-name-given">Kees</span> <span class="hf-player-name-surname">van Wonderen</span> <span class="hf-player-name-meta">3 wedstrijden, 1,33 punten per wedstrijd</span></span><span class="hf-data-table-secondary">2015 \u2013 2016</span></th>',
    )
  })

  it('tells two periods of one person apart, because the plain header is the key of the row', () => {
    const html = renderToStaticMarkup(
      <CoachResultsCard
        choice="all"
        results={[result({ period: '2015 \u2013 2016' }), result({ period: '2020 \u2013 2021' })]}
        since="2010/11"
      />,
    )

    expect(html.match(/hf-data-table-secondary">(\d{4} \u2013 \d{4})</g)).toHaveLength(2)
  })

  it('puts "interim" in front of the period of a person who stood in', () => {
    const html = renderToStaticMarkup(
      <CoachResultsCard choice="league" results={[result({ interim: true })]} since="2010/11" />,
    )

    expect(html).toContain('<span class="hf-data-table-secondary">interim \u00b7 2015 \u2013 2016</span>')
    expect(html).toContain('in de Eredivisie')
  })

  it('says how many matches and how many points per match in the line behind the name, one match as "1 wedstrijd"', () => {
    const line = (extra: Partial<CoachResult>) =>
      /hf-player-name-meta">([^<]*)</.exec(
        renderToStaticMarkup(<CoachResultsCard choice="all" results={[result(extra)]} since="2010/11" />),
      )?.[1]

    expect(line({ played: 34, pointsPerMatch: '1,85' })).toBe('34 wedstrijden, 1,85 punten per wedstrijd')
    expect(line({ played: 1, pointsPerMatch: '3,00' })).toBe('1 wedstrijd, 3,00 punten per wedstrijd')
    expect(line({ played: 2, pointsPerMatch: '1,00' })).toBe('2 wedstrijden, 1,00 punt per wedstrijd')
  })
})
