import type { TestDatabase } from '@fansite/db/test-database'
import type { ReportMatch, MatchReport as SharedReport } from '@fansite/shared/match-report'

import {
  adminUsers,
  matchAppearances,
  matchCards,
  matchEdits,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { checkMatchReport } from '@fansite/shared/match-report'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteEvent, OldSiteLineupEntry, OldSiteMatch, OldSitePlayer } from './old-site-file.ts'

import { importOldSiteClubs, oldSiteClubIds } from './old-site-clubs.ts'
import { readOldSiteData } from './old-site-file.ts'
import { deriveOldSiteGoals, importOldSiteGoals, orderedOldSiteGoalEvents } from './old-site-goals.ts'
import { importOldSiteLineups } from './old-site-lineups.ts'
import { deriveOldSiteMatches, importOldSiteMatches } from './old-site-matches.ts'
import { importOldSitePlayers } from './old-site-players.ts'
import { deriveOldSiteReport, judgeOldSiteReport, looseNameKey } from './old-site-report.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const zeroStatistics = {
  awayCorners: 0,
  awayFouls: 0,
  awayOffside: 0,
  homeCorners: 0,
  homeFouls: 0,
  homeOffside: 0,
}

const oldPlayers: OldSitePlayer[] = [{ code: 'rene.hake', firstName: 'René', infix: null, lastName: 'Hake' }]

/** Fourteen players of ours; the first eleven start. A code is `<word>.speler`. */
const ourWords = ['aap', 'bes', 'cas', 'dik', 'eef', 'fok', 'gijs', 'hup', 'ivo', 'jan', 'kor', 'lex', 'mik', 'nol']
const ourCode = (index: number) => `${ourWords[index]}.speler`
const ourName = (index: number) => `${ourWords[index]!.charAt(0).toUpperCase()}${ourWords[index]!.slice(1)} Speler`

/** Fourteen players of the opponent; the first eleven start. */
const theirName = (index: number) => `Tegen ${ourWords[index]!.charAt(0).toUpperCase()}${ourWords[index]!.slice(1)}`

const entry = (
  who: { code?: string; name?: string },
  minuteIn: number,
  minuteOut: number,
  order: number,
): OldSiteLineupEntry => ({
  minuteIn,
  minuteOut,
  order,
  playerCode: who.code ?? null,
  playerName: who.name ?? null,
})

/**
 * A line-up of 11 players and 3 on the bench for both teams, nobody replaced: all play to
 * minute 90, except what `change` says (index 0 to 13 of ours and of the opponent).
 */
function lineup(
  change: {
    ours?: Record<number, [number, number]>
    theirs?: Record<number, [number, number]>
  } = {},
): OldSiteLineupEntry[] {
  const list: OldSiteLineupEntry[] = []

  for (let index = 0; index < 14; index += 1) {
    const [ownIn, ownOut] = change.ours?.[index] ?? (index < 11 ? [0, 90] : [0, 0])
    const [otherIn, otherOut] = change.theirs?.[index] ?? (index < 11 ? [0, 90] : [0, 0])

    // A player of the bench who does not come on is not in the files.
    if (index < 11 || ownIn > 0) {
      list.push(entry({ code: ourCode(index) }, ownIn, ownOut, index + 1))
    }
    if (index < 11 || otherIn > 0) {
      list.push(entry({ name: theirName(index) }, otherIn, otherOut, index + 1))
    }
  }

  return list
}

/** A league match at home that sc Heerenveen won 2-1, with the goals of a normal report. */
function oldMatch(overrides: Partial<OldSiteMatch> = {}): OldSiteMatch {
  return {
    attendance: null,
    code: 'nec.thuis',
    competition: 1,
    dateTime: '2001-09-01 20:00:00',
    events: goals(),
    lineup: lineup(),
    note: null,
    referee: null,
    result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 1, note: null },
    round: 1,
    season: '0102',
    statistics: { ...zeroStatistics },
    ...overrides,
  }
}

const event = (
  kind: 1 | 2 | 3 | 4,
  minute: number,
  who: { code?: string; name?: string },
  more: Partial<OldSiteEvent> = {},
): OldSiteEvent => ({
  assist: null,
  event: kind,
  kind: null,
  minute,
  playerCode: who.code ?? null,
  playerName: who.name ?? null,
  ...more,
})

/** Two goals of ours (the second with an assist) and one of the opponent. */
function goals(): OldSiteEvent[] {
  return [
    event(1, 10, { code: ourCode(8) }),
    event(1, 30, { name: theirName(9) }),
    event(1, 80, { code: ourCode(9) }, { assist: ourCode(8) }),
  ]
}

/** The report of a match as the step works it out, with the goals the step before stores. */
function report(match: OldSiteMatch, extraTime = false) {
  const byCode = new Map(oldPlayers.map((player) => [player.code, player]))
  const [one] = deriveOldSiteMatches([match])
  const score = { against: one!.values!.goalsAgainst!, for: one!.values!.goalsFor! }
  const derived = deriveOldSiteGoals(match, score, byCode)
  const events = orderedOldSiteGoalEvents(match)

  return deriveOldSiteReport(match, {
    extraTime,
    goals: derived.goals.map((goal, index) => ({ event: events[index]!, goal })),
    hasPlayerRow: () => true,
    oldPlayers: byCode,
    season: '2001/02',
  })
}

describe('the report of a match', () => {
  it('has the players of both teams, ours by their full name, with the line-up first', () => {
    const { appearances, opponentComplete } = report(oldMatch())

    expect(appearances).toHaveLength(22)
    expect(appearances[0]).toEqual({
      minuteIn: 0,
      minuteOut: 90,
      name: ourName(0),
      ours: true,
      playerKey: `2001/02|${looseNameKey(ourName(0))}`,
      starter: true,
    })
    expect(appearances[1]).toMatchObject({ name: theirName(0), ours: false, playerKey: null, starter: true })
    expect(opponentComplete).toBe(true)
  })

  it('says the opponent is not complete without exactly eleven players in his line-up', () => {
    const short = oldMatch({ lineup: lineup().filter((one) => one.playerName !== theirName(10)) })

    expect(report(short).opponentComplete).toBe(false)
  })

  it('takes a player in as a substitute when he comes on at the minute another player goes off', () => {
    const { anomalies, appearances, substitutions } = report(
      oldMatch({ lineup: lineup({ ours: { 10: [0, 60], 11: [60, 90] } }) }),
    )

    expect(anomalies).toEqual([])
    expect(substitutions).toHaveLength(1)
    expect(substitutions[0]).toMatchObject({ minute: 60, ours: true })
    expect(appearances[substitutions[0]!.out]?.name).toBe(ourName(10))
    expect(appearances[substitutions[0]!.in]?.name).toBe(ourName(11))
  })

  it('takes the order of the file when two players come on at the same minute', () => {
    const { anomalies, appearances, substitutions } = report(
      oldMatch({ lineup: lineup({ ours: { 2: [0, 60], 10: [0, 60], 11: [60, 90], 12: [60, 90] } }) }),
    )

    // The first to go off in the file is the first to be replaced: index 2 comes before 10.
    expect(anomalies).toEqual([])
    expect(substitutions.map((one) => [appearances[one.out]?.name, appearances[one.in]?.name])).toEqual([
      [ourName(2), ourName(11)],
      [ourName(10), ourName(12)],
    ])
  })

  it('replaces a player who came on earlier, and not a player who is on the bench', () => {
    const { anomalies, appearances, substitutions } = report(
      oldMatch({ lineup: lineup({ ours: { 10: [0, 50], 11: [50, 80], 12: [80, 90] } }) }),
    )

    expect(anomalies).toEqual([])
    expect(substitutions.map((one) => [appearances[one.out]?.name, appearances[one.in]?.name, one.minute])).toEqual([
      [ourName(10), ourName(11), 50],
      [ourName(11), ourName(12), 80],
    ])
  })

  it('does not replace a player who is sent off, and has no early exit for him', () => {
    const { anomalies, cards, substitutions } = report(
      oldMatch({
        events: [...goals(), event(4, 70, { code: ourCode(3) })],
        lineup: lineup({ ours: { 3: [0, 70] } }),
      }),
    )

    expect(anomalies).toEqual([])
    expect(substitutions).toEqual([])
    expect(cards).toEqual([{ appearance: 6, kind: 'rood', minute: 70 }])
  })

  it('counts the end of a match with extra time as the last minute anyone played', () => {
    const extra = oldMatch({
      lineup: lineup({
        ours: { 10: [0, 105], 11: [105, 120], ...Object.fromEntries([...Array(10).keys()].map((i) => [i, [0, 120]])) },
      }),
    })

    expect(report(extra, true).anomalies).toEqual([])
  })

  it('names a substitute whom nobody replaces, and a player who goes off early without a substitute', () => {
    const { anomalies, substitutions } = report(
      oldMatch({ lineup: lineup({ ours: { 4: [0, 40], 10: [0, 60], 11: [55, 90] } }) }),
    )

    expect(substitutions).toEqual([])
    expect(anomalies.map((one) => one.code).toSorted()).toEqual(['early-exit', 'early-exit', 'no-substitute-out'])
  })

  it('leaves a name that is twice in a team out the second time', () => {
    const twice = oldMatch({ lineup: [...lineup(), entry({ code: ourCode(0) }, 70, 90, 20)] })
    const { anomalies, appearances } = report(twice)

    expect(appearances).toHaveLength(22)
    expect(anomalies.map((one) => one.code)).toContain('duplicate-player')
  })

  it('makes minute 0 of a yellow card an empty minute', () => {
    const { anomalies, cards } = report(oldMatch({ events: [...goals(), event(2, 0, { code: ourCode(2) })] }))

    expect(anomalies).toEqual([])
    expect(cards).toEqual([{ appearance: 4, kind: 'geel', minute: null }])
  })

  it('gives a red or yellow-red card without a minute the minute the player left', () => {
    const { anomalies, cards } = report(
      oldMatch({
        events: [...goals(), event(3, 0, { name: theirName(5) })],
        lineup: lineup({ theirs: { 5: [0, 77] } }),
      }),
    )

    expect(anomalies).toEqual([])
    expect(cards.filter((card) => card.kind === 'geel-rood')).toEqual([
      { appearance: 11, kind: 'geel-rood', minute: 77 },
    ])
  })

  it('leaves a red card out that has no minute and no minute of leaving, and says so', () => {
    const { anomalies, cards } = report(
      oldMatch({
        events: [...goals(), event(4, 0, { code: ourCode(3) })],
        lineup: lineup({ ours: { 3: [0, 0] } }),
      }),
    )

    expect(cards).toEqual([])
    expect(anomalies.map((one) => one.code)).toContain('red-card-without-minute')
  })

  it('leaves a card out for someone who is not in the line-up, such as the trainer', () => {
    const { cards, notes } = report(
      oldMatch({ events: [...goals(), event(2, 0, { code: 'foppe.dehaan' }), event(2, 12, { code: ourCode(2) })] }),
    )

    expect(cards).toHaveLength(1)
    expect(notes).toMatchObject([{ code: 'card-not-in-lineup', text: expect.stringContaining('foppe.dehaan') }])
  })

  it('keeps one card of a kind for a player', () => {
    const { cards, notes } = report(
      oldMatch({ events: [...goals(), event(2, 12, { code: ourCode(2) }), event(2, 40, { code: ourCode(2) })] }),
    )

    expect(cards).toHaveLength(1)
    expect(notes.map((one) => one.code)).toEqual(['card-twice'])
  })

  it('gives a yellow-red card without a yellow card a yellow card without a minute before it, and says so', () => {
    const { anomalies, cards, notes } = report(
      oldMatch({
        events: [...goals(), event(3, 0, { name: theirName(5) })],
        lineup: lineup({ theirs: { 5: [0, 77] } }),
      }),
    )

    expect(anomalies).toEqual([])
    expect(cards).toEqual([
      { appearance: 11, kind: 'geel', minute: null },
      { appearance: 11, kind: 'geel-rood', minute: 77 },
    ])
    expect(notes).toMatchObject([
      {
        about: { kind: 'geel', subject: theirName(5) },
        code: 'yellow-derived',
        text: expect.stringContaining('added'),
      },
    ])
  })

  it('adds nothing to a yellow-red card of a player who has a yellow card, whatever the order in the file', () => {
    const before = report(
      oldMatch({
        events: [...goals(), event(2, 30, { code: ourCode(2) }), event(3, 70, { code: ourCode(2) })],
      }),
    )
    const after = report(
      oldMatch({
        events: [...goals(), event(3, 70, { code: ourCode(2) }), event(2, 30, { code: ourCode(2) })],
      }),
    )

    expect(before.cards).toEqual([
      { appearance: 4, kind: 'geel', minute: 30 },
      { appearance: 4, kind: 'geel-rood', minute: 70 },
    ])
    expect(after.cards.map((card) => card.kind).toSorted()).toEqual(['geel', 'geel-rood'])
    expect(before.notes).toEqual([])
    expect(after.notes).toEqual([])
  })
})

describe('the links from goals and assists to the players', () => {
  it('links a scorer of ours by his code, an assist by the code, and the opponent by his name', () => {
    const { appearances, goalLinks } = report(oldMatch())
    const name = (place: null | number) => (place === null ? null : appearances[place]?.name)

    expect(goalLinks.map((link) => [name(link.appearance), name(link.assist)])).toEqual([
      [ourName(8), null],
      [theirName(9), null],
      [ourName(9), ourName(8)],
    ])
  })

  it('treats a spelling with and without an accent as the same name', () => {
    const accented = oldMatch({
      events: [
        event(1, 10, { name: 'André van Gogh' }),
        event(1, 30, { name: 'Tegen Hup' }, { assist: 'Tegen Ívo' }),
        event(1, 80, { code: ourCode(9) }),
      ],
      lineup: [
        ...lineup().filter((one) => one.playerName !== theirName(7)),
        entry({ name: 'Andre van Gogh' }, 0, 90, 8),
      ],
    })
    const swapped = oldMatch({ ...accented, events: [accented.events[0]!, accented.events[2]!, accented.events[1]!] })
    const { appearances, goalLinks } = report({
      ...swapped,
      events: [
        event(1, 10, { code: ourCode(9) }),
        event(1, 30, { name: 'André van Gogh' }),
        event(1, 80, { name: theirName(1) }, { assist: 'Andre Van Gogh' }),
      ],
      lineup: [...swapped.lineup],
    })

    expect(appearances.some((one) => one.name === 'Andre van Gogh')).toBe(true)
    expect(goalLinks[1]?.appearance).not.toBeNull()
    expect(goalLinks[2]?.assist).toBe(goalLinks[1]?.appearance)
  })

  it('leaves an assist empty when it is not a player of the team of the scorer, and notes it', () => {
    const { goalLinks, notes } = report(
      oldMatch({
        events: [
          event(1, 10, { code: ourCode(8) }, { assist: theirName(2) }),
          event(1, 30, { name: theirName(9) }, { assist: 'Niemand Bekend' }),
          event(1, 80, { code: ourCode(9) }),
        ],
      }),
    )

    expect(goalLinks.map((link) => link.assist)).toEqual([null, null, null])
    expect(notes.map((one) => one.code)).toEqual(['assist-not-found', 'assist-not-found'])
  })

  it('leaves the assist of a penalty or of the scorer himself empty', () => {
    const { goalLinks, notes } = report(
      oldMatch({
        events: [
          event(1, 10, { code: ourCode(8) }, { assist: ourCode(7), kind: 'penalty' }),
          event(1, 30, { name: theirName(9) }),
          event(1, 80, { code: ourCode(9) }, { assist: ourCode(9) }),
        ],
      }),
    )

    expect(goalLinks.map((link) => link.assist)).toEqual([null, null, null])
    expect(notes.map((one) => one.code)).toEqual(['assist-empty', 'assist-empty'])
  })

  it('links an own goal to the player of the team that does not benefit', () => {
    const { appearances, goalLinks } = report(
      oldMatch({
        events: [
          event(1, 10, { code: ourCode(8) }),
          event(1, 30, { code: ourCode(2) }, { kind: 'eigen doelpunt' }),
          event(1, 80, { name: theirName(6) }, { kind: 'eigen doelpunt' }),
        ],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 1, note: null },
      }),
    )

    expect(goalLinks.map((link) => appearances[link.appearance!]?.name)).toEqual([ourName(8), ourName(2), theirName(6)])
  })
})

describe('the status of a report', () => {
  const played: ReportMatch = {
    extraTime: false,
    goalsAgainst: 1,
    goalsFor: 2,
    penaltiesAgainst: null,
    penaltiesFor: null,
    status: 'played',
  }
  const stored = [
    { minute: 10, ours: true, ownGoal: false, penalty: false },
    { minute: 30, ours: false, ownGoal: false, penalty: false },
    { minute: 80, ours: true, ownGoal: false, penalty: false },
  ]

  it('is klaar when the rules find no error and nothing is left out', () => {
    const derived = report(oldMatch())

    expect(judgeOldSiteReport(derived, played, stored, derived.goalLinks)).toMatchObject({ status: 'klaar' })
  })

  it('is bezig when the rules find an error, such as ten players in the line-up', () => {
    const derived = report(oldMatch({ lineup: lineup().filter((one) => one.playerCode !== ourCode(4)) }))
    const verdict = judgeOldSiteReport(derived, played, stored, derived.goalLinks)

    expect(verdict.status).toBe('bezig')
    expect(verdict.check.errors.map((issue) => issue.code)).toContain('lineup-size')
  })

  it('is bezig when the goals do not add up to the score', () => {
    const derived = report(oldMatch())
    const verdict = judgeOldSiteReport(derived, played, stored.slice(0, 2), derived.goalLinks)

    expect(verdict.status).toBe('bezig')
    expect(verdict.check.errors.map((issue) => issue.code)).toContain('goals-differ-from-score')
  })

  it('is bezig when something is doubtful although the rules find no error', () => {
    const derived = report(oldMatch({ lineup: lineup({ ours: { 4: [0, 40] } }) }))
    const verdict = judgeOldSiteReport(derived, played, stored, derived.goalLinks)

    expect(verdict.check.errors).toEqual([])
    expect(verdict).toMatchObject({ status: 'bezig' })
  })
})

describe('the step opstellingen', () => {
  const oldClubs = [
    { code: 'nec', country: 'NL', name: 'NEC' },
    { code: 'ajax', country: 'NL', name: 'Ajax' },
  ]
  let adminId = 0

  beforeEach(async () => {
    for (const table of ['match_edits', 'match_statistics', 'matches', 'players', 'clubs', 'admin_users']) {
      await database.pool.query(`DELETE FROM ${table}`)
    }
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
    adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  })

  /** Runs the steps before this one, then this one; gives the report of this one. */
  async function run(list: OldSiteMatch[]) {
    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, list, oldClubs, await oldSiteClubIds(database.db, oldClubs))
    await importOldSitePlayers(database.db, list, oldPlayers)
    await importOldSiteGoals(database.db, list, oldPlayers)

    return importOldSiteLineups(database.db, list, oldPlayers)
  }

  const appearanceRows = () => database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id))
  const goalRows = () => database.db.select().from(matchGoals).orderBy(asc(matchGoals.id))

  /** Everything the step wrote, to see that a second run changes nothing. */
  async function snapshot() {
    return {
      appearances: await appearanceRows(),
      cards: await database.db.select().from(matchCards).orderBy(asc(matchCards.id)),
      goals: await goalRows(),
      reports: await database.db.select().from(matchReports).orderBy(asc(matchReports.matchId)),
      substitutions: await database.db.select().from(matchSubstitutions).orderBy(asc(matchSubstitutions.id)),
    }
  }

  it('makes a report with the source Oude fansite, no formation and no editor, and klaar when the rules pass', async () => {
    const result = await run([oldMatch({ events: [...goals(), event(2, 0, { code: ourCode(2) })] })])
    const [row] = await database.db.select().from(matchReports)

    expect(result).toMatchObject({ changed: 0, created: 1, skipped: 0, unchanged: 0 })
    expect(result.lines[0]).toBe('1 reports: 1 klaar, 0 bezig')
    expect(row).toMatchObject({
      formationOpponent: null,
      formationOurs: null,
      opponentComplete: true,
      savedBy: null,
      source: 'Oude fansite',
      status: 'klaar',
    })
  })

  it('makes the players: ours linked to their row of the season, the opponent with a name only', async () => {
    await run([oldMatch()])

    const rows = await appearanceRows()
    const ours = rows.filter((row) => row.ours)
    const theirs = rows.filter((row) => !row.ours)

    expect(rows).toHaveLength(22)
    expect(ours.every((row) => row.playerId !== null && !row.captain && row.shirtNumber === null)).toBe(true)
    expect(theirs.every((row) => row.playerId === null && !row.captain && row.shirtNumber === null)).toBe(true)
    expect(rows.filter((row) => row.starter)).toHaveLength(22)
    expect(ours[0]).toMatchObject({ name: ourName(0) })
  })

  it('makes the substitutions and the cards', async () => {
    await run([
      oldMatch({
        events: [
          ...goals(),
          event(2, 0, { code: ourCode(2) }),
          event(2, 33, { name: theirName(4) }),
          event(4, 70, { name: theirName(7) }),
        ],
        lineup: lineup({ ours: { 10: [0, 60], 11: [60, 90] }, theirs: { 7: [0, 70] } }),
      }),
    ])

    const rows = await appearanceRows()
    const nameOf = (id: number) => rows.find((row) => row.id === id)?.name
    const subs = await database.db.select().from(matchSubstitutions)
    const cards = await database.db.select().from(matchCards).orderBy(asc(matchCards.id))

    expect(subs.map((sub) => [nameOf(sub.appearanceOutId), nameOf(sub.appearanceInId), sub.minute, sub.ours])).toEqual([
      [ourName(10), ourName(11), 60, true],
    ])
    expect(cards.map((card) => [nameOf(card.appearanceId), card.kind, card.minute, card.ours])).toEqual([
      [ourName(2), 'geel', null, true],
      [theirName(4), 'geel', 33, false],
      [theirName(7), 'rood', 70, false],
    ])
  })

  it('links the goals and assists to the players of the report', async () => {
    await run([oldMatch()])

    const rows = await appearanceRows()
    const nameOf = (id: null | number) => rows.find((row) => row.id === id)?.name ?? null

    expect((await goalRows()).map((goal) => [nameOf(goal.appearanceId), nameOf(goal.assistAppearanceId)])).toEqual([
      [ourName(8), null],
      [theirName(9), null],
      [ourName(9), ourName(8)],
    ])
  })

  it('gives a match without a line-up no report, also when it has goals', async () => {
    const result = await run([oldMatch({ lineup: [] })])

    expect(result).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 0 })
    expect(await database.db.select().from(matchReports)).toEqual([])
    expect((await goalRows()).every((goal) => goal.appearanceId === null)).toBe(true)
  })

  it('stores a report that the rules do not approve as bezig, with the reason in the log', async () => {
    const result = await run([oldMatch({ lineup: lineup().filter((one) => one.playerCode !== ourCode(4)) })])
    const [row] = await database.db.select().from(matchReports)

    expect(row).toMatchObject({ status: 'bezig' })
    expect(result.lines[0]).toBe('1 reports: 0 klaar, 1 bezig')
    expect(result.lines).toContain('2001/02 nec.thuis: the report is bezig: rule lineup-size')
  })

  it('stores a report with a doubtful line-up as bezig and names the player', async () => {
    const result = await run([oldMatch({ lineup: lineup({ ours: { 4: [0, 40] } }) })])

    expect((await database.db.select().from(matchReports))[0]).toMatchObject({ status: 'bezig' })
    expect(result.lines.join('\n')).toContain(`${ourName(4)} goes off in minute 40 without a substitute`)
  })

  it('stores a report of a match whose goals do not add up as bezig, without links', async () => {
    await run([oldMatch({ events: goals().slice(0, 2) })])

    expect((await database.db.select().from(matchReports))[0]).toMatchObject({ status: 'bezig' })
    expect(await goalRows()).toEqual([])
  })

  it('changes nothing in a second run, and keeps every id', async () => {
    const list = [
      oldMatch({
        events: [...goals(), event(2, 0, { code: ourCode(2) }), event(4, 70, { name: theirName(7) })],
        lineup: lineup({ ours: { 10: [0, 60], 11: [60, 90] }, theirs: { 7: [0, 70] } }),
      }),
      oldMatch({ code: 'ajax.thuis', dateTime: '2001-09-08 20:00:00', lineup: lineup({ ours: { 4: [0, 40] } }) }),
    ]

    await run(list)

    const before = await snapshot()
    const again = await importOldSiteLineups(database.db, list, oldPlayers)

    expect(again).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 2 })
    expect(await snapshot()).toEqual(before)
  })

  it('follows a change in the files in place', async () => {
    const list = [oldMatch({ lineup: lineup({ ours: { 10: [0, 60], 11: [60, 90] } }) })]

    await run(list)

    const first = await snapshot()
    const changed = [
      oldMatch({
        events: [...goals(), event(2, 5, { name: theirName(1) })],
        lineup: lineup({ ours: { 10: [0, 70], 11: [70, 90] } }),
      }),
    ]
    const result = await importOldSiteLineups(database.db, changed, oldPlayers)
    const after = await snapshot()

    expect(result).toMatchObject({ changed: 1, created: 0, unchanged: 0 })
    expect(after.appearances.map((row) => row.id)).toEqual(first.appearances.map((row) => row.id))
    expect(after.substitutions.map((sub) => sub.minute)).toEqual([70])
    expect(after.cards).toHaveLength(1)
  })

  it('removes a player who is no longer in the files, and a card with him', async () => {
    await run([oldMatch({ events: [...goals(), event(2, 5, { name: theirName(1) })] })])
    await importOldSiteLineups(
      database.db,
      [oldMatch({ events: goals(), lineup: lineup().filter((one) => one.playerName !== theirName(1)) })],
      oldPlayers,
    )

    expect(await appearanceRows()).toHaveLength(21)
    expect(await database.db.select().from(matchCards)).toEqual([])
  })

  it('leaves a report that the editors saved, goals they filled in, and a match of another source alone', async () => {
    const list = [
      oldMatch(),
      oldMatch({ code: 'ajax.thuis', dateTime: '2001-09-08 20:00:00' }),
      oldMatch({
        code: 'nec.uit',
        dateTime: '2001-09-15 20:00:00',
        events: [event(1, 5, { code: ourCode(8) }), event(1, 9, { name: theirName(9) })],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
      }),
    ]

    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, list, oldClubs, await oldSiteClubIds(database.db, oldClubs))

    const [reported, edited, other] = await database.db.select().from(matches).orderBy(asc(matches.matchDate))

    await database.db.insert(matchReports).values({
      matchId: reported!.id,
      opponentComplete: false,
      savedBy: adminId,
      source: 'Wedstrijdformulier',
      status: 'bezig',
    })
    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: adminId,
      goalsEdited: true,
      matchId: edited!.id,
      reason: 'De redactie wist het beter',
    })
    await database.db.update(matches).set({ dataSource: 'wikipedia' }).where(eq(matches.id, other!.id))
    await importOldSitePlayers(database.db, list, oldPlayers)
    await importOldSiteGoals(database.db, list, oldPlayers)

    const result = await importOldSiteLineups(database.db, list, oldPlayers)
    const [row, ...rest] = await database.db.select().from(matchReports)

    expect(result).toMatchObject({ changed: 0, created: 0, skipped: 3, unchanged: 0 })
    expect(rest).toEqual([])
    expect(row).toMatchObject({ matchId: reported!.id, opponentComplete: false, source: 'Wedstrijdformulier' })
    expect(await appearanceRows()).toEqual([])
  })

  it('makes a report for a match whose report an earlier run made, and keeps a report with no editor', async () => {
    const list = [oldMatch()]

    await run(list)
    await database.db.update(matchReports).set({ status: 'bezig' })

    const result = await importOldSiteLineups(database.db, list, oldPlayers)

    expect(result).toMatchObject({ changed: 1, created: 0 })
    expect((await database.db.select().from(matchReports))[0]).toMatchObject({ savedBy: null, status: 'klaar' })
  })
})

describe('the files of the old fansite', () => {
  it('make 566 reports with their players, substitutions and cards, and a second run changes nothing', async () => {
    for (const table of ['match_edits', 'match_statistics', 'matches', 'players', 'clubs']) {
      await database.pool.query(`DELETE FROM ${table}`)
    }

    const data = await readOldSiteData()

    await importOldSiteClubs(database.db, data.clubs)
    await importOldSiteMatches(database.db, data.matches, data.clubs, await oldSiteClubIds(database.db, data.clubs))
    await importOldSitePlayers(database.db, data.matches, data.players)
    await importOldSiteGoals(database.db, data.matches, data.players)

    const first = await importOldSiteLineups(database.db, data.matches, data.players)
    const stored = {
      appearances: await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id)),
      cards: await database.db.select().from(matchCards).orderBy(asc(matchCards.id)),
      goals: await database.db.select().from(matchGoals).orderBy(asc(matchGoals.id)),
      reports: await database.db.select().from(matchReports).orderBy(asc(matchReports.matchId)),
      substitutions: await database.db.select().from(matchSubstitutions).orderBy(asc(matchSubstitutions.id)),
    }
    const second = await importOldSiteLineups(database.db, data.matches, data.players)

    expect(first).toMatchObject({ changed: 0, created: 566, skipped: 0, unchanged: 0 })
    expect(first.lines[0]).toBe('566 reports: 505 klaar, 61 bezig')
    // 36 yellow-red cards of 35 reports had no yellow card, so they got one. 4 of those reports
    // stay bezig for another reason, so 31 reports went from bezig (92) to klaar.
    const derived = first.lines.filter((line) => line.includes('so a yellow card without a minute is added'))
    const derivedFor = new Set(derived.map((line) => line.split(': ')[0]))

    expect(derived).toHaveLength(36)
    expect(derivedFor.size).toBe(35)
    expect(
      first.lines.filter((line) => line.includes('the report is bezig') && derivedFor.has(line.split(': ')[0])),
    ).toHaveLength(4)
    expect(second).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 566 })
    expect({
      appearances: await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id)),
      cards: await database.db.select().from(matchCards).orderBy(asc(matchCards.id)),
      goals: await database.db.select().from(matchGoals).orderBy(asc(matchGoals.id)),
      reports: await database.db.select().from(matchReports).orderBy(asc(matchReports.matchId)),
      substitutions: await database.db.select().from(matchSubstitutions).orderBy(asc(matchSubstitutions.id)),
    }).toEqual(stored)

    expect(stored.appearances).toHaveLength(14543)
    expect(stored.substitutions).toHaveLength(2413)
    expect(stored.cards).toHaveLength(1506)
    expect(stored.cards.filter((card) => card.kind === 'geel')).toHaveLength(1420)
    expect(stored.cards.filter((card) => card.kind === 'geel' && card.minute === null)).toHaveLength(828)
    expect(stored.cards.filter((card) => card.kind === 'geel-rood')).toHaveLength(40)
    expect(stored.cards.filter((card) => card.kind === 'rood')).toHaveLength(46)
    // The only cards left out are the two of the trainer, so no card of a player is lost.
    const leftOut = first.lines.filter((line) => line.includes('card for'))

    expect(leftOut).toHaveLength(2)
    expect(leftOut.every((line) => line.includes("'foppe.dehaan'"))).toBe(true)
    // Every goal has its scorer in the report, and 649 of the assists are linked.
    expect(stored.goals.filter((goal) => goal.appearanceId !== null)).toHaveLength(1763)
    expect(stored.goals.filter((goal) => goal.assistAppearanceId !== null)).toHaveLength(649)
    expect(stored.appearances.filter((one) => one.ours)).toHaveLength(7351)
    expect(stored.reports.filter((one) => one.opponentComplete)).toHaveLength(534)

    // Every report is klaar if and only if the rules find no error and nothing was left out.
    const allMatches = await database.db.select().from(matches)
    let klaarWithErrors = 0
    let bezigWithoutErrors = 0

    for (const row of stored.reports) {
      const match = allMatches.find((one) => one.id === row.matchId)!
      const reportMatch: ReportMatch = {
        extraTime: match.extraTime,
        goalsAgainst: match.goalsAgainst,
        goalsFor: match.goalsFor,
        penaltiesAgainst: match.penaltiesAgainst,
        penaltiesFor: match.penaltiesFor,
        status: match.status,
      }
      const apps = stored.appearances.filter((one) => one.matchId === row.matchId)
      const toCheck: SharedReport = {
        appearances: apps.map((one) => ({
          captain: one.captain,
          id: one.id,
          name: one.name,
          ours: one.ours,
          shirtNumber: one.shirtNumber,
          starter: one.starter,
        })),
        cards: stored.cards
          .filter((one) => one.matchId === row.matchId)
          .map((one) => ({ ...one, appearanceId: one.appearanceId })),
        goals: stored.goals
          .filter((one) => one.matchId === row.matchId)
          .map((one) => ({
            appearanceId: one.appearanceId,
            assistId: one.assistAppearanceId,
            minute: one.minute,
            ours: one.ours,
            ownGoal: one.ownGoal,
            penalty: one.penalty,
            stoppageMinutes: one.stoppageMinutes,
          })),
        incidents: [],
        opponentComplete: row.opponentComplete,
        status: row.status,
        substitutions: stored.substitutions
          .filter((one) => one.matchId === row.matchId)
          .map((one) => ({
            inId: one.appearanceInId,
            minute: one.minute,
            outId: one.appearanceOutId,
            stoppageMinutes: one.stoppageMinutes,
          })),
      }
      const errors = checkMatchReport(toCheck, reportMatch).errors

      if (row.status === 'klaar' && errors.length > 0) {
        klaarWithErrors += 1
      }
      if (row.status === 'bezig' && errors.length === 0) {
        bezigWithoutErrors += 1
      }
    }

    expect(klaarWithErrors).toBe(0)
    // The 22 reports that the rules approve and that are bezig all have a line that says what
    // was left out or is doubtful, and no line about a rule.
    expect(bezigWithoutErrors).toBe(22)
    expect(first.lines.filter((line) => line.includes('is bezig: ') && !line.includes('rule '))).toHaveLength(22)
  }, 120_000)
})
