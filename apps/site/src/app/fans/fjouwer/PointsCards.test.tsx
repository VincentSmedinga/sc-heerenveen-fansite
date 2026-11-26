import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { FourPoints, MatchStanding, PointsMatch } from '#src/fans/fjouwer-points'

import { pointsText } from '#src/fans/fjouwer-form'

import { EarlierMatchesCard, LastMatchCard, ScoringCard, scoringRows } from './PointsCards'

// Read with the morning of Monday 23 November 2026 (Dutch time) as now.
const now = new Date('2026-11-23T10:00:00Z')

const match = (id: number, more: Partial<PointsMatch> = {}): PointsMatch => ({
  clubSlug: 'fc-groningen',
  competition: 'Eredivisie',
  dateText: null,
  goalsAgainst: 1,
  goalsFor: 2,
  home: false,
  id,
  kickoffAt: new Date('2026-11-21T19:00:00Z'),
  matchDate: '2026-11-21',
  opponent: 'FC Groningen',
  round: 'Speelronde 14',
  season: '2026/27',
  status: 'played',
  ...more,
})

const points = (total: number) => ({ lines: [], total })

const finished = (id: number, total = 40, more: Partial<PointsMatch> = {}): FourPoints => ({
  match: match(id, more),
  names: ['Noppert', 'Hilgers', 'Proper', 'Vente'],
  ready: true,
  rows: [
    { counted: true, name: 'Andries Noppert', points: points(5), summary: '90 min, tegengoal', surname: 'Noppert' },
    { counted: true, name: 'Mees Hilgers', points: points(-3), summary: '30 min, rood', surname: 'Hilgers' },
    {
      counted: false,
      name: 'Dirk Proper',
      points: points(0),
      summary: 'Telde niet mee: al 10 keer gekozen',
      surname: 'Proper',
    },
    { counted: true, name: 'Dylan Vente', points: points(22), summary: '90 min, 2 goals, geel', surname: 'Vente' },
  ],
  total,
})

const waiting = (id: number): FourPoints => ({
  match: match(id, { goalsAgainst: null, goalsFor: null, status: 'scheduled' }),
  names: ['Noppert', 'Hilgers', 'Proper', 'Vente'],
  ready: false,
  rows: [],
  total: undefined,
})

const standing: MatchStanding = { counted: 87, places: new Map([[5, { place: 2, points: 40 }]]) }

const render = (item: FourPoints, more: Partial<{ standing: MatchStanding }> = {}) =>
  renderToStaticMarkup(<LastMatchCard item={item} now={now} standing={standing} supporterId={5} {...more} />)

describe('the card with the points of the last match', () => {
  it('has the heading, the match with its score, the key figures and the table of the four', () => {
    const html = render(finished(7))

    expect(html).toMatch(/<h2[^>]*>Je punten<\/h2>/)
    expect(html).toContain('FC Groningen')
    expect(html).toContain('>40<')
    expect(html).toContain('2e')
    expect(html).toContain('van 87 bij deze wedstrijd')
    expect(html).toContain('Jouw vier')
    expect(html).toContain('<th')
    expect(html).toContain('scope="col"')
    expect(html).toContain('Wat er gebeurde')
    expect(html).toContain('90 min, 2 goals, geel')
    expect(html).toContain('Totaal')
  })

  it('writes a negative number with a real minus sign, and says why a player did not count', () => {
    const html = render(finished(7))

    expect(html).toContain('−3')
    expect(html).not.toContain('>-3<')
    expect(html).toContain('Telde niet mee: al 10 keer gekozen')
  })

  it('has the legend of the points column and the line about the report', () => {
    const html = render(finished(7))

    expect(html).toContain('hf-table-legend')
    expect(html).toContain('punten')
    expect(html).toContain('Uit het verslag van de redactie. Een gecorrigeerd verslag corrigeert je punten.')
  })

  it('has the watermark of the game, like every card of a game', () => {
    expect(render(finished(7))).toContain('hf-card-game-fjouwer')
  })

  it('shows only the names and a sentence while the report is not finished', () => {
    const html = render(waiting(7))

    expect(html).toContain('Jouw vier: Noppert, Hilgers, Proper, Vente.')
    expect(html).toContain('De punten staan er als het verslag af is.')
    expect(html).not.toContain('<table')
    expect(html).not.toContain('hf-key-figures')
  })

  it('has no place when the supporter has none', () => {
    const html = render(finished(7), { standing: { counted: 87, places: new Map() } })

    expect(html).toContain('hf-key-figures')
    expect(html).not.toContain('van 87')
  })
})

describe('the card Eerdere wedstrijden', () => {
  const many = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      finished(10 + index, 10 + index, { matchDate: `2026-11-${String(20 - index).padStart(2, '0')}` }),
    )

  it('has no card without an earlier match with a finished report', () => {
    expect(renderToStaticMarkup(<EarlierMatchesCard items={[]} now={now} />)).toBe('')
    expect(renderToStaticMarkup(<EarlierMatchesCard items={[waiting(1)]} now={now} />)).toBe('')
  })

  it('shows a row for each match with the clubs, the score, the four and the points', () => {
    const html = renderToStaticMarkup(<EarlierMatchesCard items={many(2)} now={now} />)

    expect(html).toMatch(/<h2[^>]*>Eerdere wedstrijden<\/h2>/)
    expect(html).toContain('FC Groningen')
    expect(html).toContain('1–2')
    expect(html).toContain('Noppert, Hilgers, Proper, Vente')
    expect(html).toContain('>10<')
    expect(html).toContain('>11<')
    expect(html).not.toContain('<button')
  })

  it('has one list with every match, with the button "Toon alle N wedstrijden" after the first five', () => {
    const html = renderToStaticMarkup(<EarlierMatchesCard items={many(8)} now={now} />)

    expect(html.match(/<ul/g)).toHaveLength(1)
    expect(html.split('<li class="hf-prediction-list-item"').length - 1).toBe(8)
    expect(html).toContain('nth-child(n + 6)')
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>Toon alle 8 wedstrijden<\/button>/)
    expect(html).not.toContain('<details')
  })
})

describe('the card Punten', () => {
  it('shows the scoring from the numbers that the sum uses, with real minus signs', () => {
    const html = renderToStaticMarkup(<ScoringCard />)

    expect(html).toMatch(/<h2[^>]*>Punten<\/h2>/)
    expect(scoringRows).toHaveLength(10)
    expect(html).toContain('Gespeeld, vanaf 60 minuten')
    expect(html).toContain('Doelpunt verdediger of doelman')
    expect(html).toContain('−3')
    expect(html).toContain('−8')
    expect(html).toContain('−5')
    expect(html).toContain('Het verslag van de redactie beslist wat een speler deed.')
  })

  it('links to the rules of Fjouwer with the name Spelregels', () => {
    const html = renderToStaticMarkup(<ScoringCard />)

    expect(html).toMatch(/href="\/fans\/spelregels#fjouwer"><span[^>]*>Spelregels/)
  })

  it('writes a real minus sign', () => {
    expect(pointsText(-5)).toBe('−5')
    expect(pointsText(0)).toBe('0')
    expect(pointsText(12)).toBe('12')
  })
})
