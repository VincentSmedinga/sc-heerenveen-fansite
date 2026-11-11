import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PlayerSeason } from './player-seasons'

import { PlayerSeasonsCard, playerSeasonsTable } from './PlayerSeasonsCard'
import { withoutIcons } from './without-icons'

const season = (name: string, extra: Partial<PlayerSeason> = {}): PlayerSeason => ({
  assists: 1,
  cleanSheets: undefined,
  conceded: undefined,
  goals: 4,
  goalsByCompetition: {},
  matchesInSeason: 34,
  played: 30,
  red: 0,
  reportedMatches: 34,
  season: name,
  shirtNumber: undefined,
  source: 'lineups',
  started: 28,
  yellow: 2,
  ...extra,
})

const render = (seasons: PlayerSeason[], goalkeeper = false) =>
  withoutIcons(
    renderToStaticMarkup(
      <PlayerSeasonsCard
        address={(value) => `/spelers/${value.replace('/', '-')}`}
        goalkeeper={goalkeeper}
        name="Test Speler"
        seasons={seasons}
      />,
    ),
  )

describe('the table Per seizoen', () => {
  it('has G, B, D and A for a player of the field, the newest season first and a row Totaal', () => {
    const html = render([season('2004/05', { shirtNumber: 35 }), season('2003/04', { goals: 6 })])

    expect(html).toContain('<h2')
    expect(html).toContain('Per seizoen')
    expect(html).toMatch(/<caption class="hf-visually-hidden">De cijfers van Test Speler per seizoen/)
    expect(html).toMatch(/<th scope="col">Seizoen<\/th>/)
    expect(html.match(/<abbr title="[^"]+">/g)).toEqual([
      '<abbr title="Gespeeld">',
      '<abbr title="Basis">',
      '<abbr title="Doelpunten">',
      '<abbr title="Assists">',
    ])
    expect(html.indexOf('2004/05')).toBeLessThan(html.indexOf('2003/04'))
    expect(html).toContain('<a href="/spelers/2004-05">2004/05</a>')
    expect(html).toContain('nr. 35')
    expect(html).toMatch(
      /<th scope="row">Totaal<\/th><td class="hf-numeric">60<\/td><td class="hf-numeric">56<\/td><td class="hf-numeric">10<\/td><td class="hf-numeric">2<\/td>/,
    )
  })

  it('has G, N, T and Y for a goalkeeper, and not the matches he started or his goals', () => {
    const keeper = { assists: undefined, cleanSheets: 9, conceded: 30, goals: 0, started: 30 }
    const html = render([season('2004/05', keeper)], true)

    expect(html.match(/<abbr title="[^"]+">/g)).toEqual([
      '<abbr title="Gespeeld">',
      '<abbr title="Nul">',
      '<abbr title="Tegendoelpunten">',
      '<abbr title="Geel">',
    ])
    expect(html).toContain('N nul, T tegendoelpunten')
    expect(html).toContain('van begin tot eind')
  })

  it('leaves out a column without a figure in any season, and shows a dash, not a nought, for a season without one', () => {
    const rows = playerSeasonsTable(
      [
        season('2004/05', { assists: undefined }),
        season('2003/04', {
          assists: undefined,
          goals: undefined,
          played: undefined,
          source: 'none',
          started: undefined,
        }),
      ],
      false,
    )

    expect(rows.columns.map(({ id }) => id)).toEqual(['played', 'started', 'goals'])
    expect(rows.rows[1]?.cells).toEqual(['–', '–', '–'])
  })

  it('says what a dash is, and that the total counts only the seasons with a figure', () => {
    const html = render([
      season('2004/05'),
      season('2003/04', {
        assists: undefined,
        goals: undefined,
        played: undefined,
        source: 'none',
        started: undefined,
        yellow: undefined,
      }),
    ])

    expect(html).toContain('Een streepje: van dat seizoen hebben we geen opstellingen.')
    expect(html).toContain('Het totaal telt alleen de seizoenen met een cijfer.')
  })

  it('has no sentence about a dash or the total when every figure is there', () => {
    const html = render([season('2004/05'), season('2003/04')])

    expect(html).not.toContain('streepje')
    expect(html).not.toContain('totaal telt')
  })

  it('says that the table of Wikipedia counts only the competitions of that table, and how many line-ups a season has', () => {
    const html = render([
      season('2026/27', { source: 'wikipedia', started: undefined, yellow: undefined }),
      season('2007/08', { matchesInSeason: 41, reportedMatches: 8, source: 'some-lineups' }),
    ])

    expect(html).toContain(
      'In 2026/27 komen de cijfers uit de tabel van Wikipedia, die alleen de competities van die tabel telt.',
    )
    expect(html).toContain('Uit 8 van de 41 wedstrijden van 2007/08 hebben we een opstelling.')
  })
})
