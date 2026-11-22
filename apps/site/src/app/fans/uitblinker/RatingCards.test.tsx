import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { MatchRatings, RatedPlayer, SeasonWinner } from '#src/fans/match-ratings'
import type { RatingMatch, RatingPlayer } from '#src/fans/rating'

import {
  ClosedResultCard,
  HowItWorksCard,
  JoinCard,
  NextMatchCard,
  OpenCard,
  SavedView,
  SeasonWinnersCard,
  WaitingCard,
} from './RatingCards'

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

  it('says the trainer is rated too only for a match with a coach', () => {
    const plain = renderToStaticMarkup(
      <OpenCard closesAt={closesAt} match={match} now={now}>
        {null}
      </OpenCard>,
    )
    const withCoach = renderToStaticMarkup(
      <OpenCard closesAt={closesAt} match={match} now={now} withCoach>
        {null}
      </OpenCard>,
    )

    expect(plain).not.toContain('de trainer')
    expect(withCoach).toContain('een cijfer van 1 tot 10, en de trainer.')
  })

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
    expect(html).toContain('zien alle fans de uitslag')
    expect(html).toContain('<a href="/fans/spelregels#uitblinker"><span class="hf-icon-tail">Spelregels<svg')
  })
})

const running = (appearanceId: number, name: string, average: number, count: number): RatedPlayer => ({
  appearanceId,
  average,
  count,
  name,
  playerId: appearanceId,
})

describe('what is shown after saving', () => {
  const html = renderToStaticMarkup(
    <SavedView
      closesAt={closesAt}
      coach={null}
      grades={
        new Map([
          [11, 7],
          [12, 9],
        ])
      }
      players={players}
      running={[running(11, 'Luca Oyen', 7.24, 12), running(12, 'Pim Spits', 8.5, 3)]}
    />,
  )
  const rows = html.match(/<tr[\s\S]*?<\/tr>/g) ?? []
  const text = (row: string) =>
    row
      .replaceAll(/<[^>]*>/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim()

  it('has the notice with the moment, and the button Wijzigen that goes to the form', () => {
    expect(html).toMatch(/<p[^>]*role="status"[^>]*>Je kunt ze wijzigen tot donderdag 26 november, 20.00 uur.<\/p>/)
    expect(html).toMatch(/<form[^>]*action="\/fans\/uitblinker"[^>]*method="get"/)
    expect(html).toMatch(/<button[^>]*value="1" name="wijzigen">Wijzigen<\/button>/)
  })

  it('says why the supporter sees the standing so far', () => {
    expect(html).toContain(
      'Omdat je zelf cijfers gaf, zie je de tussenstand al. De rest ziet hem als het venster dicht is.',
    )
  })

  it('has the columns Speler, Jij and Gem, with the own grade and the average of everyone', () => {
    expect(text(rows[0] ?? '')).toBe('Speler Jij Gem')
    expect(text(rows[1] ?? '')).toContain('Luca Oyen')
    expect(text(rows[1] ?? '')).toContain('7 7,2')
  })

  it('marks the Uitblinker in words in his row, and only his', () => {
    expect(html.match(/>Uitblinker</g)).toHaveLength(1)
    expect(text(rows[1] ?? '')).toContain('Uitblinker')
    expect(text(rows[2] ?? '')).not.toContain('Uitblinker')
  })

  it('says "nog te weinig cijfers" for a player under five ratings, without an average', () => {
    expect(text(rows[2] ?? '')).toContain('9 nog te weinig cijfers')
    expect(html).not.toContain('8,5')
  })
})

describe('the order of the table after saving', () => {
  const four: RatingPlayer[] = ['Dirk Proper', 'Anton Beets', 'Mark Visser', 'Piet Dijk'].map((name, index) => ({
    appearanceId: 21 + index,
    assist: false,
    goal: false,
    minutes: 90,
    name,
    position: 'middenvelder',
  }))
  const order = (running: RatedPlayer[], coach = false) => {
    const html = renderToStaticMarkup(
      <SavedView
        closesAt={closesAt}
        coach={coach ? { name: 'Robin Veldman', staffId: 3 } : null}
        grades={new Map(four.map((player) => [player.appearanceId, 7]))}
        // The form lists the players by name, and the table must not follow that order.
        players={four.toSorted((a, b) => a.name.localeCompare(b.name))}
        running={running}
        runningCoach={coach ? { average: 9.9, count: 30, name: 'Robin Veldman' } : undefined}
      />,
    )

    return [...html.matchAll(/(Dirk Proper|Anton Beets|Mark Visser|Piet Dijk|Robin Veldman \(trainer\))/g)].map(
      (found) => found[0],
    )
  }

  it('has the highest average first, with more ratings first when equal, then the line-up', () => {
    expect(
      order([
        running(21, 'Dirk Proper', 6.5, 12),
        running(22, 'Anton Beets', 8, 12),
        running(23, 'Mark Visser', 8, 30),
        running(24, 'Piet Dijk', 9.5, 2),
      ]),
    ).toEqual(['Mark Visser', 'Anton Beets', 'Dirk Proper', 'Piet Dijk'])
  })

  it('puts players without ratings under the others in the order of the line-up, and the coach last', () => {
    expect(order([running(24, 'Piet Dijk', 7, 9)], true)).toEqual([
      'Piet Dijk',
      'Dirk Proper',
      'Anton Beets',
      'Mark Visser',
      'Robin Veldman (trainer)',
    ])
  })

  it('has the Uitblinker in the first row', () => {
    const html = renderToStaticMarkup(
      <SavedView
        closesAt={closesAt}
        coach={null}
        grades={new Map(four.map((player) => [player.appearanceId, 7]))}
        players={four}
        running={[running(21, 'Dirk Proper', 6.5, 12), running(23, 'Mark Visser', 8, 30)]}
      />,
    )
    const rows = html.match(/<tr[\s\S]*?<\/tr>/g) ?? []

    expect(rows[1]).toContain('Mark Visser')
    expect(rows[1]).toContain('Uitblinker')
  })
})

describe('the result of a closed window', () => {
  const brandsma = running(11, 'Luca Oyen', 7.8, 31)
  const ratings: MatchRatings = {
    players: [brandsma, running(12, 'Pim Spits', 8.9, 3)],
    supporters: 31,
    winner: brandsma,
  }

  it('shows the match, the seal, the table and the number of supporters', () => {
    const html = renderToStaticMarkup(<ClosedResultCard match={match} now={now} ratings={ratings} />)

    expect(html).toMatch(/<h2[^>]*>Uitslag van de laatste wedstrijd<\/h2>/)
    expect(html).toContain('Uitblinker van de wedstrijd')
    expect(html).toContain('<table')
    expect(html).toContain('31 fans gaven cijfers.')
    expect(html).toContain('nog te weinig cijfers')
  })

  it('has only the number when fewer than five supporters rated', () => {
    const html = renderToStaticMarkup(
      <ClosedResultCard
        match={match}
        now={now}
        ratings={{ players: [running(12, 'Pim Spits', 8.9, 3)], supporters: 3 }}
      />,
    )

    expect(html).toContain('3 fans gaven cijfers.')
    expect(html).not.toContain('<table')
    expect(html).not.toContain('hf-winner')
  })
})

describe('the card Uitblinkers of the season', () => {
  const winners: SeasonWinner[] = [
    {
      average: 7.8,
      goalsAgainst: 1,
      goalsFor: 3,
      home: true,
      matchId: 2,
      name: 'Dylan Vente',
      opponent: 'Sparta Rotterdam',
    },
    { average: 7.4, goalsAgainst: 2, goalsFor: 2, home: false, matchId: 1, name: 'Andries Noppert', opponent: 'Ajax' },
  ]

  it('is a soft card with a name, an average and the match for each Uitblinker, and the link to the matches', () => {
    const html = renderToStaticMarkup(<SeasonWinnersCard season="2026/27" winners={winners} />)

    expect(html).toContain('hf-card-soft')
    expect(html).toMatch(/<h2[^>]*>Uitblinkers 2026\/27<\/h2>/)
    expect(html).toContain('Dylan Vente')
    expect(html).toContain('7,8')
    expect(html).toContain('Thuis tegen Sparta Rotterdam, 3–1')
    expect(html).toContain('Uit tegen Ajax, 2–2')
    expect(html).toContain('>Alle <span class="hf-icon-tail">wedstrijden<svg')
    expect(html).toContain(
      'href="/fans/uitblinker/van-het-jaar">Uitblinker van het <span class="hf-icon-tail">jaar<svg',
    )
    expect(html.indexOf('Dylan Vente')).toBeLessThan(html.indexOf('Andries Noppert'))
  })

  it('is not there for a season without an Uitblinker', () => {
    expect(renderToStaticMarkup(<SeasonWinnersCard season="2026/27" winners={[]} />)).toBe('')
  })
})

describe('the head coach in what is shown after saving', () => {
  const withCoach = renderToStaticMarkup(
    <SavedView
      closesAt={closesAt}
      coach={{ name: 'Robin Veldman', staffId: 3 }}
      coachGrade={6}
      grades={
        new Map([
          [11, 7],
          [12, 9],
        ])
      }
      players={players}
      running={[]}
    />,
  )

  it('puts the head coach last, after a heavier line, as "Naam (trainer)", with his own grade', () => {
    expect(withCoach).toContain('Robin Veldman (trainer)')
    expect(withCoach.indexOf('Pim Spits')).toBeLessThan(withCoach.indexOf('Robin Veldman (trainer)'))
    expect(withCoach).toContain('hf-data-table-total')
    expect(withCoach).toContain('>6<')
  })

  it('shows the running average of the coach in the last row, and says "nog te weinig cijfers" under five', () => {
    const render = (count: number) =>
      renderToStaticMarkup(
        <SavedView
          closesAt={closesAt}
          coach={{ name: 'Robin Veldman', staffId: 3 }}
          coachGrade={6}
          grades={
            new Map([
              [11, 7],
              [12, 9],
            ])
          }
          players={players}
          running={[]}
          runningCoach={{ average: 6.5, count, name: 'Robin Veldman' }}
        />,
      )

    expect(render(12)).toContain('6,5')
    expect(render(4)).not.toContain('6,5')
    expect(render(4).slice(render(4).indexOf('Robin Veldman'))).toContain('nog te weinig cijfers')
  })
})

describe('the head coach in the table of a closed match', () => {
  it('stands last in the table of the result, after the players, without the seal', () => {
    const html = renderToStaticMarkup(
      <ClosedResultCard
        match={match}
        now={now}
        ratings={{
          coach: { average: 7.1, count: 12, name: 'Robin Veldman' },
          players: [
            { appearanceId: 11, average: 7.8, count: 12, name: 'Pim Spits', playerId: 1 },
            { appearanceId: 12, average: 6.2, count: 12, name: 'Teun Kuil', playerId: 2 },
          ],
          supporters: 12,
          winner: { appearanceId: 11, average: 7.8, count: 12, name: 'Pim Spits', playerId: 1 },
        }}
      />,
    )

    expect(html.indexOf('Teun Kuil')).toBeLessThan(html.indexOf('Robin Veldman (trainer)'))
    expect(html).toContain('hf-data-table-total')
    expect(html.match(/>Uitblinker</g)).toHaveLength(1)
  })
})
