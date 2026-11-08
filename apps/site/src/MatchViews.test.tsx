import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { imageCredit, MatchLine, MatchLines, playedLine, SourceCredit } from './MatchViews'
import { OpponentsCredit } from './OpponentViews'

const textOf = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(element)
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

const page = { kind: 'programme', readAt: new Date('2026-10-25T12:05:00Z'), title: 'Eredivisie 2026/27' } as const
const seasonPage = { ...page, season: '1996/97' }

describe('imageCredit', () => {
  it('has no button for a card without facts', () => {
    expect(imageCredit(false)).toBeUndefined()
    expect(imageCredit(false, '2025/26')).toBeUndefined()
  })

  it('gives the credit of Wikipedia for a card with facts, and no season for the current season', () => {
    expect(imageCredit(true)).toMatchObject({ season: undefined })
    expect(imageCredit(true)?.source).toBeDefined()
  })

  it('gives the season of a card of a season that is over, for the image and its file name', () => {
    expect(imageCredit(true, '2025/26')).toMatchObject({ season: '2025/26' })
  })
})

describe('the credit under the image of a card', () => {
  it('names the source of the matches the card counts: Wikipedia, the archive or both', () => {
    expect(textOf(imageCredit(true)?.source)).toBe('Gegevens van Wikipedia')
    expect(textOf(imageCredit(true, undefined, [{ dataSource: 'wikipedia' }])?.source)).toBe('Gegevens van Wikipedia')
    expect(textOf(imageCredit(true, undefined, [{ dataSource: 'oude-fansite' }])?.source)).toBe(
      'Gegevens van het archief van de oude sc Heerenveen Fansite',
    )
    expect(textOf(imageCredit(true, undefined, 'both')?.source)).toBe(
      'Gegevens van Wikipedia en het archief van de oude sc Heerenveen Fansite',
    )
  })
})

describe('SourceCredit', () => {
  const credit = (props: Partial<Parameters<typeof SourceCredit>[0]>) =>
    textOf(<SourceCredit edited={false} pages={[]} season="1996/97" {...props} />)

  it('names the archive alone for old matches and no page of Wikipedia, in a line that is always there', () => {
    const html = renderToStaticMarkup(<SourceCredit edited={false} pages={[]} season="1996/97" source="archive" />)

    expect(textOf(<SourceCredit edited={false} pages={[]} season="1996/97" source="archive" />)).toBe(
      'Bron: het archief van de oude sc Heerenveen Fansite',
    )
    expect(html).not.toContain('<details')
    expect(html).not.toContain('Wikipedia')
  })

  it('names Wikipedia and the archive when the matches come from both, or a page of Wikipedia was read', () => {
    expect(credit({ pages: [page], source: 'both' })).toContain(
      'Bron: Wikipedia en het archief van de oude sc Heerenveen Fansite',
    )
    // The league table comes from Wikipedia, so it is named even when all matches are old.
    expect(credit({ pages: [page], source: 'archive' })).toContain(
      'Bron: Wikipedia en het archief van de oude sc Heerenveen Fansite',
    )
  })

  it('names Wikipedia alone when the matches come from it, as it always did', () => {
    expect(credit({ pages: [page] })).toContain('Bron: Wikipedia Licentie')
    expect(credit({ pages: [page] })).not.toContain('archief')
  })

  it('is nothing for Wikipedia without a page, as it always was', () => {
    expect(credit({})).toBe('')
  })
})

describe('OpponentsCredit', () => {
  const credit = (props: Partial<Parameters<typeof OpponentsCredit>[0]>) =>
    textOf(<OpponentsCredit edited={false} pages={[]} seasons={['1996/97']} {...props} />)

  it('names the archive alone when no season has a page of Wikipedia', () => {
    expect(credit({ source: 'archive' })).toBe('Bron: het archief van de oude sc Heerenveen Fansite')
  })

  it('names both when seasons have a page of Wikipedia and some matches are old', () => {
    expect(credit({ pages: [seasonPage], source: 'both' })).toContain(
      'Bron: Wikipedia en het archief van de oude sc Heerenveen Fansite',
    )
  })

  it('is nothing for Wikipedia without a page', () => {
    expect(credit({})).toBe('')
  })
})

describe('playedLine', () => {
  it('says how many matches the card counts, without a base or a season', () => {
    expect(playedLine(40)).toBe('Alle 40 gespeelde wedstrijden')
    expect(playedLine(2)).toBe('Alle 2 gespeelde wedstrijden')
    expect(playedLine(1)).toBe('1 gespeelde wedstrijd')
  })
})

describe('the line of a match that is being played', () => {
  const now = new Date('2026-10-30T13:40:00Z')
  const live: PublicMatch = {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    attendance: null,
    competition: 'Eredivisie',
    dataSource: 'wikipedia',
    dateText: null,
    extraTime: false,
    goals: [],
    goalsAgainst: null,
    goalsFor: null,
    home: true,
    // More than two hours ago: without a report the line says the data is not there.
    kickoffAt: new Date('2026-10-30T10:00:00Z'),
    matchDate: '2026-10-30',
    note: null,
    opponent: 'Testdorp FC',
    penaltiesAgainst: null,
    penaltiesFor: null,
    referee: null,
    round: 'Speelronde 12',
    stadium: null,
    status: 'scheduled',
  }
  const address = '/wedstrijden/2026-27/2026-10-30-testdorp-fc'

  it('links to its page with the text Live in place of the result, and no stand', () => {
    const html = renderToStaticMarkup(<MatchLine live match={live} now={now} reportHref={address} />)

    expect(html).toContain(`href="${address}"`)
    expect(textOf(<MatchLine live match={live} now={now} reportHref={address} />)).toContain('Live verslag van')
    expect(html).not.toContain('Het verslag')
    expect(html).not.toContain('Gegevens nog niet beschikbaar')
    expect(html).not.toMatch(/\d–\d/u)
  })

  it('keeps the line plain, with the message about the data, when the match has no page', () => {
    const html = renderToStaticMarkup(<MatchLine match={live} now={now} />)

    expect(html).not.toContain('<a')
    expect(html).toContain('Gegevens nog niet beschikbaar')
  })

  it('links a match before its kick-off with the report to its page as "Het verslag", not as Live', () => {
    const upcoming = { ...live, kickoffAt: new Date('2026-10-30T18:30:00Z') }
    const html = renderToStaticMarkup(<MatchLine match={upcoming} now={now} reportHref={address} />)

    expect(html).toContain('Het verslag')
    expect(html).not.toContain('>Live<')
  })

  it('says Live for the matches of the set only, in a list', () => {
    const other = { ...live, opponent: 'Andere Club', round: 'Speelronde 11' }
    const html = renderToStaticMarkup(
      <MatchLines
        liveReports={new Set(['Eredivisie|Speelronde 12'])}
        matches={[other, live]}
        now={now}
        reportAddresses={
          new Map([
            ['Eredivisie|Speelronde 11', '/wedstrijden/2026-27/2026-10-29-andere-club'],
            ['Eredivisie|Speelronde 12', address],
          ])
        }
      />,
    )

    expect(html.match(/>Live</g)).toHaveLength(1)
    expect(html.match(/Het verslag/g)).toHaveLength(1)
  })
})
