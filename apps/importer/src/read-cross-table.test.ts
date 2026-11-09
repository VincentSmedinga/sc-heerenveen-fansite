import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { readCrossTable } from './read-cross-table.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const eredivisie199091 = fixture('wikipedia-cross-table-1990-91.wiki')
const eersteDivisie199293 = fixture('wikipedia-cross-table-eerste-divisie-1992-93.wiki')

/** Twelve made-up clubs, `Club 1` to `Club 12`. */
const clubs = Array.from({ length: 12 }, (_, index) => `Club ${index + 1}`)

/** A made-up page with a cross table: each home club wins 1 – 0, except where `cells` says. */
function page(cells: Record<string, string> = {}, { heading = '== Uitslagen ==', rows = clubs } = {}) {
  return [
    heading,
    '{| class="wikitable"',
    '|-',
    '! width=180|Thuis (beneden) / Uit (rechts)',
    ...clubs.map((club) => `! width=35|[[${club}|C]]`),
    ...rows.flatMap((home) => [
      '|-',
      `|align=right|'''[[${home}]]'''||${clubs
        .map((away) => cells[`${home}-${away}`] ?? (home === away ? 'bgcolor="#999999"| ' : 'bgcolor="#C0F0D0"|1 – 0'))
        .join('||')}`,
    ]),
    '|}',
    '',
    '== Topscorers ==',
  ].join('\n')
}

const resultsOf = (text: string) => {
  const read = readCrossTable(text)

  return read.kind === 'read' ? read : { results: [], unread: [] }
}

describe('readCrossTable', () => {
  it('reads every result of the Eredivisie of 1990/91, with who was at home', () => {
    const read = readCrossTable(eredivisie199091)

    expect(read).toMatchObject({ kind: 'read', unread: [] })

    const { results } = resultsOf(eredivisie199091)

    // Eighteen clubs play each other at home and away.
    expect(results).toHaveLength(18 * 17)
    expect(results.find((one) => one.homePage === 'Sc Heerenveen' && one.awayPage === 'AFC Ajax')).toEqual({
      awayClub: 'Ajax',
      awayGoals: 4,
      awayPage: 'AFC Ajax',
      homeClub: 'sc Heerenveen',
      homeGoals: 1,
      homePage: 'Sc Heerenveen',
    })
    expect(results.find((one) => one.homePage === 'AFC Ajax' && one.awayPage === 'Sc Heerenveen')).toMatchObject({
      awayGoals: 0,
      homeGoals: 4,
    })
    // The club is named as its row shows it, the page is the article it links to.
    expect(results.find((one) => one.homePage === 'ADO Den Haag' && one.awayPage === 'Sc Heerenveen')).toMatchObject({
      awayGoals: 2,
      homeClub: 'FC Den Haag',
      homeGoals: 3,
    })
  })

  it('reads the table of the league on a page of the Eerste divisie, and not the play-offs under it', () => {
    const { results, unread } = resultsOf(eersteDivisie199293)
    const ours = results.filter((one) => [one.awayPage, one.homePage].includes('Sc Heerenveen'))

    expect(unread).toEqual([])
    expect(results).toHaveLength(18 * 17)
    expect(ours).toHaveLength(34)
    // Fortuna Sittard played us in the play-offs only: the page has that in a later table.
    expect(results.filter((one) => one.homePage === 'Fortuna Sittard')).toEqual([])
    // A score with an asterisk for a footnote is the score.
    expect(results.find((one) => one.homePage === 'RBC (voetbalclub)' && one.awayClub === 'Telstar')).toMatchObject({
      awayGoals: 1,
      homeGoals: 2,
    })
  })

  it('reads a wide score and a long name in a nowrap template, and a cell without attributes', () => {
    const text = page({ 'Club 1-Club 2': '{{nowrap|10 – 0}}', 'Club 2-Club 1': '2-3' }).replace(
      "'''[[Club 3]]'''",
      "'''{{nowrap|[[Club 3|Club Drie]]}}'''",
    )
    const { results } = resultsOf(text)

    expect(results.find((one) => one.homePage === 'Club 3')?.homeClub).toBe('Club Drie')

    expect(results.find((one) => one.homeClub === 'Club 1' && one.awayClub === 'Club 2')).toMatchObject({
      awayGoals: 0,
      homeGoals: 10,
    })
    expect(results.find((one) => one.homeClub === 'Club 2' && one.awayClub === 'Club 1')).toMatchObject({
      awayGoals: 3,
      homeGoals: 2,
    })
  })

  it('leaves out an empty cell and names a cell that is no score', () => {
    const read = resultsOf(page({ 'Club 3-Club 4': 'bgcolor="#FFFFFF"| ', 'Club 5-Club 6': 'bgcolor="#FFFFFF"|afg.' }))

    expect(read.results).toHaveLength(12 * 11 - 2)
    expect(read.unread).toEqual([
      { awayClub: 'Club 6', awayPage: 'Club 6', homeClub: 'Club 5', homePage: 'Club 5', text: 'afg.' },
    ])
  })

  it('says why a page has no table it can read', () => {
    expect(readCrossTable('== Eindstand ==\ntekst')).toEqual({ kind: 'error', problem: 'no-heading' })
    expect(readCrossTable('== Uitslagen ==\nZie de wedstrijden.\n== Topscorers ==\n{|\n|}')).toEqual({
      kind: 'error',
      problem: 'no-table',
    })
    expect(readCrossTable('== Uitslagen ==\n{| class="wikitable"\n|-\n! Club\n! Punten\n|-\n| A || 3\n|}')).toEqual({
      kind: 'error',
      problem: 'no-clubs',
    })
  })

  it('refuses a table whose rows do not fit its columns', () => {
    // A row is missing.
    expect(readCrossTable(page({}, { rows: clubs.slice(1) }))).toEqual({
      detail: '11 rows for 12 columns',
      kind: 'error',
      problem: 'rows-differ',
    })
    // A club has a score against itself: the columns are not in the order the reader thinks.
    expect(readCrossTable(page({ 'Club 2-Club 2': '1 – 0' }))).toEqual({
      detail: 'the row of Club 2',
      kind: 'error',
      problem: 'rows-differ',
    })
    // A row of a club the columns do not have.
    expect(readCrossTable(page({}, { rows: [...clubs.slice(1), 'Club 99'] }))).toMatchObject({
      detail: 'the row of Club 99',
      problem: 'rows-differ',
    })
  })
})
