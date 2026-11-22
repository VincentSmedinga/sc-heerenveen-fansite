import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Ranking } from '#src/fans/prediction-ranking'

import { StandCard, standLegend, StandTable } from './StandCards'

const names = Array.from({ length: 60 }, (_, index) => `supporter${index + 1}`)
const ranking: Ranking = {
  counted: 61,
  matchCount: 13,
  rows: names.map((screenName, index) => ({
    average: 20 - index / 10,
    count: 13,
    // The two last rows share a place.
    place: index >= 58 ? 59 : index + 1,
    screenName,
    supporterId: index + 1,
    total: 300 - index,
  })),
}

describe('the table of the ranking', () => {
  it('is a table with a caption, short headers and a decimal comma', () => {
    const html = renderToStaticMarkup(
      <StandTable caption="Stand na 13 wedstrijden" ranking={ranking} supporterId={undefined} />,
    )

    expect(html).toContain('<table')
    expect(html).toContain('Stand na 13 wedstrijden')
    expect(html).toContain('>V<')
    expect(html).toContain('>Gem<')
    expect(html).toContain('>P<')
    expect(html).toContain('20,0')
    expect(html).toContain(standLegend)
  })

  it('shows fifty rows, and under them the real place of a supporter who stands lower', () => {
    const html = renderToStaticMarkup(<StandTable caption="Stand" ranking={ranking} supporterId={55} />)

    expect(html).toContain('supporter50')
    expect(html).not.toContain('supporter51<')
    expect(html).toContain('supporter55')
    expect(html).toContain('55')
    expect(html).toContain('Jij')
  })

  it('marks the own row with a word, not with colour alone, and only one row', () => {
    const html = renderToStaticMarkup(<StandTable caption="Stand" ranking={ranking} supporterId={3} />)

    expect(html.match(/Jij/g)).toHaveLength(1)
    expect(html).toContain('hf-data-table-highlight')
  })

  it('shows no row of the supporter who is not in the ranking', () => {
    const html = renderToStaticMarkup(<StandTable caption="Stand" ranking={ranking} supporterId={999} />)

    expect(html).not.toContain('Jij')
  })
})

describe('the card Stand', () => {
  it('shows the top five, the own row under them, and the link to the whole ranking', () => {
    const html = renderToStaticMarkup(<StandCard ranking={ranking} season="2026/27" supporterId={30} />)

    expect(html).toContain('Stand 2026/27')
    expect(html).toContain('supporter5')
    expect(html).not.toContain('supporter6<')
    expect(html).toContain('supporter30')
    expect(html).toContain('Jij')
    expect(html).toContain('href="/fans/prognose/stand"')
    expect(html).toContain('Hele stand')
    expect(html).toContain('hf-card-strong')
  })

  it('says so when the season has no ranking yet', () => {
    const html = renderToStaticMarkup(
      <StandCard ranking={{ counted: 0, matchCount: 0, rows: [] }} season="2026/27" supporterId={undefined} />,
    )

    expect(html).toContain('Nog geen stand dit seizoen.')
    expect(html).not.toContain('<table')
  })
})

describe('the link "Spelregels" under the table of the ranking (issue 1455)', () => {
  it('goes to the part of the Prognose on the page with the rules', () => {
    const html = renderToStaticMarkup(<StandTable caption="Stand" ranking={ranking} supporterId={undefined} />)

    expect(html).toContain('<a href="/fans/spelregels#prognose">Spelregels</a>')
  })
})
