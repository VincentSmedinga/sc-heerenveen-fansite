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
  startDate: '2015-10-21',
  won: 1,
  ...extra,
})

describe('CoachResultsCard', () => {
  it('is nothing without a coach', () => {
    expect(renderToStaticMarkup(<CoachResultsCard choice="all" results={[]} since="2010/11" />)).toBe('')
  })

  it('tells two rows of one person apart, because a row header is unique', () => {
    const html = renderToStaticMarkup(
      <CoachResultsCard
        choice="all"
        results={[result({ period: '2015 – 2016' }), result({ period: '2020 – 2021', startDate: '2020-07-01' })]}
        since="2010/11"
      />,
    )

    expect(html).toContain('<th scope="row">Foppe de Haan, 2015 – 2016</th>')
    expect(html).toContain('<th scope="row">Foppe de Haan, 2020 – 2021</th>')
  })

  it('writes the name of a person who stood in with "(interim)"', () => {
    const html = renderToStaticMarkup(
      <CoachResultsCard choice="league" results={[result({ interim: true })]} since="2010/11" />,
    )

    expect(html).toContain('<th scope="row">Foppe de Haan (interim)</th>')
    expect(html).toContain('in de Eredivisie')
  })
})
