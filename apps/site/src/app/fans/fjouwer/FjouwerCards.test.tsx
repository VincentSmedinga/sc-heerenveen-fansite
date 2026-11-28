import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { FjouwerMatch } from '#src/fans/fjouwer'
import type { FormPlayer } from '#src/fans/fjouwer-form'

import { type FjouwerChoice, JouwVierCard, NoMatchCard } from './FjouwerCards'

vi.mock('./actions', () => ({ saveFjouwerAction: vi.fn() }))

// The answer of the server the form shows: none, unless a test sets one.
const answer = vi.hoisted(() => ({ state: undefined as unknown }))

vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof React>()

  return {
    ...react,
    useActionState: (_action: unknown, initial: unknown) => [answer.state ?? initial, () => undefined, false],
  }
})

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
  points: 31,
  shirtNumber: id,
  shortName: name.split(' ').at(-1) ?? name,
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

/** The sentences of the list "Jouw vier", in order. */
const sentences = (html: string) => {
  const list = /<ol aria-label="Jouw vier"[^>]*>(.*?)<\/ol>/s.exec(html)?.[1] ?? ''

  return [...list.matchAll(/<span class="hf-visually-hidden">([^<]*)<\/span>/g)].map((found) => found[1])
}

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

  it('asks a visitor to log in inside the card, under a rule, and shows no list', () => {
    const html = render({ choice: undefined })

    expect(html).toContain('<hr/>')
    expect(html).not.toContain('>Inloggen<')
    expect(html).toContain('Log in om je vier te kiezen.')
    expect(html).toMatch(/name="terug"[^>]*value="\/fans\/fjouwer"/)
    expect(html).toContain('Maak een account')
    expect(html).not.toContain('type="checkbox"')
  })

  it('has a group for each line, a counter, the left uses, and a disabled player with his reason', () => {
    const html = render({ choice: choice() })

    expect(html.indexOf('Keepers')).toBeLessThan(html.indexOf('Verdedigers'))
    expect(html.indexOf('Verdedigers')).toBeLessThan(html.indexOf('Middenvelders'))
    expect(html.indexOf('Middenvelders')).toBeLessThan(html.indexOf('Aanvallers'))
    expect(html).toContain('0 van 2')
    expect(html).toContain('31 punten · nog 3 keer')
    expect(html).toContain('Al 10 keer gekozen')
    expect(html).toMatch(/<input[^>]*disabled[^>]*value="3"/)
    expect(html).toContain(
      'Kies 4 spelers, hoogstens 2 per linie. Elke speler kun je 10 wedstrijden per seizoen kiezen.',
    )
    expect(html).toContain('0 van 4 gekozen')
    expect(html).toContain('>Opslaan<')
  })

  it('shows the saved four on the pitch and in the list, ticked, with the button Wijziging opslaan', () => {
    const html = render({ choice: choice({ four: [1, 2, 4, 5], saved: true }) })

    expect(html).toContain('4 van 4 gekozen')
    expect(html).toContain('>Wijziging opslaan<')
    expect(sentences(html)).toEqual([
      'Andries Noppert, keeper, rugnummer 1',
      'Luca Hilgers, verdediger, rugnummer 2',
      'Levi Smans, middenvelder, rugnummer 4',
      'Dylan Vente, aanvaller, rugnummer 5',
    ])
    expect(html.match(/checked=""/g)).toHaveLength(4)
    expect(html).not.toContain('Kijk even')
  })

  it('says that an inherited four stays, with the Tag and the strike-through for a player who has his ten', () => {
    const html = render({ choice: choice({ four: [1, 2, 3, 5], inherited: true, notCounting: [3] }) })

    expect(html).toContain('Kijk even')
    expect(html).toContain(
      'Je vier van vorige keer staan nog. Dirk Proper is al 10 keer gekozen en telt niet mee. Kies een andere middenvelder, dan heb je er weer vier.',
    )
    expect(sentences(html)[2]).toBe('Dirk Proper, middenvelder, rugnummer 3, telt niet mee')
    expect(html).toContain('3 van 4 gekozen')
    expect(html.match(/checked=""/g)).toHaveLength(3)
  })

  it('has no Tag and a plain line for an inherited four of which every player counts', () => {
    const html = render({ choice: choice({ four: [1, 2, 4, 5], inherited: true }) })

    expect(html).not.toContain('Kijk even')
    expect(html).toContain('Dit zijn je vier van vorige keer. Je kunt ze wijzigen tot de aftrap.')
    expect(html).toContain('>Opslaan<')
  })

  it('has four empty places for a supporter who never chose, and for a player who left the squad', () => {
    const empty = [1, 2, 3, 4].map((place) => `Plek ${place}, nog te kiezen`)

    expect(sentences(render({ choice: choice() }))).toEqual(empty)
    expect(sentences(render({ choice: choice({ four: [99, 2, 4, 5], inherited: true }) }))[0]).toBe(empty[0])
  })

  it('shows the four the server knows after a refused choice, and keeps what was ticked', () => {
    for (const refused of [
      { errors: { general: [], lines: { middenvelder: ['Kies hoogstens 2 middenvelders.'] } } },
      { errors: { general: [], lines: {} }, failure: 'closed' },
    ]) {
      answer.state = { ...refused, values: ['3'] }

      const html = render({ choice: choice({ four: [1, 2, 4, 5], saved: true }) })

      answer.state = undefined

      expect(sentences(html)).toEqual([
        'Andries Noppert, keeper, rugnummer 1',
        'Luca Hilgers, verdediger, rugnummer 2',
        'Levi Smans, middenvelder, rugnummer 4',
        'Dylan Vente, aanvaller, rugnummer 5',
      ])
      expect(html.match(/checked=""/g)).toHaveLength(1)
    }
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
