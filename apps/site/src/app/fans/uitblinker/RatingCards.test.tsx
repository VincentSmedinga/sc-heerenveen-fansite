import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { RatingMatch, RatingPlayer } from '#src/fans/rating'

import { HowItWorksCard, JoinCard, NextMatchCard, OpenCard, SavedView, WaitingCard } from './RatingCards'

const now = new Date('2026-11-22T12:00:00Z')
const closesAt = new Date('2026-11-26T19:00:00Z')
const match: RatingMatch = {
  clubSlug: 'sparta-rotterdam',
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 3,
  home: true,
  id: 1,
  kickoffAt: new Date('2026-11-21T19:45:00Z'),
  matchDate: '2026-11-21',
  opponent: 'Sparta Rotterdam',
  round: 'Speelronde 14',
  season: '2026/27',
  status: 'played',
}
const next: RatingMatch = {
  ...match,
  goalsAgainst: null,
  goalsFor: null,
  home: true,
  id: 2,
  kickoffAt: new Date('2026-11-28T19:45:00Z'),
  matchDate: '2026-11-28',
  opponent: 'FC Twente',
  status: 'scheduled',
}
const players: RatingPlayer[] = [
  { appearanceId: 11, assist: false, goal: false, minutes: 90, name: 'Luca Oyen', position: 'doelman' },
  { appearanceId: 12, assist: false, goal: true, minutes: 75, name: 'Pim Spits', position: 'aanvaller' },
]

describe('the card with the form', () => {
  const html = renderToStaticMarkup(
    <OpenCard closesAt={closesAt} match={match} now={now}>
      <p>FORM</p>
    </OpenCard>,
  )

  it('is a card of the game with a heading of level 2, the green tag and the match', () => {
    expect(html).toContain('hf-card-game-uitblinker')
    expect(html).toMatch(/<h2[^>]*>Geef je cijfers<\/h2>/)
    expect(html).toContain('hf-tag-open')
    expect(html).toContain('Open tot do 20.00')
    expect(html).toContain('Sparta Rotterdam')
    expect(html).toContain('href="/wedstrijden/2026-27/2026-11-21-sparta-rotterdam"')
  })

  it('says who gets a grade and until when they can be changed, and then shows what it was given', () => {
    expect(html).toContain('30 minuten of langer')
    expect(html).toContain('een cijfer van 1 tot 10')
    expect(html).toContain('Je kunt ze wijzigen tot donderdag 26 november, 20.00 uur.')
    expect(html.indexOf('Je kunt ze wijzigen')).toBeLessThan(html.indexOf('FORM'))
  })

  it('does not mention the coach, whose grade comes with another issue', () => {
    expect(html.toLowerCase()).not.toContain('trainer')
  })
})

describe('the other cards', () => {
  it('has the tag "Nog niet open" and the words of the report that is not finished', () => {
    const waiting = renderToStaticMarkup(<WaitingCard match={match} now={now} />)

    expect(waiting).toContain('Nog niet open')
    expect(waiting).toContain('Het verslag van deze wedstrijd is nog niet af.')
    expect(waiting).not.toContain('<form')
  })

  it('names the next match and its day when the window is closed', () => {
    const html = renderToStaticMarkup(<NextMatchCard next={next} />)

    expect(html).toMatch(/<h2[^>]*>Volgende wedstrijd<\/h2>/)
    expect(html).toContain(
      'Na sc Heerenveen – FC Twente (zaterdag 28 november) geef je hier je cijfers, zodra het verslag af is.',
    )
  })

  it('says so, without a date, when the next match is not known', () => {
    const html = renderToStaticMarkup(<NextMatchCard next={undefined} />)

    expect(html).toContain('De volgende wedstrijd is nog niet bekend.')
    expect(html).not.toMatch(/\(\w+ \d+ \w+\)/)
  })

  it('has for a visitor the strong card Doe mee with both buttons, which carry the page to come back to', () => {
    const html = renderToStaticMarkup(<JoinCard />)

    expect(html).toContain('hf-card-strong')
    expect(html).toMatch(/<h2[^>]*>Doe mee<\/h2>/)
    expect(html).toContain('schermnaam en een e-mailadres')
    expect(html).toMatch(/<button[^>]*>Account maken<\/button>/)
    expect(html).toMatch(/<button[^>]*value="\/fans\/uitblinker" name="terug">Inloggen<\/button>/)
  })

  it('explains the game in the soft card of the side column', () => {
    const html = renderToStaticMarkup(<HowItWorksCard />)

    expect(html).toContain('hf-card-soft')
    expect(html).toMatch(/<h2[^>]*>Zo werkt het<\/h2>/)
    expect(html).toContain('zeven dagen')
    expect(html).toContain('wijzigen')
    expect(html).toContain('zien alle supporters de uitslag')
  })
})

describe('what is shown after saving', () => {
  const html = renderToStaticMarkup(
    <SavedView
      closesAt={closesAt}
      grades={
        new Map([
          [11, 7],
          [12, 9],
        ])
      }
      players={players}
    />,
  )

  it('has the notice with the moment, and the button Wijzigen that goes to the form', () => {
    expect(html).toMatch(/<p[^>]*role="status"[^>]*>Je kunt ze wijzigen tot donderdag 26 november, 20.00 uur.<\/p>/)
    expect(html).toMatch(/<form[^>]*action="\/fans\/uitblinker"[^>]*method="get"/)
    expect(html).toMatch(/<button[^>]*value="1" name="wijzigen">Wijzigen<\/button>/)
  })

  it('says why the supporter sees the intermediate result, and shows only their own grades', () => {
    expect(html).toContain(
      'Omdat je zelf cijfers gaf, zie je de tussenstand al. De rest ziet hem als het venster dicht is.',
    )
    expect(html).toContain('Speler')
    expect(html).toContain('Jij')
    expect(html).not.toContain('Gem')
    expect(html).toContain('Luca Oyen')
    expect(html).toContain('>7<')
    expect(html).toContain('>9<')
  })
})
