import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { type FourRanking, rankingOf } from '#src/fans/fjouwer-ranking'

import { StandCard, standLegend, StandTable } from './StandCards'

const entries = Array.from({ length: 60 }, (_, index) => ({
  matches: 13,
  name: `fan${String(index + 1).padStart(2, '0')}`,
  supporterId: index + 1,
  // The two last fans share a place.
  total: index >= 58 ? 100 : 300 - index,
  visible: index !== 4,
}))
const ranking = rankingOf(entries, 13)

describe('the table of the ranking', () => {
  it('is a table with a caption, short headers and a legend', () => {
    const html = renderToStaticMarkup(<StandTable ranking={ranking} supporterId={undefined} />)

    expect(html).toContain('<table')
    expect(html).toContain('Stand na 13 wedstrijden')
    expect(html).toContain('>W<')
    expect(html).toContain('title="Punten"')
    expect(html).toContain(standLegend)
  })

  it('shows fifty rows, and under them the real place of a fan who stands lower', () => {
    const html = renderToStaticMarkup(<StandTable ranking={ranking} supporterId={57} />)

    expect(html).toContain('fan51')
    expect(html).not.toContain('fan52<')
    expect(html).toContain('fan57')
    expect(html).toContain('Jij')
  })

  it('shows the own row of a fan who left their name out, with the place that fits', () => {
    const html = renderToStaticMarkup(<StandTable ranking={ranking} supporterId={5} />)

    expect(ranking.rows.map((row) => row.screenName)).not.toContain('fan05')
    expect(html).toContain('fan05')
    expect(html.match(/Jij/g)).toHaveLength(1)
  })
})

describe('the card Stand', () => {
  it('shows the top five, the own row under them, and the link to the whole ranking', () => {
    const html = renderToStaticMarkup(<StandCard ranking={ranking} season="2026/27" supporterId={30} />)

    expect(html).toContain('Stand 2026/27')
    expect(html).toContain('fan06')
    expect(html).not.toContain('fan07<')
    expect(html).toContain('fan30')
    expect(html).toContain('href="/fans/fjouwer/stand"')
    expect(html).toContain('hf-card-strong')
  })

  it('says so when the season has no ranking yet', () => {
    const empty: FourRanking = { hidden: new Map(), matchCount: 0, rows: [] }
    const html = renderToStaticMarkup(<StandCard ranking={empty} season="2026/27" supporterId={undefined} />)

    expect(html).toContain('Nog geen stand dit seizoen.')
    expect(html).not.toContain('<table')
  })

  it('shows the own row of a fan who left their name out when nobody else is in the list', () => {
    const alone = rankingOf([{ matches: 1, name: 'Schuw', supporterId: 7, total: 20, visible: false }], 1)
    const html = renderToStaticMarkup(<StandCard ranking={alone} season="2026/27" supporterId={7} />)

    expect(html).toContain('Schuw')
    expect(html).not.toContain('Nog geen stand')
  })

  it('says there is no ranking yet to somebody else when only hidden names have points', () => {
    const alone = rankingOf([{ matches: 1, name: 'Schuw', supporterId: 7, total: 20, visible: false }], 1)
    const html = renderToStaticMarkup(<StandCard ranking={alone} season="2026/27" supporterId={8} />)

    expect(html).toContain('Nog geen stand dit seizoen.')
    expect(html).not.toContain('<table')
  })
})

describe('the link "Spelregels" under the table of the ranking (issue 1477)', () => {
  it('goes to the part of Fjouwer on the page with the rules', () => {
    const html = renderToStaticMarkup(<StandTable ranking={ranking} supporterId={undefined} />)

    expect(html).toContain('<a href="/fans/spelregels#fjouwer"><span class="hf-icon-tail">Spelregels<svg')
  })
})
