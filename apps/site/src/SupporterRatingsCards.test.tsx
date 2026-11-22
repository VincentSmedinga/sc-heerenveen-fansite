import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { yearWinnersPath } from './fans-paths'
import { SeasonRankingCard, YearWinnersCard } from './SupporterRatingsCards'

const options = [
  { label: '2026/27', value: '2026-27' },
  { label: '2005/06', value: '2005-06' },
]

const card = (props: Partial<Parameters<typeof SeasonRankingCard>[0]> = {}) =>
  renderToStaticMarkup(
    <SeasonRankingCard
      action="/spelers/cijfers"
      fields={{}}
      oldSource={false}
      options={options}
      rows={[
        { average: 7.25, matches: 9, name: 'Speler A', place: 1, playerId: 1, ratings: 200 },
        { average: 7, matches: undefined, name: 'Speler B', place: 2, playerId: null, ratings: undefined },
      ]}
      season="2026/27"
      seasonOnly={false}
      value="2026-27"
      {...props}
    />,
  )

describe('the card Cijfers van supporters', () => {
  it('is a table with a caption, the places, the matches and the rating with a comma', () => {
    const html = card()

    expect(html).toContain('<caption')
    expect(html).toContain('Seizoen 2026/27')
    expect(html).toContain('Speler A')
    expect(html).toContain('7,3')
    expect(html).toContain('>9<')
    // A figure that we do not have is a dash, never a nought.
    expect(html).toContain('–')
    expect(html).toContain('Wedstrijden met cijfers')
  })

  it('says in the legend what W is and from how many matches a player stands there', () => {
    const html = card()

    expect(html).toContain('W: wedstrijden met 5 cijfers of meer.')
    expect(html).toContain('Een speler staat er vanaf 3 wedstrijden.')
    expect(html).not.toContain('alleen het seizoencijfer bekend')
  })

  it('says that a dash is a season of which only the season rating is known', () => {
    expect(card({ seasonOnly: true })).toContain('van dat seizoen is alleen het seizoencijfer bekend')
  })

  it('has the source line for an old season and none for the running one', () => {
    expect(card({ oldSource: true })).toContain('Cijfers van bezoekers van de Fansite, 2001 tot 2007.')
    expect(card()).not.toContain('Cijfers van bezoekers')
  })

  it('has the season picker and the link to the Uitblinkers of the year', () => {
    const html = card()

    expect(html).toContain('Seizoen kiezen')
    expect(html).toContain(`href="${yearWinnersPath}"`)
    expect(html).toContain('Uitblinker van het jaar')
  })

  it('says there are no ratings, instead of an empty table, for a season without a player', () => {
    const html = card({ rows: [] })

    expect(html).toContain('Dit seizoen zijn er nog geen cijfers.')
    expect(html).not.toContain('<table')
    expect(html).toContain(`href="${yearWinnersPath}"`)
  })
})

describe('the card Uitblinkers van het jaar', () => {
  const html = renderToStaticMarkup(
    <YearWinnersCard
      winners={[
        { average: undefined, name: undefined, season: '2026/27' },
        { average: 7.1, name: 'Speler A', season: '2005/06' },
        { average: undefined, name: 'Speler B', season: '1998/99' },
      ]}
    />,
  )

  it('is a table of the season, the player and the rating', () => {
    expect(html).toContain('<caption')
    expect(html).toContain('Seizoen')
    expect(html).toContain('Speler A')
    expect(html).toContain('7,1')
  })

  it('says "Na het seizoen" for the season that has no winner yet', () => {
    expect(html).toContain('Na het seizoen')
  })

  it('says where the old numbers come from', () => {
    expect(html).toContain('Tot 2006/07: cijfers van bezoekers van de oude Fansite.')
  })
})
