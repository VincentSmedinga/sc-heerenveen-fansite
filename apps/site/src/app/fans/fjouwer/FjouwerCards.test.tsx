import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { FjouwerMatch } from '#src/fans/fjouwer'
import type { FormPlayer } from '#src/fans/fjouwer-form'

import { type FjouwerChoice, JouwVierCard, NoMatchCard } from './FjouwerCards'

vi.mock('./actions', () => ({ saveFjouwerAction: vi.fn() }))

// Read with the morning of Friday 20 November 2026 (Dutch time) as now.
const now = new Date('2026-11-20T10:00:00Z')

const match: FjouwerMatch = {
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

const player = (id: number, line: FormPlayer['line'], name: string, usesLeft = 10): FormPlayer => ({
  id,
  line,
  name,
  surname: name.split(' ').at(-1) ?? name,
  usesLeft,
})

const players = [
  player(1, 'doelman', 'Andries Noppert'),
  player(2, 'verdediger', 'Luca Hilgers'),
  player(3, 'middenvelder', 'Dirk Proper', 0),
  player(4, 'middenvelder', 'Levi Smans', 3),
  player(5, 'aanvaller', 'Dylan Vente'),
]

const choice = (extra: Partial<FjouwerChoice> = {}): FjouwerChoice => ({
  four: [],
  inherited: false,
  notCounting: [],
  players,
  saved: false,
  ...extra,
})

const render = (props: { choice: FjouwerChoice | undefined; match?: FjouwerMatch }) =>
  renderToStaticMarkup(<JouwVierCard match={match} now={now} {...props} />)

describe('the card Jouw vier', () => {
  it('has the heading, the watermark of the game, the Tag with the deadline and the match', () => {
    const html = render({ choice: choice() })

    expect(html).toMatch(/<h2[^>]*>Jouw vier<\/h2>/)
    expect(html).toContain('hf-card-game-fjouwer')
    expect(html).toMatch(/hf-tag-open[^>]*>Open tot za 16\.45</)
    expect(html).toContain('FC Twente')
  })

  it('asks a visitor to log in, with the two buttons and no list', () => {
    const html = render({ choice: undefined })

    expect(html).toContain('Log in om je vier te kiezen. Nog geen account? Dat maak je in een minuut.')
    expect(html).toContain('Inloggen')
    expect(html).toContain('Account maken')
    expect(html).not.toContain('type="checkbox"')
  })

  it('has a group for each line, a counter, the left uses, and a disabled player with his reason', () => {
    const html = render({ choice: choice() })

    expect(html.indexOf('Keepers')).toBeLessThan(html.indexOf('Verdedigers'))
    expect(html.indexOf('Verdedigers')).toBeLessThan(html.indexOf('Middenvelders'))
    expect(html.indexOf('Middenvelders')).toBeLessThan(html.indexOf('Aanvallers'))
    expect(html).toContain('0 van 2')
    expect(html).toContain('nog 3 keer')
    expect(html).toContain('Al 10 keer gekozen')
    expect(html).toMatch(/<input[^>]*disabled[^>]*value="3"/)
    expect(html).toContain(
      'Kies 4 spelers, hoogstens 2 per linie. Elke speler kun je 10 wedstrijden per seizoen kiezen.',
    )
    expect(html).toContain('0 van 4 gekozen')
    expect(html).toContain('>Opslaan<')
  })

  it('shows the saved four in the strip, ticked, with the button Wijziging opslaan', () => {
    const html = render({ choice: choice({ four: [1, 2, 4, 5], saved: true }) })

    expect(html).toContain('4 van 4 gekozen')
    expect(html).toContain('>Wijziging opslaan<')
    expect(html).toContain('Noppert')
    expect(html.match(/checked=""/g)).toHaveLength(4)
    expect(html).not.toContain('Kijk even')
  })

  it('says that an inherited four stays, with the Tag and the strike-through for a player who has his ten', () => {
    const html = render({ choice: choice({ four: [1, 2, 3, 5], inherited: true, notCounting: [3] }) })

    expect(html).toContain('Kijk even')
    expect(html).toContain(
      'Je vier van vorige keer staan nog. Dirk Proper is al 10 keer gekozen en telt niet mee. Kies een andere middenvelder, dan heb je er weer vier.',
    )
    expect(html).toContain('telt niet mee')
    expect(html).toContain('3 van 4 gekozen')
    expect(html.match(/checked=""/g)).toHaveLength(3)
  })

  it('has no Tag and a plain line for an inherited four of which every player counts', () => {
    const html = render({ choice: choice({ four: [1, 2, 4, 5], inherited: true }) })

    expect(html).not.toContain('Kijk even')
    expect(html).toContain('Dit zijn je vier van vorige keer. Je kunt ze wijzigen tot de aftrap.')
    expect(html).toContain('>Opslaan<')
  })

  it('closes at 00.00 on the day of a match without an hour, and says why', () => {
    const html = render({ choice: choice(), match: { ...match, dateText: 'zaterdag 21 november', kickoffAt: null } })

    expect(html).toMatch(/hf-tag-open[^>]*>Open tot za 00\.00</)
    expect(html).toContain(
      'Het uur van de aftrap is nog niet bekend. Tot dat bekend is, sluit je keuze om 00.00 uur op de dag van de wedstrijd.',
    )
  })

  it('says so when the squad is not known', () => {
    expect(render({ choice: choice({ players: [] }) })).toContain('Van dit seizoen kennen we de selectie nog niet.')
  })
})

describe('the card for the end of the season', () => {
  it('has one sentence and no form', () => {
    const html = renderToStaticMarkup(<NoMatchCard />)

    expect(html).toContain('Er is geen komende wedstrijd meer.')
    expect(html).not.toContain('<form')
  })
})
