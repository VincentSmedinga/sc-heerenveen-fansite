import { predictionPoints } from '@fansite/shared/prediction-points'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { ScoredMatch, ScoredPrediction } from '#src/fans/prediction-results'

import { CrowdCard, PointsCard, ScoringCard, YourPredictionsCard } from './PointsCards'

const now = new Date('2026-11-22T10:00:00Z')
const s = (home: number, away: number) => ({ away, home })
const result = { fullTime: s(2, 1), halfTime: s(1, 0) }

const item = (id: number, extra: Partial<ScoredMatch> = {}, full: [number, number] = [3, 1]): ScoredPrediction => ({
  guess: { fullTime: s(...full), halfTime: s(1, 1) },
  match: {
    clubSlug: 'fc-twente',
    competition: 'Eredivisie',
    dateText: null,
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    id,
    kickoffAt: new Date('2026-11-21T19:45:00Z'),
    matchDate: `2026-11-${String(10 + id).padStart(2, '0')}`,
    opponent: 'FC Twente',
    round: `Speelronde ${id}`,
    season: '2026/27',
    state: 'played',
    ...extra,
  },
  points: predictionPoints({ fullTime: s(...full), halfTime: s(1, 1) }, result),
  result,
})

const list = (items: readonly ScoredPrediction[], all = false) =>
  renderToStaticMarkup(<YourPredictionsCard all={all} items={items} now={now} />)

describe('the card "Jouw voorspellingen"', () => {
  it('says there is nothing yet, without a list', () => {
    const html = list([])

    expect(html).toContain('Nog niets. Doe mee aan de Prognose.')
    expect(html).not.toContain('<ul')
  })

  it('has the number of predictions and the points in its head, and a row for each', () => {
    const html = list([item(2), item(1)])

    expect(html).toContain('2 voorspellingen · 34 punten')
    expect(html.match(/hf-prediction-list-item/g)).toHaveLength(2)
    expect(html).not.toContain('Alle ')
  })

  it('shows the last five and a link to all of them with the real number', () => {
    const items = [7, 6, 5, 4, 3, 2, 1].map((id) => item(id))
    const html = list(items)

    expect(html.match(/hf-prediction-list-item/g)).toHaveLength(5)
    expect(html).toContain('Alle 7 voorspellingen')
    expect(html).toContain('href="/fans/prognose?alle=ja#jouw-voorspellingen"')
    expect(list(items, true).match(/hf-prediction-list-item/g)).toHaveLength(7)
    expect(list(items, true)).not.toContain('Alle 7 voorspellingen')
  })

  it('leaves a match that was called off out of the number and the points, and says so', () => {
    const off = item(3, { goalsAgainst: null, goalsFor: null, state: 'cancelled' })
    const html = list([off, item(1)])

    expect(html).toContain('1 voorspelling · 17 punten')
    expect(html).toContain('Afgelast')
  })
})

describe('the card with the points of a match', () => {
  const card = (extra: Partial<ScoredPrediction> = {}) =>
    renderToStaticMarkup(<PointsCard item={{ ...item(1), ...extra }} now={now} />)

  it('has the table with the half-time row, the full-time row, the reasons and the total', () => {
    const html = card()

    expect(html).toContain('<caption')
    expect(html).toContain('Hoe je punten tellen')
    expect(html).toContain('Rust')
    expect(html).toContain('Eind')
    expect(html).toContain('Goals van sc Heerenveen goed 2')
    expect(html).toContain('Goede uitslag 10, goals van FC Twente goed 5')
    expect(html).toContain('Totaal')
    expect(html).toContain('17')
  })

  it('shows only the half-time row while the match is being played, and says the rest comes later', () => {
    const html = card({
      match: item(1, { goalsAgainst: null, goalsFor: null, state: 'live' }).match,
      points: predictionPoints({ fullTime: s(3, 1), halfTime: s(1, 1) }, { halfTime: s(1, 0) }),
      result: { halfTime: s(1, 0) },
    })

    expect(html).toContain('Rust')
    expect(html).not.toContain('Eind')
    expect(html).toContain('De punten voor de eindstand komen na de wedstrijd.')
    expect(html).not.toContain('Totaal')
  })
})

describe('the card "Zo deed iedereen het"', () => {
  it('has the exact scores, the outcomes and the average from five predictions', () => {
    const html = renderToStaticMarkup(<CrowdCard figures={{ average: 18.4, count: 54, exact: 6, outcome: 31 }} />)

    expect(html).toContain('6 supporters hadden de eindstand precies goed.')
    expect(html).toContain('31 supporters hadden de uitslag goed.')
    expect(html).toContain('Gemiddeld 18,4 punten, van 54 voorspellingen.')
    expect(html).toContain('hf-card-soft')
  })

  it('says only how many under five, and no average', () => {
    const html = renderToStaticMarkup(<CrowdCard figures={{ average: undefined, count: 3, exact: 1, outcome: 2 }} />)

    expect(html).toContain('3 supporters voorspelden deze wedstrijd.')
    expect(html).not.toContain('Gemiddeld')
    expect(html).not.toContain('precies goed')
  })
})

describe('the card "Punten"', () => {
  it('shows the scoring from the numbers that the sum uses', () => {
    const html = renderToStaticMarkup(<ScoringCard />)

    for (const number of ['20', '10', '5', '2']) {
      expect(html).toContain(`>${number}<`)
    }

    expect(html).toContain('De telling van de oude Fansite. Hoogstens 30 punten per wedstrijd.')
    expect(html).toContain('hf-card-soft')
  })
})
