import { describe, expect, it } from 'vitest'

import type { ReadResult } from './read-wikipedia.ts'

import { checkGoals, checkMatches, checkResults, checkStandings } from './check-wikipedia.ts'
import { matchClubNames, playedWarning } from './league-results.ts'
import { readCupTables, readProgrammeTables } from './read-round-tables.ts'
import { readStandings } from './read-wikipedia.ts'
import { footballBoxText } from './test-football-box.ts'

const leagueTitle = 'Eredivisie 2007/08 (mannenvoetbal)'
const cupTitle = 'KNVB Beker 2007/08 (mannen)'

function league(change?: (text: string) => string) {
  const read = readLeaguePage(change)

  if (read.kind === 'error') {
    throw new Error(read.message)
  }

  return read
}

function readLeaguePage(change: (text: string) => string = (text) => text) {
  return readProgrammeTables(change(footballBoxText(leagueTitle)), {
    matches: 34,
    season: '2007/08',
    title: leagueTitle,
  })
}

const leagueError = (change: (text: string) => string) => {
  const read = readLeaguePage(change)

  return read.kind === 'error' ? read.message : null
}

const readCupPage = (change: (text: string) => string = (text) => text) =>
  readCupTables(change(footballBoxText(cupTitle)), { matches: 2, title: cupTitle })

function cup(change?: (text: string) => string) {
  const read = readCupPage(change)

  if (read.kind === 'error') {
    throw new Error(read.message)
  }

  return read.matches
}

const cupError = (change: (text: string) => string) => {
  const read = readCupPage(change)

  return read.kind === 'error' ? read.message : null
}

/** The row of a club in a table worked out from results. */
function tallyOf(results: ReadResult[], club: string) {
  const goals = results
    .filter((result) => result.homeClub === club || result.awayClub === club)
    .map((result) =>
      result.homeClub === club ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals],
    )

  return {
    drawn: goals.filter(([ours, theirs]) => ours === theirs).length,
    goalsAgainst: goals.reduce((sum, [, theirs]) => sum + theirs!, 0),
    goalsFor: goals.reduce((sum, [ours]) => sum + ours!, 0),
    lost: goals.filter(([ours, theirs]) => ours! < theirs!).length,
    played: goals.length,
    won: goals.filter(([ours, theirs]) => ours! > theirs!).length,
  }
}

describe('the programme of the Eredivisie 2007/08', () => {
  const read = league()
  const table = readStandings(footballBoxText(leagueTitle))
  const rows = table.kind === 'read' ? table.rows : []
  const named = matchClubNames(read.results, rows)

  it('has our 34 matches, one in each round, 17 at home', () => {
    expect(read.matches).toHaveLength(34)
    expect(checkMatches(read.matches)).toEqual([])
    expect(new Set(read.matches.map((match) => match.round))).toEqual(
      new Set(Array.from({ length: 34 }, (_, index) => `Speelronde ${index + 1}`)),
    )
  })

  it('reads a match with its day in the right year, the stadium and no field the page lacks', () => {
    expect(read.matches[0]).toMatchObject({
      attendance: null,
      competition: 'Eredivisie',
      goals: null,
      goalsAgainst: 0,
      goalsFor: 0,
      home: true,
      kickoffAt: null,
      matchDate: '2007-08-17',
      opponent: 'Willem II',
      opponentPage: 'Willem II (voetbalclub)',
      referee: null,
      round: 'Speelronde 1',
      stadium: 'Abe Lenstra Stadion',
      status: 'played',
    })
    expect(read.matches.find((match) => match.round === 'Speelronde 34')?.matchDate).toMatch(/^2008-04-/u)
  })

  it('keeps the round of a match that was played later, under its second heading', () => {
    // "Inhaal Eredivisie 2007/08 Ronde 17" stands after round 19.
    const late = read.results.filter((result) => result.round === 17)

    expect(late).toHaveLength(9)
    expect(new Set(late.map((result) => result.playedOn)).size).toBeGreaterThan(1)
    expect(read.results.filter((result) => result.round === 28)).toHaveLength(9)
  })

  it('keeps the stadium of VVV-Venlo with its dashes, and reads the clubs of its match', () => {
    const match = read.matches.find((found) => found.opponent === 'VVV-Venlo' && !found.home)

    expect(match?.stadium).toBe('Seacon Stadion - De Koel -')
  })

  it('has the 306 results, nine in every round with all 18 clubs, under the names of the table', () => {
    expect(rows).toHaveLength(18)
    expect(checkStandings(rows, undefined)).toEqual([])
    expect(read.unread).toEqual([])
    expect(named.results).toHaveLength(306)
    expect(named.strangers).toEqual([])
    expect(playedWarning(named.results, rows, named.strangers)).toBeUndefined()
    expect(checkResults(named.results)).toEqual([])
    for (let round = 1; round <= 34; round++) {
      const clubs = named.results
        .filter((result) => result.round === round)
        .flatMap((result) => [result.homeClub, result.awayClub])

      expect(new Set(clubs).size, `round ${round}`).toBe(18)
      expect(clubs, `round ${round}`).toHaveLength(18)
    }
  })

  it('adds up to the final table, with sc Heerenveen fifth after round 34', () => {
    for (const row of rows) {
      const { drawn, goalsAgainst, goalsFor, lost, played, won } = row

      expect(tallyOf(named.results, row.club), row.club).toEqual({
        drawn,
        goalsAgainst,
        goalsFor,
        lost,
        played,
        won,
      })
    }

    // The order of `placePerRoundOf` of the site: points, goal difference, goals for.
    const order = rows
      .map((row) => tallyOf(named.results, row.club))
      .map((tally, index) => ({ ...tally, club: rows[index]!.club, points: 3 * tally.won + tally.drawn }))
      .sort(
        (a, b) =>
          b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor,
      )

    expect(order.findIndex((tally) => tally.club === 'sc Heerenveen')).toBe(4)
  })

  it('gives an error, with the page, when a row of ours or the page has another shape', () => {
    const first = '[[Abe Lenstra Stadion]]\n|0-0'

    expect(leagueError((text) => text.replace(first, '[[Abe Lenstra Stadion]]\n|'))).toBe(
      `the page '${leagueTitle}': Speelronde 1 (Eredivisie) has no result`,
    )
    expect(leagueError((text) => text.replace('|width=100|[[17 augustus]]', '|width=100|'))).toContain(
      'Speelronde 1 (Eredivisie) has a date we do not know',
    )
    expect(leagueError((text) => text.replace(first, `${first}\n|extra`))).toContain('a row we do not know')
    expect(leagueError((text) => text.replace("'''Eredivisie 2007/08 Ronde 2'''", "'''Ronde 2'''"))).toContain(
      'a heading we do not know',
    )
    expect(leagueError((text) => text.replace('== Programma ==', '== Schema =='))).toContain(
      'has no table under Programma',
    )
    expect(
      leagueError((text) =>
        text.replace('[[sc Heerenveen]] - [[Willem II (voetbalclub)|Willem II]]', '[[PSV]] - [[Willem II]]'),
      ),
    ).toContain('it has 33 matches of sc Heerenveen, not 34')
  })

  it('leaves out a match of other clubs without a score, and names it', () => {
    const changed = league((text) => text.replace('|4-0\n', '|\n'))

    expect(changed.results).toHaveLength(305)
    expect(changed.unread).toEqual(['Ronde 1: AZ - VVV-Venlo has no day or score we know'])
  })
})

describe('the KNVB Beker 2007/08', () => {
  const matches = cup()

  it('has our two matches and none of Jong sc Heerenveen', () => {
    expect(
      matches.map(({ goalsAgainst, goalsFor, home, matchDate, opponent, round }) => [
        round,
        matchDate,
        opponent,
        home,
        goalsFor,
        goalsAgainst,
      ]),
    ).toEqual([
      ['Tweede ronde', '2007-09-26', 'Argon', false, 3, 0],
      ['Derde ronde', '2007-10-31', 'Ajax', false, 1, 3],
    ])
    expect(matches.every((match) => checkGoals(match) === undefined)).toBe(true)
  })

  it('reads the goals with their minutes, and which club each counts for', () => {
    expect(matches[1]?.goals?.map((goal) => [goal.minute, goal.ours, goal.player, goal.playerPage])).toEqual([
      [8, false, 'John Heitinga', 'John Heitinga'],
      [29, false, 'Hedwiges Maduro', 'Hedwiges Maduro'],
      [67, false, 'Klaas-Jan Huntelaar', 'Klaas-Jan Huntelaar'],
      [72, true, 'Michael Bradley', 'Michael Bradley (voetballer)'],
    ])
  })

  it('reads a penalty, an own goal and added time', () => {
    const [argon] = cup((text) =>
      text
        .replace("16' [[Gerald Sibon]] 0-1", "16' [[Gerald Sibon]] ([[Strafschop|pen]]) 0-1")
        .replace("30' [[Miralem Sulejmani]] 0-2", "45+2' [[Miralem Sulejmani]] (e.d.) 0-2"),
    )

    expect(argon?.goals?.slice(0, 2)).toMatchObject([
      { minute: 16, ownGoal: false, penalty: true },
      { minute: 45, ownGoal: true, penalty: false, stoppageMinutes: 2 },
    ])
  })

  it('keeps the match without scorers, with the problem, when a part of the scorers is unknown', () => {
    const [argon] = cup((text) => text.replace("16' [[Gerald Sibon]] 0-1", '[[Gerald Sibon]]'))

    expect(argon?.goals).toBeNull()
    expect(argon?.goalsProblem).toContain('the scorers have a part we do not know')
  })

  it('gives an error for a row of ours it does not know, and for another number of matches', () => {
    expect(cupError((text) => text.replace('| 0 – 3 (0 – 2)', '| 0 – 3 n.v. (0 – 2)'))).toContain(
      'a row of ours has no result we know',
    )
    expect(
      cupError((text) => text.replace('| 26 september 2007\n| [[SV Argon', '| september\n| [[SV Argon')),
    ).toContain('has a date we do not know')
    expect(cupError((text) => text.replace("– '''[[sc Heerenveen]]'''", "– '''[[Heerenveen]]'''"))).toContain(
      'a row of ours we do not know',
    )
    expect(cupError((text) => text.replace("– '''[[sc Heerenveen]]'''", "– '''[[PSV]]'''"))).toContain(
      'it has 1 matches of sc Heerenveen, not 2',
    )
  })
})
