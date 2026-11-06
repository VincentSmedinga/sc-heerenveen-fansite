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

  it('tells two rows of one person apart by the period in the header, which is unique', () => {
    const html = renderToStaticMarkup(
      <CoachResultsCard
        choice="all"
        results={[result({ period: '2015 – 2016' }), result({ period: '2020 – 2021' })]}
        since="2010/11"
      />,
    )

    expect(html).toContain('<th scope="row">Foppe de Haan (2015 – 2016)</th>')
    expect(html).toContain('<th scope="row">Foppe de Haan (2020 – 2021)</th>')
  })

  it('writes "interim" in the header of a person who stood in', () => {
    const html = renderToStaticMarkup(
      <CoachResultsCard choice="league" results={[result({ interim: true })]} since="2010/11" />,
    )

    expect(html).toContain('<th scope="row">Foppe de Haan (interim, 2015 \u2013 2016)</th>')
    expect(html).toContain('in de Eredivisie')
  })
})
