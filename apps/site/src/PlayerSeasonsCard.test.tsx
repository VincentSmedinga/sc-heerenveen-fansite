import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PlayerSeason } from './player-seasons'

import { PlayerSeasonsCard, playerSeasonsTable } from './PlayerSeasonsCard'
import { legendsOf } from './test-legend'
import { withoutIcons } from './without-icons'

const season = (name: string, extra: Partial<PlayerSeason> = {}): PlayerSeason => ({
  assists: 1,
  cleanSheets: undefined,
  conceded: undefined,
  goalMoments: [],
  goals: 4,
  goalsByCompetition: {},
  lineupMatches: [],
  matchesInSeason: 34,
  minutes: 2500,
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

describe('the cards in the table Per seizoen', () => {
  const cards = (goalkeeper: boolean, seasons: PlayerSeason[]) => playerSeasonsTable(seasons, goalkeeper)

  it('puts geel and rood last, behind the button on a phone: both for a field player, rood for a goalkeeper', () => {
    const field = cards(false, [season('2004/05')])
    const keeper = cards(true, [season('2004/05', { cleanSheets: 3, conceded: 20 })])

    expect(field.columns.map(({ id }) => id)).toEqual([
      'played',
      'started',
      'minutes',
      'goals',
      'assists',
      'yellow',
      'red',
    ])
    expect(field.columns.map(({ more }) => more === true)).toEqual([false, false, false, false, false, true, true])
    expect(keeper.columns.map(({ id }) => id)).toEqual([
      'played',
      'minutes',
      'cleanSheets',
      'conceded',
      'yellow',
      'red',
    ])
    expect(keeper.columns.map(({ more }) => more === true)).toEqual([false, false, false, false, false, true])
  })

  it('wraps the table in the button and shows the cards for a field player', () => {
    const html = render([season('2004/05', { red: 1, yellow: 3 })])

    expect(html).toContain('hf-data-table-more')
    expect(html).toContain('hf-more-column')
    expect(legendsOf(html)).toEqual(['gespeeld, basis, minuten, doelpunten, assists, geel, rood'])
  })

  it('counts a yellow-red card in both columns: the figures are those of the seasons', () => {
    const [row] = cards(false, [season('2004/05', { red: 1, yellow: 1 })]).rows

    expect(row?.cells.slice(-2)).toEqual([1, 1])
  })

  it('shows a dash, not a nought, for a season without figures, and adds up the others in the total', () => {
    const table = cards(false, [
      season('2004/05', { red: 1, yellow: 3 }),
      season('2003/04', { red: undefined, source: 'wikipedia', started: undefined, yellow: undefined }),
    ])

    expect(table.rows[1]?.cells.slice(-2)).toEqual(['–', '–'])
    expect(table.rows[2]?.cells.slice(-2)).toEqual([3, 1])
    expect(table.complete.yellow).toBe(false)
    expect(table.complete.red).toBe(false)
    expect(render([season('2004/05'), season('2003/04', { red: undefined, yellow: undefined })])).toContain(
      'Het totaal telt alleen de seizoenen met een cijfer.',
    )
  })

  it('has no button Toon meer when no column is left behind it', () => {
    const html = render([season('2004/05', { red: undefined, yellow: undefined })])

    expect(html).not.toContain('hf-data-table-more')
    expect(render([season('2004/05')])).toContain('hf-data-table-more')
  })

  it('has no geel and rood for a player without a figure about cards in any season', () => {
    const table = cards(false, [season('2004/05', { red: undefined, yellow: undefined })])

    expect(table.columns.map(({ id }) => id)).toEqual(['played', 'started', 'minutes', 'goals', 'assists'])
  })
})

describe('the table Per seizoen', () => {
  it('has gespeeld, basis, doelpunten, assists, geel and rood for a player of the field, the newest season first and a row Totaal', () => {
    const html = render([season('2004/05', { shirtNumber: 35 }), season('2003/04', { goals: 6 })])

    expect(html).toContain('<h2')
    expect(html).toContain('Per seizoen')
    expect(html).toMatch(/<caption class="hf-visually-hidden">De cijfers van Test Speler per seizoen/)
    expect(html).toMatch(/<th scope="col">Seizoen<\/th>/)
    expect(html.match(/<span title="[^"]+">/g)).toEqual([
      '<span title="Gespeeld">',
      '<span title="Basis">',
      '<span title="Minuten">',
      '<span title="Doelpunten">',
      '<span title="Assists">',
      '<span title="Geel">',
      '<span title="Rood">',
    ])
    expect(html.indexOf('2004/05')).toBeLessThan(html.indexOf('2003/04'))
    expect(html).toContain('<a href="/spelers/2004-05">2004/05</a>')
    expect(html).toContain('<span class="hf-meta hf-data-table-aside">nr. 35</span>')
    expect(html).toContain('<tr class="hf-data-table-total"><th scope="row">Totaal</th>')
    expect(html).toMatch(
      /<th scope="row">Totaal<\/th><td class="hf-numeric">60<\/td><td class="hf-numeric">56<\/td><td class="hf-numeric">5\.000<\/td><td class="hf-numeric">10<\/td><td class="hf-numeric">2<\/td><td class="hf-numeric hf-more-column">4<\/td><td class="hf-numeric hf-more-column">0<\/td>/,
    )
  })

  it('has a row with a sign between two spells, read as "niet bij sc Heerenveen", and none between seasons that follow', () => {
    const html = render([season('2009/10'), season('2008/09'), season('2004/05'), season('2003/04'), season('2000/01')])
    const gap =
      '<tr class="hf-data-table-gap"><th scope="row"><span aria-hidden="true">⋮</span><span class="hf-visually-hidden">niet bij sc Heerenveen</span></th>'

    expect(html.split(gap)).toHaveLength(3)
    expect(html.indexOf('2008/09')).toBeLessThan(html.indexOf(gap))
    expect(html.indexOf(gap)).toBeLessThan(html.indexOf('2004/05'))
    // The total counts the five seasons only, and is still the last row.
    expect(html).toMatch(/<th scope="row">Totaal<\/th><td class="hf-numeric">150<\/td>/)
    expect(html.lastIndexOf('hf-data-table-gap')).toBeLessThan(html.indexOf('hf-data-table-total'))
    expect(render([season('2004/05'), season('2003/04')])).not.toContain('hf-data-table-gap')
  })

  it('has gespeeld, nul, tegendoelpunten, geel and rood for a goalkeeper, and not the matches he started or his goals', () => {
    const keeper = { assists: undefined, cleanSheets: 9, conceded: 30, goals: 0, started: 30 }
    const html = render([season('2004/05', keeper)], true)

    expect(html.match(/<span title="[^"]+">/g)).toEqual([
      '<span title="Gespeeld">',
      '<span title="Minuten">',
      '<span title="Nul">',
      '<span title="Tegendoelpunten">',
      '<span title="Geel">',
      '<span title="Rood">',
    ])
    expect(legendsOf(html)).toEqual(['gespeeld, minuten, nul, tegendoelpunten, geel, rood'])
    expect(html).toContain('van begin tot eind')
  })

  it('leaves out a column without a figure in any season, and shows a dash, not a nought, for a season without one', () => {
    const rows = playerSeasonsTable(
      [
        season('2004/05', { assists: undefined, red: undefined, yellow: undefined }),
        season('2003/04', {
          assists: undefined,
          goals: undefined,
          minutes: undefined,
          played: undefined,
          red: undefined,
          source: 'none',
          started: undefined,
          yellow: undefined,
        }),
      ],
      false,
    )

    expect(rows.columns.map(({ id }) => id)).toEqual(['played', 'started', 'minutes', 'goals'])
    expect(rows.rows[1]?.cells).toEqual(['–', '–', '–', '–'])
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

  it('has one short line for each kind of gap, with the seasons as ranges', () => {
    const html = render([
      season('2026/27', { source: 'wikipedia', started: undefined, yellow: undefined }),
      season('2007/08', { matchesInSeason: 41, reportedMatches: 8, source: 'some-lineups' }),
    ])

    expect(html).toContain('Cijfers van Wikipedia: 2026/27.')
    expect(html).toContain('Opstellingen: 2007/08 (8 van 41).')
  })

  it('writes a run of seasons as a range and a lone season as it is', () => {
    const html = render([
      season('2005/06', { source: 'none' }),
      season('2004/05', { source: 'none' }),
      season('2003/04', { source: 'none' }),
      season('2001/02', { source: 'none' }),
      season('2000/01'),
    ])

    expect(html).toContain('Alleen de doelpunten: 2001/02, 2003/04 t/m 2005/06.')
  })

  it('says under the Eredivisie that a season of Wikipedia has no split, with a dash and no zero', () => {
    const html = withoutIcons(
      renderToStaticMarkup(
        <PlayerSeasonsCard
          address={(value) => `/spelers/${value.replace('/', '-')}`}
          competition="league"
          goalkeeper={false}
          name="Test Speler"
          seasons={[
            season('2004/05', { assists: undefined, played: undefined, source: 'wikipedia', started: undefined }),
            season('2003/04'),
          ]}
        />,
      ),
    )

    expect(html).toContain('alleen de Eredivisie, ')
    expect(html).toContain('Geen cijfers per competitie: 2004/05.')
    expect(html).not.toContain('geen opstellingen')
    expect(html).toContain('–')
  })
})

describe('the minutes in the table Per seizoen', () => {
  const note = 'Minuten tellen alleen in een seizoen met een opstelling bij elke wedstrijd.'

  it('shows the minutes of each season and their total, without the line when every season has them', () => {
    const table = playerSeasonsTable([season('2004/05'), season('2003/04', { minutes: 900 })], false)
    const column = table.columns.findIndex(({ id }) => id === 'minutes')

    expect(table.rows.map((row) => row.cells[column])).toEqual([2500, 900, 3400])
    expect(render([season('2004/05')])).not.toContain(note)
  })

  it('shows a dash and the line why for a season without every line-up, and adds up the others', () => {
    const seasons = [season('2004/05'), season('2003/04', { minutes: undefined })]
    const table = playerSeasonsTable(seasons, false)
    const column = table.columns.findIndex(({ id }) => id === 'minutes')

    expect(table.rows.map((row) => row.cells[column])).toEqual([2500, '–', 2500])
    expect(render(seasons)).toContain(note)
    expect(render(seasons)).toContain('Het totaal telt alleen de seizoenen met een cijfer.')
    // The dash of the minutes is not one of a season without line-ups.
    expect(render(seasons)).not.toContain('geen opstellingen')
  })

  it('keeps the column, with a dash as the total, when no season has every line-up', () => {
    const seasons = [season('2004/05', { minutes: undefined })]
    const table = playerSeasonsTable(seasons, false)
    const column = table.columns.findIndex(({ id }) => id === 'minutes')

    expect(table.rows.map((row) => row.cells[column])).toEqual(['–', '–'])
    expect(render(seasons)).toContain(note)
  })

  it('has no column of minutes alone for a player without any other figure', () => {
    const empty = {
      assists: undefined,
      goals: undefined,
      minutes: undefined,
      played: undefined,
      red: undefined,
      started: undefined,
      yellow: undefined,
    }

    expect(render([season('1990/91', empty)])).toBe('')
  })

  it('gives the row of a spell at another club no minutes', () => {
    const table = playerSeasonsTable([season('2004/05'), season('2000/01')], false)

    expect(table.rows[1]).toMatchObject({ cells: [], gap: true })
  })
})
