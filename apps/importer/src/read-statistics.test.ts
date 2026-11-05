import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'

import { readSeasonStatistics, statisticsPageTitle } from './read-statistics.ts'

// Small copies of the real pages: the tables of 1995/96 (one for each competition) and of
// 2005/06 (one with a group heading for each position), with a few rows each.
const page199596 = readFileSync(new URL('./fixtures/wikipedia-statistics-1995-96.wiki', import.meta.url), 'utf8')
const page200506 = readFileSync(new URL('./fixtures/wikipedia-statistics-2005-06.wiki', import.meta.url), 'utf8')

/** The page of 1995/96 without the typo in a number (a backtick before the 3). */
const fixed199596 = page199596.replace('|`3', '|3')

/** A page with one table of a competition under "Aantal wedstrijden/doelpunten". */
function matchesPage(...rows: string[]): string {
  return [
    '===Aantal wedstrijden/doelpunten===',
    '{| width=75%',
    '| width=25% align=left valign=top |',
    "'''Competitie'''",
    '{| class="wikitable"',
    '|- valign=top',
    '! width=15% align=center | #',
    '! width=65% align=center | Naam',
    '!AW',
    '! align="center" width="20%" | {{goal}}',
    ...rows,
    '|}',
    '|}',
  ].join('\n')
}

function playersOf(text: string): SeasonPlayer[] {
  const squad = readSeasonStatistics(text)

  if (squad.kind !== 'read') {
    throw new Error(`The page was not read: ${JSON.stringify(squad)}`)
  }

  return squad.players
}

function problemOf(text: string): string {
  const squad = readSeasonStatistics(text)

  if (squad.kind !== 'error') {
    throw new Error(`The page gave no error: ${squad.kind}`)
  }

  return squad.message
}

/** A row of that table: a rank, a name cell, the matches and the goals. */
function row(name: string, matches = '10', goals = '1'): string {
  return `|- valign="top"\n| align="center" |1.\n|${name}\n|${matches}\n| align="center" |${goals}`
}

describe('the tables of 1990/91 to 1999/00', () => {
  it('reads the players of every competition table, with their numbers added up', () => {
    expect(readSeasonStatistics(fixed199596)).toEqual({
      appearancesTotal: 44 + 39 + 31 + 31 + 31 + 30 + 3,
      goalsTotal: 1 + 12 + 3 + 2 + 0 + 14 + 0,
      kind: 'read',
      players: [
        { appearances: 44, goals: 1, name: 'Marco Roelofsen', page: 'Marco Roelofsen' },
        { appearances: 39, goals: 12, name: 'Erik Regtop', page: 'Erik Regtop' },
        { appearances: 31, goals: 3, name: 'Johan Hansma', page: 'Johan Hansma' },
        { appearances: 31, goals: 2, name: 'Jan de Visser', page: 'Jan de Visser (voetballer)' },
        { appearances: 31, goals: 0, name: 'Tom Sier', page: 'Tom Sier' },
        { appearances: 30, goals: 14, name: 'Jon Dahl Tomasson', page: 'Jon Dahl Tomasson' },
        { appearances: 3, goals: 0, name: "Carlo l'Ami", page: "Carlo l'Ami" },
      ].map((player) => ({ ...player, position: null, shirtNumber: null })),
      source: 'statistieken',
      warnings: [],
    } satisfies SeasonSquad)
  })

  it('leaves out the rows under Eigen doelpunt: a player of another club is not ours', () => {
    const names = playersOf(page199596).map((player) => player.name)

    expect(names).not.toContain('Ab Persijn')
    expect(names).not.toContain('FC Volendam')
  })

  it('leaves out the table of the final standing and the rest of the page', () => {
    expect(playersOf(page199596).map((player) => player.name)).toEqual([
      'Marco Roelofsen',
      'Erik Regtop',
      'Johan Hansma',
      'Jan de Visser',
      'Tom Sier',
      'Jon Dahl Tomasson',
      "Carlo l'Ami",
    ])
  })

  it('reads a row below a shared rank, which has no rank cell', () => {
    expect(playersOf(page199596)).toContainEqual(expect.objectContaining({ appearances: 31, name: 'Tom Sier' }))
  })

  it('strips the flag and keeps the page of the link with its addition', () => {
    const players = playersOf(page199596)

    expect(players).toContainEqual(expect.objectContaining({ name: 'Jon Dahl Tomasson', page: 'Jon Dahl Tomasson' }))
    expect(players).toContainEqual(
      expect.objectContaining({ name: 'Jan de Visser', page: 'Jan de Visser (voetballer)' }),
    )
  })

  it('leaves out a number that is a typo, with a warning, and gives no total of matches', () => {
    const squad = readSeasonStatistics(page199596)

    expect(squad).toMatchObject({
      appearancesTotal: null,
      goalsTotal: 32,
      kind: 'read',
      warnings: ["Carlo l'Ami: the matches '`3' is not a number, so it is left out"],
    })
    expect(playersOf(page199596)).toContainEqual(
      expect.objectContaining({ appearances: null, goals: 0, name: "Carlo l'Ami" }),
    )
  })

  it('takes a dash for a number we do not know, not for a zero', () => {
    const squad = readSeasonStatistics(matchesPage(row('[[Pim Verbeek]]', '–')))

    expect(squad).toMatchObject({ appearancesTotal: null, goalsTotal: 1, kind: 'read' })
  })

  it('keeps a player without a link when the cell gives his full name', () => {
    expect(playersOf(matchesPage(row('Pim Verbeek')))).toEqual([
      { appearances: 10, goals: 1, name: 'Pim Verbeek', page: null, position: null, shirtNumber: null },
    ])
  })

  it('does not keep a name that is not a full name', () => {
    expect(problemOf(matchesPage(row('v. Amersfoort')))).toBe("a row has no usable name: 'v. Amersfoort'")
    expect(problemOf(matchesPage(row('Verbeek')))).toBe("a row has no usable name: 'Verbeek'")
  })

  it('adds the numbers of a name written two ways on one page', () => {
    const squad = readSeasonStatistics(
      matchesPage(row('[[Dumitru Mitriță]]', '20', '5'), row('[[Dumitru Mitriţă]]', '4', '1')),
    )

    expect(squad).toMatchObject({
      appearancesTotal: 24,
      goalsTotal: 6,
      players: [{ appearances: 24, goals: 6, name: 'Dumitru Mitriță' }],
    })
  })

  it('reads a player of three tables as one player', () => {
    const roelofsen = playersOf(page199596).filter((player) => player.name === 'Marco Roelofsen')

    expect(roelofsen).toEqual([expect.objectContaining({ appearances: 44, goals: 1 })])
  })
})

describe('the table of 2005/06', () => {
  it('reads the position, the shirt number and the numbers of every competition added up', () => {
    expect(readSeasonStatistics(page200506)).toEqual({
      appearancesTotal: 15 + 34 + 10 + 41 + 22,
      goalsTotal: 0 + 0 + 1 + 5 + 20,
      kind: 'read',
      players: [
        { appearances: 15, goals: 0, name: 'Boy Waterman', page: 'Boy Waterman', position: 'doelman', shirtNumber: 24 },
        {
          appearances: 34,
          goals: 0,
          name: 'Brian Vandenbussche',
          page: 'Brian Vandenbussche',
          position: 'doelman',
          shirtNumber: 25,
        },
        {
          appearances: 10,
          goals: 1,
          name: 'Jakob Poulsen',
          page: 'Jakob Poulsen',
          position: 'verdediger',
          shirtNumber: 2,
        },
        {
          appearances: 41,
          goals: 5,
          name: 'Paul Bosvelt',
          page: 'Paul Bosvelt',
          position: 'middenvelder',
          shirtNumber: 6,
        },
        {
          appearances: 22,
          goals: 20,
          name: 'Klaas-Jan Huntelaar',
          page: 'Klaas-Jan Huntelaar',
          position: 'aanvaller',
          shirtNumber: 9,
        },
      ],
      source: 'statistieken',
      warnings: [],
    } satisfies SeasonSquad)
  })

  it('reads a name inside a nowrap template, with the flag in it', () => {
    expect(playersOf(page200506)).toContainEqual(expect.objectContaining({ name: 'Brian Vandenbussche' }))
  })

  it('reads the headings by the page they link to, whatever they show', () => {
    const positions = playersOf(page200506).map((player) => player.position)

    expect(positions).toEqual(['doelman', 'doelman', 'verdediger', 'middenvelder', 'aanvaller'])
  })
})

describe('a page without a table', () => {
  it('gives none for a page without a heading', () => {
    expect(readSeasonStatistics('== Zie ook ==\n* [[sc Heerenveen]]')).toEqual({
      kind: 'none',
      reason: 'the page has no table under Aantal wedstrijden/doelpunten or Statistieken',
    })
  })

  it('gives none for an empty page', () => {
    expect(readSeasonStatistics('')).toMatchObject({ kind: 'none' })
  })

  it('gives none for a heading Statistieken with no table under it', () => {
    expect(readSeasonStatistics('==Statistieken==\nNog niet bekend.\n==Zie ook==\n')).toMatchObject({ kind: 'none' })
  })

  it('gives none for a page that only has the table of the final standing', () => {
    const standing = page199596.slice(0, page199596.indexOf('===Aantal wedstrijden/doelpunten==='))

    expect(readSeasonStatistics(standing)).toMatchObject({ kind: 'none' })
  })
})

describe('a page that has changed shape', () => {
  it('is an error when the table of a competition is not closed', () => {
    expect(problemOf(matchesPage(row('[[Pim Verbeek]]')).replace(/\|\}\n\|\}$/u, ''))).toBe(
      'the table of matches and goals is not closed, or has no table of a competition',
    )
  })

  it('is an error when the headings of the columns are not Naam and AW', () => {
    expect(problemOf(matchesPage(row('[[Pim Verbeek]]')).replace('!AW', '!Duels'))).toBe(
      'a table of matches and goals does not have the column headings Naam and AW',
    )
  })

  it('is an error when a row stands above the column headings', () => {
    expect(problemOf(matchesPage(row('[[Pim Verbeek]]')).replace(/^!.*\n/gmu, ''))).toBe(
      'a table of matches and goals has a row above its column headings',
    )
  })

  it('is an error when a row has other than three or four cells', () => {
    const cells = '|- valign="top"\n|1.\n|[[Pim Verbeek]]\n|10\n|1\n|2'

    expect(problemOf(matchesPage(cells))).toBe('a row of a table of matches and goals has 5 cells, not three or four')
  })

  it('is an error when a table has a heading we do not know', () => {
    expect(problemOf(matchesPage('|-\n! colspan="4" | Strafschoppen'))).toBe(
      "a table of matches and goals has a heading we do not know: 'strafschoppen'",
    )
  })

  it('is an error when a name cell has two links', () => {
    expect(problemOf(matchesPage(row('[[Pim Verbeek]] ([[FC Volendam]])')))).toBe(
      "a row has a name cell we do not know: 'Pim Verbeek (FC Volendam)'",
    )
  })

  it('is an error when a name cell has a template we do not know', () => {
    expect(problemOf(matchesPage(row('{{Kapitein}} [[Pim Verbeek]]')))).toBe(
      "a row has a name cell we do not know: '{{Kapitein}} Pim Verbeek'",
    )
  })

  it('is an error when a table has a heading and no players', () => {
    expect(problemOf(matchesPage())).toBe('the table of statistics has no players')
  })

  it('is an error when the table of positions has a group heading we do not know', () => {
    expect(problemOf(page200506.replace('Doelverdediger (voetbal)|Doel', 'Reserve (voetbal)|Reserve'))).toBe(
      "the table of statistics has a group heading we do not know: 'Reserve'",
    )
  })

  it('is an error when the table of positions does not have the columns Naam and Geboren', () => {
    expect(problemOf(page200506.replace('!rowspan="2" width=12%|Geboren', '!rowspan="2" width=12%|Leeftijd'))).toBe(
      'the table of statistics does not have the columns Naam and Geboren',
    )
  })

  it('is an error when the table of positions has a different number of columns of numbers', () => {
    expect(problemOf(page200506.replace('! style="width:10%"|Goals\n|-', '|-'))).toBe(
      'the table of statistics has 7 columns of numbers for 4 competitions',
    )
  })

  it('is an error when a row of positions has a cell too few', () => {
    expect(problemOf(page200506.replace('|| 11|| 0|| 0|| 0|| 4|| 0|| 0||0', '|| 11|| 0|| 0|| 0|| 4|| 0|| 0'))).toBe(
      'a row of the table of statistics has 10 cells, not 11',
    )
  })

  it('is an error when a shirt number is not a number', () => {
    expect(problemOf(page200506.replace('| 24 ||', '| keeper ||'))).toBe(
      "Boy Waterman has a shirt number we do not know: 'keeper'",
    )
  })

  it('is an error when a player stands above the first group heading', () => {
    const text = page200506.replace(/\|-\n! colspan="12" style="background:#FFDEAD[^\n]*\n/u, '|-\n')

    expect(problemOf(text)).toBe(
      'the table of statistics has a player above its column headings or its first group heading',
    )
  })

  it('is an error when the section holds two tables', () => {
    expect(problemOf(page200506.replace('== Zie ook ==', '{| class="wikitable"\n| een\n|}\n== Zie ook =='))).toBe(
      'the table of statistics is not closed, or the section holds more than one table',
    )
  })

  it('writes no player when it gives an error', () => {
    expect(readSeasonStatistics(matchesPage(row('[[Pim Verbeek]]'), row('[[A]] ([[B]])')))).not.toHaveProperty(
      'players',
    )
  })
})

describe('the title of the page', () => {
  it('has no addition before 2006/07', () => {
    expect(statisticsPageTitle('1995/96')).toBe('Sc Heerenveen in het seizoen 1995/96')
  })
})
