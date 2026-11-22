import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { PredictionMatch } from '#src/fans/prediction'

import { ClosedCard, NoMatchCard, OpenCard } from './PredictionCards'

vi.mock('./actions', () => ({ savePredictionAction: vi.fn() }))

// Read with the morning of Friday 20 November 2026 (Dutch time) as now.
const now = new Date('2026-11-20T10:00:00Z')

const match: PredictionMatch = {
  clubSlug: 'fc-twente',
  competition: 'Eredivisie',
  dateText: null,
  home: true,
  id: 7,
  kickoffAt: new Date('2026-11-21T15:45:00Z'),
  matchDate: '2026-11-21',
  opponent: 'FC Twente',
  round: 'Speelronde 14',
  season: '2026/27',
  status: 'scheduled',
}

const saved = { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' }

const open = (props: Partial<Parameters<typeof OpenCard>[0]> = {}) =>
  renderToStaticMarkup(
    <OpenCard heading="Volgende wedstrijd" id="kop" loggedIn match={match} now={now} saved={undefined} {...props} />,
  )

describe('the card of the match to predict', () => {
  it('has the heading, the Tag with the deadline and the match', () => {
    const html = open()

    expect(html).toMatch(/<h2[^>]*>Volgende wedstrijd<\/h2>/)
    expect(html).toMatch(/hf-tag-open[^>]*>Open tot za 16\.45</)
    expect(html).toContain('sc Heerenveen')
    expect(html).toContain('FC Twente')
    expect(html).toContain('hf-card-game-prognose')
  })

  it('has the form with the grid, in the order home and away, the note and the button', () => {
    const html = open()

    expect(html).toContain('Jouw voorspelling')
    expect(html.indexOf('sc Heerenveen')).toBeLessThan(html.lastIndexOf('FC Twente'))
    expect(html).toContain('Ruststand')
    expect(html).toContain('Eindstand')
    expect(html).toContain('Na 90 minuten plus blessuretijd, ook in de beker.')
    expect(html).toMatch(/<button[^>]*>Voorspelling opslaan<\/button>/)
    expect(html).not.toContain('Hoogstens 30 punten')
  })

  it('fills the form with an earlier prediction and offers the change', () => {
    const html = open({ saved })

    expect(html).toMatch(/<button[^>]*>Wijziging opslaan<\/button>/)
    expect(html).toMatch(/name="fullTimeHome"[^>]*value="2"|value="2"[^>]*name="fullTimeHome"/)
  })

  it('keeps the form of a match away from home in the order of the line', () => {
    const html = open({ match: { ...match, home: false } })

    expect(html.indexOf('FC Twente')).toBeLessThan(html.lastIndexOf('sc Heerenveen'))
  })

  it('gives a visitor the line about the points, the notice and the two buttons, and no grid', () => {
    const html = open({ loggedIn: false })

    expect(html).toContain('Hoogstens 30 punten per wedstrijd.')
    expect(html).toContain('Log in om te voorspellen. Nog geen account? Dat maak je in een minuut.')
    expect(html).toMatch(/action="\/fans\/inloggen"/)
    expect(html).toMatch(/name="terug"[^>]*value="\/fans\/prognose"|value="\/fans\/prognose"[^>]*name="terug"/)
    expect(html).toMatch(/action="\/fans\/aanmelden"/)
    expect(html).not.toContain('Ruststand')
  })

  it('keeps the form closed with a line why when the time of the kick-off is not known', () => {
    const html = open({ match: { ...match, kickoffAt: null } })

    expect(html).toContain('Zodra de aftrap bekend is, kun je hier voorspellen.')
    expect(html).toContain('Aftrap nog niet bekend')
    expect(html).not.toContain('Ruststand')
    expect(html).not.toContain('hf-tag-open')
  })

  it('puts the form of the match under a match that has begun behind the button Voorspellen', () => {
    const html = open({ heading: 'Daarna', inDisclosure: true })

    expect(html).toMatch(/<details[^>]*><summary[^>]*>[^]*Voorspellen[^]*<\/summary>[^]*Ruststand/)
  })

  it('puts the way in behind the button Voorspellen for a visitor', () => {
    const html = open({ inDisclosure: true, loggedIn: false })

    expect(html).toMatch(/<details[^>]*><summary[^>]*>[^]*Voorspellen[^]*<\/summary>[^]*Log in om te voorspellen/)
    expect(html).toContain('Hoogstens 30 punten per wedstrijd.')
  })
})

describe('the card of a match that has begun', () => {
  const closed = (props: Partial<Parameters<typeof ClosedCard>[0]> = {}) =>
    renderToStaticMarkup(
      <ClosedCard
        id="kop"
        loggedIn
        match={{ ...match, kickoffAt: new Date('2026-11-20T09:00:00Z') }}
        now={now}
        saved={saved}
        {...props}
      />,
    )

  it('says Gesloten, that the match began, and where to go', () => {
    const html = closed()

    expect(html).toMatch(/hf-tag-closed[^>]*>Gesloten</)
    expect(html).toContain('De wedstrijd is begonnen. Na de rust zie je je eerste punten.')
    expect(html).toContain('href="/wedstrijden/2026-27/2026-11-21-fc-twente"')
    expect(html).toContain('Naar de <span class="hf-icon-tail">wedstrijd')
  })

  it('shows the prediction as it was, without fields', () => {
    const html = closed()

    expect(html).toContain('Ruststand')
    expect(html).not.toContain('<input')
    expect(html).toMatch(/Ruststand, sc Heerenveen:[^]*1/)
  })

  it('says so when there was no prediction', () => {
    const html = closed({ saved: undefined })

    expect(html).toContain('Je hebt niet voorspeld.')
    expect(html).not.toContain('Ruststand')
  })

  it('shows the figures of everybody under the prediction, the same as on the page of the match', () => {
    const html = closed({
      crowd: {
        crowd: {
          count: 54,
          spread: { draws: 13, losses: 8, other: 0, scores: [{ count: 14, label: '2–1' }], wins: 33 },
        },
        formOpen: false,
        reveal: true,
      },
    })

    expect(html).toContain('54 fans voorspelden deze wedstrijd.')
    expect(html).toContain('Winst 33 · Gelijk 13 · Verlies 8')
    expect(html).toContain('Meest voorspelde eindstanden')
    expect(html.indexOf('Ruststand')).toBeLessThan(html.indexOf('Winst 33'))
    expect(html.indexOf('Winst 33')).toBeLessThan(html.indexOf('Naar de <span class="hf-icon-tail">wedstrijd'))
  })

  it('has no figures without a reading', () => {
    expect(closed()).not.toContain('voorspelden deze wedstrijd')
  })

  it('shows nothing about a prediction to a visitor', () => {
    const html = closed({ loggedIn: false })

    expect(html).not.toContain('Je hebt niet voorspeld.')
    expect(html).not.toContain('Ruststand')
  })
})

describe('the card without a match', () => {
  it('says that the next match is not known yet', () => {
    expect(renderToStaticMarkup(<NoMatchCard heading="Daarna" id="kop" />)).toContain(
      'De volgende wedstrijd is nog niet bekend.',
    )
  })
})
