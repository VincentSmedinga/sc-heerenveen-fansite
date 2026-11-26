import { describe, expect, it } from 'vitest'

import { readClubSquad } from './read-club-squad.ts'
import { readCrossTable } from './read-cross-table.ts'
import { readEnglishSquad } from './read-english-squad.ts'
import { footballBoxPages, readFootballBoxes } from './read-football-box.ts'
import { readGroupStandings } from './read-group-standings.ts'
import { readCupTables, readProgrammeTables } from './read-round-tables.ts'
import { readSeasonProgramme } from './read-season-programme.ts'
import { readSeasonSelection } from './read-selection.ts'
import { readSquad } from './read-squad.ts'
import { readSeasonStatistics } from './read-statistics.ts'
import { readSeasonScorers, readSeasonTransfers } from './read-transfers.ts'
import { readCup, readEuropaLeague, readLeague, readPlayoffs, readStandings } from './read-wikipedia.ts'
import {
  findHeadings,
  findHeadingStart,
  findLooseHeadings,
  findSectionHeadings,
  readHeading,
  readLooseHeading,
} from './wikitext-headings.ts'

describe('readHeading', () => {
  it.each([
    ['== Selectie ==', 2, 'Selectie'],
    ['==Selectie==', 2, 'Selectie'],
    ['=== Zomer ===\t ', 3, 'Zomer'],
    ['====== Diep ======', 6, 'Diep'],
    ['== [[Eredivisie 2008/09|Eredivisie]] ==', 2, '[[Eredivisie 2008/09|Eredivisie]]'],
    ['== a = b ==', 2, 'a = b'],
    ['=== Scheef ==', 2, '= Scheef'],
    ['== Scheef ===', 2, 'Scheef ='],
    ['======= Zeven =======', 6, '= Zeven ='],
    ['==   ==', 2, ''],
    ['=====', 2, '='],
  ])('reads %j', (line, level, title) => {
    expect(readHeading(line)).toMatchObject({ level, title })
  })

  it.each(['= Titel =', '== Open', 'Dicht ==', ' == Ingesprongen ==', '== Tekst erachter == x', '====', '==\r==', ''])(
    'finds no heading in %j',
    (line) => {
      expect(readHeading(line)).toBeUndefined()
    },
  )

  it('takes a level above 6 when the caller allows it', () => {
    expect(readHeading('======= Zeven =======', Number.POSITIVE_INFINITY)).toMatchObject({ level: 7, title: 'Zeven' })
  })
})

describe('readLooseHeading', () => {
  it.each([
    ['= Groep A =', 1, 'Groep A'],
    ['=== Groep B ==', 3, 'Groep B'],
    ['==Eindstand== ', 2, 'Eindstand'],
  ])('reads %j', (line, opening, title) => {
    expect(readLooseHeading(line)).toEqual({ opening, title })
  })

  it.each(['====', '== Open', 'Dicht ==', ''])('finds no heading in %j', (line) => {
    expect(readLooseHeading(line)).toBeUndefined()
  })
})

describe('the headings of a text', () => {
  const text = 'Inleiding\n== Een ==\ntekst\n=== Twee ===\n= Los =\n== Open\n'

  it('gives each heading with the start and the end of its line', () => {
    const headings = findHeadings(text)

    expect(headings.map(({ title }) => title)).toEqual(['Een', 'Twee'])
    expect(headings.map(({ end, index }) => text.slice(index, end))).toEqual(['== Een ==', '=== Twee ==='])
  })

  it('gives the headings of level 2 on their own', () => {
    expect(findSectionHeadings(text).map(({ title }) => title)).toEqual(['Een'])
  })

  it('gives the headings with one equals sign too', () => {
    expect(findLooseHeadings(text).map(({ title }) => title)).toEqual(['Een', 'Twee', 'Los'])
  })

  it('finds where the next heading starts, closed or not', () => {
    expect(findHeadingStart('a\n= b =\n=== c ===\n== d')).toBe(8)
    expect(findHeadingStart('a\n=== c ===\n== d', 2)).toBe(12)
    expect(findHeadingStart('a\n= b =')).toBeUndefined()
  })
})

/** Longer than any real line, and long enough for a quadratic reading to take many seconds. */
const length = 100_000

const spaces = ' '.repeat(length)
const signs = '='.repeat(length)

const worstLines = {
  'a long heading about the final standings that does not close': `== Eindstand na ${'1'.repeat(length)}${spaces}x`,
  'a long run of spaces in a title that does not close': `== a${spaces}b`,
  'a long run of spaces in the middle of a title': `== a${spaces}b ==`,
  'equals signs only': signs,
  'many equals signs after a title': `== a ${signs}`,
  'many equals signs after a title, and text after those': `== a ${signs}x`,
  'spaces after the equals signs, without a close': `==${spaces}x`,
  'tabs after the equals signs, without a close': `==${'\t'.repeat(length)}x`,
}

const footballBoxPage = footballBoxPages('2008/09').find((page) => page.leagueTable !== undefined)

/** Every reader of headings, with the heading that makes it read on, where it needs one. */
const readers: [name: string, heading: string, read: (text: string) => unknown][] = [
  ['readClubSquad', '== Selectie ==', readClubSquad],
  ['readCrossTable', '== Uitslagen ==', readCrossTable],
  ['readCup', '', readCup],
  ['readCupTables', '', (text) => readCupTables(text, { matches: 1, title: 'x' })],
  ['readEnglishSquad', '== Squad ==', readEnglishSquad],
  ['readEuropaLeague', '', (text) => readEuropaLeague(text, '2012/13')],
  ['readFootballBoxes', '', (text) => readFootballBoxes(text, footballBoxPage!)],
  ['readGroupStandings', '', readGroupStandings],
  ['readLeague', '', readLeague],
  ['readPlayoffs', '== Play-offs voor de UEFA Europa League ==', readPlayoffs],
  [
    'readProgrammeTables',
    '== Programma ==',
    (text) => readProgrammeTables(text, { matches: 1, season: '', title: 'x' }),
  ],
  ['readSeasonProgramme', '== Programma ==', readSeasonProgramme],
  ['readSeasonScorers', '== Doelpuntenmakers ==', readSeasonScorers],
  ['readSeasonSelection', '== Selectie ==', readSeasonSelection],
  ['readSeasonStatistics', '== Statistieken ==', readSeasonStatistics],
  ['readSeasonTransfers', '== Transfers ==', readSeasonTransfers],
  ['readSquad', '== Spelers ==', readSquad],
  ['readStandings', '== Eindstand ==', readStandings],
]

describe.each(Object.entries(worstLines))('a line with %s', (_, line) => {
  it.each(readers)('does not slow down %s', (_name, heading, read) => {
    // The line comes before the heading and after it, with a table for the readers that look.
    const text = [line, heading, line, '{| class="wikitable"', '|-', '|}', line].join('\n')
    const start = performance.now()

    read(text)

    expect(performance.now() - start).toBeLessThan(1000)
  })
})
