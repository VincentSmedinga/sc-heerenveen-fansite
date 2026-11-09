import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { markedParts } from '@fansite/db/match-edits'
import { readMatchReport } from '@fansite/db/match-reports'
import {
  adminUsers,
  auditLog,
  matchAppearances,
  matchCards,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  matchIncidents,
  matchReports,
  matchShootoutKicks,
  matchSubstitutions,
  type NewMatch,
  oldSiteReportSource,
  persons,
  players,
  playerSeasonStats,
  playerStatDifferences,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { findMatch, listAdminMatches, saveEntry, undoEntry } from './match-entries'
import {
  contextOf,
  findReportScreen,
  finishMatch,
  listReportsToCheck,
  removeReport,
  reportReason,
  saveReport,
  valuesOfReport,
} from './match-reports'
import { emptyRow, otherPlayer, type ReportSquadPlayer, type ReportValues, type Row } from './report-fields'
import { report as baseReport, card, goal, squadOf, substitution } from './report-fixtures'
import { checkReportForm, type ReportPlan } from './report-form'

const noFacts = { attendance: null, note: null, referee: null, stadium: null }

let database: TestDatabase
let userId: number
let matchId: number
let squad: ReportSquadPlayer[]
/** The match the checks see: the league match, or the cup match after `cupReport`. */
let seen: Parameters<typeof checkReportForm>[1]['match']

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const t0 = new Date('2026-11-01T12:00:00Z')
const t1 = new Date('2026-11-01T13:00:00Z')

const played: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  kickoffAt: new Date('2026-10-31T17:45:00Z'),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season: '2026/27',
  status: 'played',
}

beforeEach(async () => {
  seen = played as never
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  const [values] = await withClubs(database.db, [played])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  matchId = inserted?.id ?? 0

  const [person] = await database.db
    .insert(persons)
    .values({ name: 'Speler 9', wikipediaPage: 'Speler 9 (voetballer)' })
    .$returningId()

  await database.db.insert(players).values(
    squadOf(1).map((player) => ({
      name: player.name,
      personId: player.shirtNumber === 9 ? (person?.id ?? null) : null,
      searchTerm: player.name,
      season: '2026/27',
      shirtNumber: player.shirtNumber,
      wikipediaPage: player.shirtNumber === 9 ? 'Speler 9 (voetballer)' : null,
    })),
  )
  squad = (await database.db.select().from(players).orderBy(asc(players.shirtNumber))).map((player) => ({
    id: player.id,
    name: player.name,
    shirtNumber: player.shirtNumber,
  }))
})

/** What Wikipedia says of the goals: the scorers by their surnames, one with a page. */
async function wikipediaGoals() {
  const [nine] = await database.db.select().from(players).where(eq(players.name, 'Speler 9'))

  await database.db.insert(matchGoals).values([
    {
      matchId,
      minute: 12,
      ours: true,
      personId: nine?.personId ?? null,
      player: 'Speler 9',
      playerId: nine?.id ?? null,
      wikipediaPage: 'Speler 9 (voetballer)',
    },
    { matchId, minute: 40, ours: false, player: 'Sibbing' },
    { matchId, minute: 77, ours: true, player: 'Speler 10' },
  ])
}

const checked = (values: ReportValues): ReportPlan => {
  const found = checkReportForm(values, { match: seen, squad })

  expect(found.errors).toEqual({})

  return found.plan as ReportPlan
}
const report = (overrides: Parameters<typeof baseReport>[1] = {}) => baseReport(squad, overrides)
const save = async (values: ReportValues, now = t0) => saveReport(database.db, userId, matchId, checked(values), now)
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))
const playedResult = {
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 2,
  penaltiesAgainst: null,
  penaltiesFor: null,
  status: 'played',
} as const
const goalsOf = () =>
  database.db.select().from(matchGoals).where(eq(matchGoals.matchId, matchId)).orderBy(asc(matchGoals.id))
const edits = () => database.db.select().from(matchEdits)

/** A kick row with these fields. */
const kick = (fields: Row): Row => ({ ...emptyRow('serie'), ...fields })

/**
 * A 2-2 cup match with extra time that was decided 4-3 on penalties, as the checks see it. The
 * report of a 2-1 win gets a second goal of the opponent in extra time.
 */
const cup = {
  ...played,
  competition: 'KNVB Beker' as const,
  extraTime: true,
  goalsAgainst: 2,
  penaltiesAgainst: 3,
  penaltiesFor: 4,
}

/** The values saved as the plan of the cup match, which the checks accept. */
async function cupReport(values: ReportValues) {
  await database.db.update(matches).set(cup).where(eq(matches.id, matchId))

  seen = cup as never

  return values
}

/** The report of the cup match with its five rounds: ours by number, the opponent's unknown. */
function series() {
  const base = report({
    zij: { doelpunt: [goal({ minuut: '40', naam: 'Sibbing' }), goal({ minuut: '100', naam: 'Sibbing' })] },
  })

  base.wij.serie = [
    kick({ speler: '9', uitkomst: 'raak' }),
    kick({ speler: '10', uitkomst: 'raak' }),
    kick({ speler: '8', uitkomst: 'naast' }),
    kick({ speler: '7', uitkomst: 'raak' }),
    kick({ speler: '6', uitkomst: 'raak' }),
  ]
  base.zij.serie = ['raak', 'raak', 'naast', 'gestopt', 'raak'].map((uitkomst) => kick({ uitkomst }))

  return base
}

describe('saveReport', () => {
  it('stores the report, its players and events, and the goals with the players they point to, in one go', async () => {
    await wikipediaGoals()

    const values = report({
      wij: {
        kaart: [card({ minuut: '30', speler: '3' })],
        strafschop: [{ ...emptyRow('strafschop'), minuut: '50', speler: '9' }],
        wissel: [substitution({ erin: '12', eruit: '11', minuut: '60' })],
      },
    })

    expect(await save(values)).toEqual({ status: 'saved' })
    expect((await database.db.select().from(matchReports))[0]).toMatchObject({
      matchId,
      opponentComplete: false,
      savedAt: t0,
      savedBy: userId,
      source: 'wedstrijdformulier',
      status: 'klaar',
    })

    const appearances = await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id))

    expect(appearances).toHaveLength(14)
    expect(appearances[0]).toMatchObject({
      captain: true,
      name: 'Speler 1',
      ours: true,
      playerId: squad[0]?.id,
      shirtNumber: 1,
      starter: true,
    })
    expect(appearances[11]).toMatchObject({ starter: false })

    const [substitutionRow] = await database.db.select().from(matchSubstitutions)
    const [cardRow] = await database.db.select().from(matchCards)
    const [incidentRow] = await database.db.select().from(matchIncidents)

    expect(substitutionRow).toMatchObject({
      appearanceInId: appearances[11]?.id,
      appearanceOutId: appearances[10]?.id,
      minute: 60,
      ours: true,
    })
    expect(cardRow).toMatchObject({ appearanceId: appearances[2]?.id, kind: 'geel', minute: 30 })
    expect(incidentRow).toMatchObject({ appearanceId: appearances[8]?.id, kind: 'strafschop-gemist', minute: 50 })

    const goals = await goalsOf()

    expect(
      goals.map((row) => [row.minute, row.player, row.appearanceId, row.assistAppearanceId, row.playerId]),
    ).toEqual([
      [12, 'Speler 9', appearances[8]?.id, null, squad[8]?.id],
      [40, 'Sibbing', null, null, null],
      [77, 'Speler 10', appearances[9]?.id, appearances[8]?.id, squad[9]?.id],
    ])
    // The goal that Wikipedia had keeps the page and the person of its scorer.
    expect(goals[0]).toMatchObject({ wikipediaPage: 'Speler 9 (voetballer)' })
    expect(goals[0]?.personId).not.toBeNull()
  })

  it('marks the goals as the editors with the fixed reason, keeps the goals as they were, and logs it once', async () => {
    await wikipediaGoals()
    await save(report())

    const [edit] = await edits()

    expect(edit).toMatchObject({
      editedAt: t0,
      editedBy: userId,
      goalsEdited: true,
      kickoffEdited: false,
      reason: reportReason,
      resultEdited: false,
    })
    expect(JSON.parse(edit?.beforeGoals ?? '[]')).toHaveLength(3)
    expect(markedParts(edit!)).toEqual(['goals'])
    expect(await log()).toMatchObject([
      {
        action: 'match.edit',
        detail: 'Verslag (klaar), 14 spelers, 0 wissels, 3 doelpunten, 0 kaarten, 0 strafschoppen',
        itemId: matchId,
        reason: 'Verslag van de wedstrijd',
        userId,
      },
    ])
  })

  it('leaves an entry of the kick-off or the result as it is, and adds the marker of the goals to it', async () => {
    await saveEntry(
      database.db,
      userId,
      matchId,
      {
        facts: noFacts,
        goals: [],
        kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T18:00:00Z'), matchDate: '2026-10-31' },
        result: playedResult,
      },
      'Aftrap is anders',
      t0,
    )
    await save(report(), t1)

    const [edit] = await edits()

    expect(markedParts(edit!)).toEqual(['kickoff', 'goals'])
    expect(edit?.reason).toBe(reportReason)
  })

  it('writes nothing when nothing changed, and when the status changes only the report changes', async () => {
    await wikipediaGoals()
    await save(report())

    expect(await save(report(), t1)).toEqual({ status: 'unchanged' })
    expect(await log()).toHaveLength(1)
    expect((await database.db.select().from(matchReports))[0]?.savedAt).toEqual(t0)

    expect(await save({ ...report(), status: 'bezig' }, t1)).toEqual({ status: 'saved' })
    expect((await database.db.select().from(matchReports))[0]).toMatchObject({ savedAt: t1, status: 'bezig' })
    expect(await log()).toHaveLength(2)
    expect(await database.db.select().from(matchAppearances)).toHaveLength(14)
  })

  it('replaces the old players and events when the report changes, and the goals follow', async () => {
    await save(report({ wij: { wissel: [substitution({ erin: '12', eruit: '11', minuut: '60' })] } }))
    await save(report({ wij: { kaart: [card({ minuut: '30', speler: '3' })] } }), t1)

    expect(await database.db.select().from(matchSubstitutions)).toHaveLength(0)
    expect(await database.db.select().from(matchCards)).toHaveLength(1)
    expect(await database.db.select().from(matchAppearances)).toHaveLength(14)
    expect((await goalsOf()).every((row) => row.appearanceId !== null || row.player === 'Sibbing')).toBe(true)
  })

  it('saves the kicks of the shoot-out with the report, in rounds for each team, and sees a changed kick as a change', async () => {
    const cup = await cupReport(series())

    expect(await save(cup)).toEqual({ status: 'saved' })
    expect(await save(cup, t1)).toEqual({ status: 'unchanged' })

    const appearances = await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id))
    const kicks = await database.db
      .select()
      .from(matchShootoutKicks)
      .orderBy(asc(matchShootoutKicks.round), asc(matchShootoutKicks.id))
    const numberOf = (id: null | number) => appearances.find((row) => row.id === id)?.shirtNumber ?? null

    expect(kicks.map((kick) => [kick.round, kick.ours, numberOf(kick.appearanceId), kick.outcome])).toEqual([
      [1, true, 9, 'raak'],
      [1, false, null, 'raak'],
      [2, true, 10, 'raak'],
      [2, false, null, 'raak'],
      [3, true, 8, 'naast'],
      [3, false, null, 'naast'],
      [4, true, 7, 'raak'],
      [4, false, null, 'gestopt'],
      [5, true, 6, 'raak'],
      [5, false, null, 'raak'],
    ])

    // A kick that changes is a change of the report: the last goes wide and the third scores.
    const other = series()

    other.wij.serie[2] = kick({ speler: '8', uitkomst: 'raak' })
    other.wij.serie[4] = kick({ speler: '6', uitkomst: 'naast' })
    expect(await save(await cupReport(other), t1)).toEqual({ status: 'saved' })
    expect(
      await database.db.select().from(matchShootoutKicks).where(eq(matchShootoutKicks.outcome, 'naast')),
    ).toHaveLength(2)
    expect((await log()).at(-1)?.detail).toContain('10 schoten in de serie')
  })

  it('stores a player without a shirt number as empty, gives him back empty, and saving it again changes nothing', async () => {
    const values = report()

    values.zij.speler = [
      ...values.zij.speler,
      { ...emptyRow('speler'), naam: 'Zonder Een', rol: 'bank' },
      { ...emptyRow('speler'), naam: 'Zonder Twee', rol: 'bank' },
    ]
    values.wij.speler = [...values.wij.speler, { ...emptyRow('speler'), keuze: 'andere', naam: 'Gast', rol: 'bank' }]
    expect(await save(values)).toEqual({ status: 'saved' })

    const stored = await readMatchReport(database.db, matchId)
    const without = stored!.appearances.filter((one) => one.shirtNumber === null)

    expect(without.map((one) => one.name)).toEqual(['Gast', 'Zonder Een', 'Zonder Twee'])
    expect((await database.db.select().from(players).where(eq(players.name, 'Gast')))[0]?.shirtNumber).toBeNull()

    const again = valuesOfReport(stored, await goalsOf(), squad)

    expect(again.zij.speler.slice(-2).map((row) => row.rugnummer)).toEqual(['', ''])
    expect(await save(again, t1)).toEqual({ status: 'unchanged' })
  })

  it('gives the kicks back to the form as they were saved, so saving it again changes nothing', async () => {
    await save(await cupReport(series()))

    const stored = await readMatchReport(database.db, matchId)
    const values = valuesOfReport(stored, await goalsOf(), squad)

    expect(values.wij.serie.map((row) => [row.speler, row.uitkomst])).toEqual([
      ['9', 'raak'],
      ['10', 'raak'],
      ['8', 'naast'],
      ['7', 'raak'],
      ['6', 'raak'],
    ])
    expect(values.zij.serie.map((row) => [row.speler, row.uitkomst])).toEqual([
      ['', 'raak'],
      ['', 'raak'],
      ['', 'naast'],
      ['', 'gestopt'],
      ['', 'raak'],
    ])
    expect(await save(values, t1)).toEqual({ status: 'unchanged' })
  })

  it('takes the kicks away when the list is empty, and with the report', async () => {
    await save(await cupReport(series()))

    const empty = series()

    empty.wij.serie = []
    empty.zij.serie = []
    expect(await save(await cupReport(empty), t1)).toEqual({ status: 'saved' })
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(0)

    await save(await cupReport(series()), t1)
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(10)
    await removeReport(database.db, userId, matchId, 'Proef', t1)
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(0)
  })

  it('adds a player who is not in the squad to the squad with the source verslag, once, and takes the row with his name if there is one', async () => {
    const rows = report().wij.speler.map((row) => ({ ...row }))

    rows[13] = { ...emptyRow('speler'), keuze: otherPlayer, naam: 'Nieuwe Speler', rol: 'bank', rugnummer: '40' }
    await save(report({ wij: { speler: rows } }))

    const added = (await database.db.select().from(players)).filter((player) => player.source === 'verslag')

    expect(added).toMatchObject([{ name: 'Nieuwe Speler', searchTerm: 'Speler', season: '2026/27', shirtNumber: 40 }])
    expect(await save(report({ wij: { speler: rows } }), t1)).toEqual({ status: 'unchanged' })

    // The same name again, typed as another player, is the same row.
    rows[13] = { ...rows[13]!, naam: 'Speler 14', rugnummer: '14' }
    await save(report({ wij: { speler: rows } }), t1)
    expect((await database.db.select().from(players)).filter((player) => player.source === 'verslag')).toHaveLength(1)
  })

  it('lets a change of Wikipedia that waited for the goals go, and writes nothing for a match that is called off', async () => {
    await database.db.insert(matchChanges).values({
      changed: 'doelpunten',
      class: 'suspicious',
      competition: 'Eredivisie',
      firstSeenAt: t0,
      lastSeenAt: t0,
      matchId,
      newValue: 'x',
      oldValue: 'y',
      part: 'goals',
      reason: 'wijkt af van de invoer van de redactie',
      round: 'Speelronde 11',
      season: '2026/27',
      status: 'pending',
    })
    await save(report(), t1)

    expect((await database.db.select().from(matchChanges))[0]).toMatchObject({
      resolution: 'replaced',
      status: 'rejected',
    })

    const [other] = await withClubs(database.db, [
      {
        ...played,
        goalsAgainst: null,
        goalsFor: null,
        matchDate: '2026-11-07',
        round: 'Speelronde 12',
        status: 'postponed',
      },
    ])
    const [scheduled] = await database.db.insert(matches).values(other!).$returningId()

    expect(await saveReport(database.db, userId, scheduled?.id ?? 0, checked(report()))).toEqual({
      status: 'not-played',
    })
    expect(await saveReport(database.db, userId, 999_999, checked(report()))).toEqual({ status: 'missing' })
  })
})

describe('the goals of a report that is klaar against the squad table of Wikipedia', () => {
  /** The table of Wikipedia says number 9 scored two goals and number 10 one. */
  async function tableOfWikipedia() {
    const nine = squad.find((player) => player.shirtNumber === 9)!
    const ten = squad.find((player) => player.shirtNumber === 10)!

    await database.db.insert(playerSeasonStats).values([
      { appearances: 5, assists: 0, competition: 'Eredivisie', goals: 2, playerId: nine.id, season: '2026/27' },
      { appearances: 5, assists: 0, competition: 'Eredivisie', goals: 1, playerId: ten.id, season: '2026/27' },
    ])

    return nine.id
  }

  const kept = () => database.db.select().from(playerStatDifferences)

  it('keeps a player whose goals differ for the editors, once, when the report is saved as klaar (#974)', async () => {
    const nine = await tableOfWikipedia()

    await save(report())

    // The report has one goal for number 9, where the table has two; number 10 agrees.
    expect(await kept()).toMatchObject([
      {
        comparedWith: 'reports',
        competition: 'Eredivisie',
        firstSeenAt: t0,
        otherGoals: 1,
        playerId: nine,
        season: '2026/27',
        status: 'pending',
        tableGoals: 2,
      },
    ])
    expect((await log()).filter((line) => line.action.startsWith('player.'))).toEqual([])

    // Saving the report again finds the same difference and keeps nothing more.
    await save({ ...report(), bron: 'Een andere bron' }, t1)
    expect(await kept()).toMatchObject([{ firstSeenAt: t0, status: 'pending' }])
  })

  it('keeps nothing for a report that is bezig', async () => {
    await tableOfWikipedia()
    await save({ ...report(), status: 'bezig' })

    expect(await kept()).toEqual([])
  })
})

describe('the formations of a report', () => {
  const withFormations = (ours: { eigen?: string; keuze: string }, theirs = { eigen: '', keuze: '' }) => ({
    ...report(),
    formatie: { wij: { eigen: '', ...ours }, zij: theirs },
  })

  it('stores a formation from the list and one of his own, and gives them back in the form', async () => {
    await wikipediaGoals()
    await save(withFormations({ keuze: '4-3-3' }, { eigen: '4-1-2-1-2', keuze: 'anders' }))

    expect((await database.db.select().from(matchReports))[0]).toMatchObject({
      formationOpponent: '4-1-2-1-2',
      formationOurs: '4-3-3',
    })

    const screen = (await findReportScreen(database.db, matchId))!
    const again = valuesOfReport(screen.report, screen.goals, screen.squad)

    // The one of the list is that choice, and the one of his own comes back in Anders with its
    // text.
    expect(again.formatie).toEqual({
      wij: { eigen: '', keuze: '4-3-3' },
      zij: { eigen: '4-1-2-1-2', keuze: 'anders' },
    })
    expect(await save(again, t1)).toEqual({ status: 'unchanged' })
  })

  it('stores no formation as empty, and a report may be saved without', async () => {
    await save(report())

    expect((await database.db.select().from(matchReports))[0]).toMatchObject({
      formationOpponent: null,
      formationOurs: null,
    })

    const screen = (await findReportScreen(database.db, matchId))!

    expect(valuesOfReport(screen.report, screen.goals, screen.squad).formatie).toEqual({
      wij: { eigen: '', keuze: '' },
      zij: { eigen: '', keuze: '' },
    })
  })

  it('lets the editors choose both formations of a report the import made, and then the report is theirs', async () => {
    await wikipediaGoals()
    await save(report())
    // As the import of the old fansite leaves it: a derived formation for our team, no editor.
    await database.db.update(matchReports).set({ formationOurs: '4-4-2', savedBy: null, source: oldSiteReportSource })

    const screen = (await findReportScreen(database.db, matchId))!
    const form = valuesOfReport(screen.report, screen.goals, screen.squad)

    expect(form.formatie.wij).toEqual({ eigen: '', keuze: '4-4-2' })
    expect(
      await save({ ...form, formatie: { wij: { eigen: '', keuze: '4-3-3' }, zij: { eigen: '', keuze: '4-4-2' } } }, t1),
    ).toEqual({ status: 'saved' })

    const [row] = await database.db.select().from(matchReports)

    expect(row).toMatchObject({
      formationOpponent: '4-4-2',
      formationOurs: '4-3-3',
      savedBy: userId,
      source: oldSiteReportSource,
    })
    // The import leaves a report with an editor as it is, and the page no longer calls the
    // formation derived (see `matchPageDataOf`).
  })

  it('sees a change of the formation as a change of the report, and takes a formation away again', async () => {
    await wikipediaGoals()
    await save(withFormations({ keuze: '4-3-3' }))

    expect(await save(withFormations({ keuze: '4-4-2' }), t1)).toEqual({ status: 'saved' })
    expect((await database.db.select().from(matchReports))[0]).toMatchObject({ formationOurs: '4-4-2', savedAt: t1 })
    expect(await save(report(), t1)).toEqual({ status: 'saved' })
    expect((await database.db.select().from(matchReports))[0]?.formationOurs).toBeNull()
  })
})

describe('the report as the form reads it', () => {
  it('gives the stored report back as the form it was saved from, so saving it again changes nothing', async () => {
    await wikipediaGoals()

    const values = report({
      wij: {
        kaart: [card({ minuut: '30', speler: '3' })],
        wissel: [substitution({ erin: '12', eruit: '11', extra: '2', minuut: '45' })],
      },
      zij: {
        speler: [{ ...emptyRow('speler'), naam: 'Sibbing', rugnummer: '7' }],
      },
    })

    await save(values)

    const screen = (await findReportScreen(database.db, matchId))!
    const again = valuesOfReport(screen.report, screen.goals, screen.squad)

    expect(again.wij.wissel).toEqual([{ erin: '12', eruit: '11', extra: '2', minuut: '45' }])
    expect(again.zij.speler).toEqual([{ keuze: '', naam: 'Sibbing', rol: 'basis', rugnummer: '7' }])
    // Wikipedia named the scorers; the report points to them now.
    expect(again.wij.doelpunt.map((row) => row.speler)).toEqual(['wij-9', 'wij-10'])
    expect(checkReportForm(again, contextOf(screen)).errors).toEqual({})
    expect(await saveReport(database.db, userId, matchId, checkReportForm(again, contextOf(screen)).plan!)).toEqual({
      status: 'unchanged',
    })
  })

  it('keeps a goal and a yellow card without a minute empty, and saving the form again changes nothing', async () => {
    await wikipediaGoals()

    await save(
      report({
        wij: {
          doelpunt: [goal({ minuut: '', speler: 'wij-9' }), goal({ assist: 'wij-9', minuut: '77', speler: 'wij-10' })],
          kaart: [card({ minuut: '', speler: '3' })],
        },
      }),
    )

    const screen = (await findReportScreen(database.db, matchId))!
    const again = valuesOfReport(screen.report, screen.goals, screen.squad)

    expect(again.wij.kaart.map((row) => row.minuut)).toEqual([''])
    expect(again.wij.doelpunt.map((row) => row.minuut)).toEqual(['77', ''])
    expect((await database.db.select().from(matchCards))[0]).toMatchObject({ minute: null, stoppageMinutes: null })
    expect(await saveReport(database.db, userId, matchId, checkReportForm(again, contextOf(screen)).plan!)).toEqual({
      status: 'unchanged',
    })
  })

  it('reads the players of a report in the order of the form, which the pitch of the page of the match needs', async () => {
    const whole = report().wij.speler
    // The line-up is the order the pitch draws: the goalkeeper first, then the rows of the
    // formation. Here it is the opposite of the order of the shirt numbers, bench after.
    const reversed = [...whole.slice(0, 11).toReversed(), ...whole.slice(11)]

    await save(report({ wij: { speler: reversed } }))

    const readOurs = async () =>
      (await readMatchReport(database.db, matchId))!.appearances
        .filter((player) => player.ours)
        .map((player) => player.shirtNumber)
    const first = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 12, 13, 14]

    expect(await readOurs()).toEqual(first)

    // A new save puts the players in the new order, also when the old rows are replaced.
    await save(report({ wij: { speler: [...reversed.slice(1, 11), reversed[0]!, ...reversed.slice(11)] } }), t1)

    expect(await readOurs()).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 11, 12, 13, 14])

    // The form gets the same order back.
    const screen = (await findReportScreen(database.db, matchId))!

    expect(valuesOfReport(screen.report, screen.goals, screen.squad).wij.speler.map((row) => row.rugnummer)).toEqual(
      [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 11, 12, 13, 14].map(String),
    )
  })

  it('starts a match without a report with eleven empty players and the goals of Wikipedia by name', async () => {
    await wikipediaGoals()

    const screen = (await findReportScreen(database.db, matchId))!
    const values = valuesOfReport(screen.report, screen.goals, screen.squad)

    expect(values.wij.speler).toHaveLength(11)
    expect(values.wij.doelpunt.map((row) => row.naam)).toEqual(['Speler 9', 'Speler 10'])
    expect(values.zij.doelpunt.map((row) => row.naam)).toEqual(['Sibbing'])
    expect(values.status).toBe('bezig')
  })

  it('has a screen only for a match that was played or is being played', async () => {
    const [values] = await withClubs(database.db, [
      {
        ...played,
        goalsAgainst: null,
        goalsFor: null,
        matchDate: '2026-11-07',
        round: 'Speelronde 12',
        status: 'postponed',
      },
    ])
    const [postponed] = await database.db.insert(matches).values(values!).$returningId()

    expect(await findReportScreen(database.db, postponed?.id ?? 0)).toBeUndefined()
    expect(await findReportScreen(database.db, 999_999)).toBeUndefined()
  })
})

describe('a match that is still being played', () => {
  /** The report of the match as an editor saves it while it is played: bezig. */
  const bezig = (): ReportValues => ({ ...report(), status: 'bezig' })
  const day = new Date('2026-10-31T19:00:00Z')
  const live: Omit<NewMatch, 'clubId'> = {
    ...played,
    goalsAgainst: null,
    goalsFor: null,
    status: 'scheduled',
  }

  /** Turns the match of the test into one that is being played, as the checks see it. */
  async function beginMatch(overrides: Partial<typeof live> = {}) {
    await database.db
      .update(matches)
      .set({ ...live, ...overrides })
      .where(eq(matches.id, matchId))

    seen = { ...live, ...overrides } as never
  }

  it('has a screen from its day, and not before', async () => {
    await beginMatch()

    expect((await findReportScreen(database.db, matchId, day))?.match.status).toBe('scheduled')
    // The day begins at midnight in the Netherlands: 23:00 in UTC, the clocks being back.
    expect(await findReportScreen(database.db, matchId, new Date('2026-10-30T22:59:00Z'))).toBeUndefined()
    expect(await findReportScreen(database.db, matchId, new Date('2026-10-30T23:00:00Z'))).toBeDefined()
  })

  it('saves a report that is bezig, keeps the goals out of the match, and gives no result to the match', async () => {
    await beginMatch()

    const plan = checked(bezig())

    expect(await saveReport(database.db, userId, matchId, plan, t0)).toEqual({ status: 'saved' })
    expect((await goalsOf()).length).toBe(3)
    expect((await edits())[0]).toMatchObject({ goalsEdited: true, resultEdited: false })
    expect((await database.db.select().from(matches).where(eq(matches.id, matchId)))[0]).toMatchObject({
      goalsAgainst: null,
      goalsFor: null,
      resultSetAt: null,
      status: 'scheduled',
    })
    expect((await readMatchReport(database.db, matchId))?.report.status).toBe('bezig')
  })

  it('does not let a report be klaar before the match is over', async () => {
    await beginMatch()

    const found = checkReportForm(report(), { match: seen, squad })

    expect(Object.values(found.errors).join(' ')).toContain('De wedstrijd is nog niet afgelopen')
    expect(found.plan?.status).toBe('klaar')
  })

  it('is not "to check" in the list, and has a status for the list', async () => {
    await beginMatch()
    await save(bezig())

    expect((await listAdminMatches(database.db, '2026/27', day)).rows[0]).toMatchObject({
      goalsFor: null,
      live: true,
      reportable: true,
      reportStatus: 'bezig',
      reportToCheck: false,
    })
    // Before the kick-off the report is there, but the match is not live.
    expect((await listAdminMatches(database.db, '2026/27', new Date('2026-10-31T10:00:00Z'))).rows[0]).toMatchObject({
      live: false,
      reportable: true,
    })
  })

  describe('finishMatch', () => {
    it('gives the match the result as an entry of the editors, logs it, and leaves the report bezig', async () => {
      await beginMatch()
      await save(bezig())

      expect(await finishMatch(database.db, userId, matchId, { goalsAgainst: 1, goalsFor: 2 }, t1)).toBe('done')

      expect((await database.db.select().from(matches).where(eq(matches.id, matchId)))[0]).toMatchObject({
        goalsAgainst: 1,
        goalsFor: 2,
        resultSetAt: t1,
        status: 'played',
      })
      expect((await edits())[0]).toMatchObject({ goalsEdited: true, reason: 'Wedstrijd afgelopen', resultEdited: true })
      expect(markedParts((await edits())[0]!)).toEqual(['result', 'goals'])
      expect((await readMatchReport(database.db, matchId))?.report.status).toBe('bezig')
      expect((await goalsOf()).length).toBe(3)
      expect((await log()).at(-1)).toMatchObject({
        action: 'match.edit',
        detail: 'Uitslag: sc Heerenveen 2–1 N.E.C.',
        itemId: matchId,
        reason: 'Wedstrijd afgelopen',
        userId,
      })
    })

    it('takes the result the editor changed, and then the usual rules apply: the goals must add up', async () => {
      await beginMatch()
      await save(bezig())
      await finishMatch(database.db, userId, matchId, { goalsAgainst: 1, goalsFor: 3 }, t1)

      const screen = await findReportScreen(database.db, matchId)
      const found = checkReportForm(valuesOfReport(screen?.report, screen?.goals ?? [], squad), contextOf(screen!))

      expect(found.errors).not.toEqual({})
      expect(Object.values(found.errors).join(' ')).toContain('De doelpunten geven 2–1 en de uitslag is 3–1')
    })

    it('lets a change of Wikipedia that waited for the result go, and keeps a mark of the result once', async () => {
      await beginMatch()
      await save(bezig())
      await database.db.insert(matchChanges).values({
        changed: 'uitslag',
        class: 'suspicious',
        competition: 'Eredivisie',
        firstSeenAt: t0,
        lastSeenAt: t0,
        matchId,
        newValue: 'x',
        oldValue: 'y',
        part: 'result',
        reason: 'wijkt af van de invoer van de redactie',
        round: 'Speelronde 11',
        season: '2026/27',
        status: 'pending',
      })

      await finishMatch(database.db, userId, matchId, { goalsAgainst: 1, goalsFor: 2 }, t1)

      expect((await database.db.select().from(matchChanges))[0]).toMatchObject({
        resolution: 'replaced',
        status: 'rejected',
      })
      expect(await edits()).toHaveLength(1)
    })

    it('writes nothing when the import was first, or the match has no report, or there is no such match', async () => {
      await beginMatch()
      await save(bezig())
      // The import took the result over before the editor used the button.
      await database.db
        .update(matches)
        .set({ goalsAgainst: 1, goalsFor: 2, status: 'played' })
        .where(eq(matches.id, matchId))

      const before = (await log()).length

      expect(await finishMatch(database.db, userId, matchId, { goalsAgainst: 5, goalsFor: 5 }, t1)).toBe('not-live')
      expect((await database.db.select().from(matches).where(eq(matches.id, matchId)))[0]).toMatchObject({
        goalsAgainst: 1,
        goalsFor: 2,
      })
      expect(await finishMatch(database.db, userId, 999_999, { goalsAgainst: 0, goalsFor: 0 }, t1)).toBe('missing')
      expect((await log()).length).toBe(before)

      await database.db.delete(matchReports)
      await database.db.update(matches).set(live).where(eq(matches.id, matchId))
      expect(await finishMatch(database.db, userId, matchId, { goalsAgainst: 0, goalsFor: 0 }, t1)).toBe('not-live')
    })

    it('undoes with the entry of the match: back to a match that is not played, with its goals', async () => {
      await beginMatch()
      await save(bezig())
      await finishMatch(database.db, userId, matchId, { goalsAgainst: 1, goalsFor: 2 }, t1)

      expect(await undoEntry(database.db, userId, matchId, 'Per ongeluk', t1)).toBe('done')
      expect((await database.db.select().from(matches).where(eq(matches.id, matchId)))[0]).toMatchObject({
        goalsAgainst: null,
        goalsFor: null,
        status: 'scheduled',
      })
    })
  })
})

describe('the list', () => {
  it('has the status of the report, and "to check" for a report that was klaar and no longer fits the result', async () => {
    await wikipediaGoals()
    await save(report())

    const now = new Date('2026-11-02T12:00:00Z')

    expect((await listAdminMatches(database.db, '2026/27', now)).rows[0]).toMatchObject({
      reportStatus: 'klaar',
      reportToCheck: false,
    })

    // Wikipedia puts another score on the page: the report stays, and the list says check.
    await database.db.update(matches).set({ goalsFor: 3 }).where(eq(matches.id, matchId))

    expect((await listAdminMatches(database.db, '2026/27', now)).rows[0]).toMatchObject({
      reportStatus: 'klaar',
      reportToCheck: true,
    })
    expect([...(await listReportsToCheck(database.db, [{ id: matchId, reportStatus: 'klaar' }]))]).toEqual([matchId])
    expect((await database.db.select().from(matchReports))[0]?.status).toBe('klaar')

    // A report that is bezig is never "to check".
    await database.db.update(matchReports).set({ status: 'bezig' })

    expect([...(await listReportsToCheck(database.db, [{ id: matchId, reportStatus: 'bezig' }]))]).toEqual([])
  })

  it('has no report for a match without one', async () => {
    expect((await listAdminMatches(database.db, '2026/27', t0)).rows[0]).toMatchObject({
      reportStatus: null,
      reportToCheck: false,
    })
  })
})

describe('removeReport', () => {
  it('removes the rows of the report, puts the goals back as they were, and logs the reason', async () => {
    await wikipediaGoals()
    await save(report({ wij: { wissel: [substitution({ erin: '12', eruit: '11', minuut: '60' })] } }))

    await database.db.insert(matchShootoutKicks).values({ matchId, ours: false, outcome: 'raak', round: 1 })

    expect(await removeReport(database.db, userId, matchId, 'Het was een proef', t1)).toBe('done')
    expect(await database.db.select().from(matchReports)).toHaveLength(0)
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(0)
    expect(await database.db.select().from(matchAppearances)).toHaveLength(0)
    expect(await database.db.select().from(matchSubstitutions)).toHaveLength(0)
    expect(await edits()).toHaveLength(0)
    expect((await goalsOf()).map((row) => [row.player, row.appearanceId, row.assistAppearanceId])).toEqual([
      ['Speler 9', null, null],
      ['Sibbing', null, null],
      ['Speler 10', null, null],
    ])
    expect((await log()).at(-1)).toMatchObject({
      action: 'match.undo',
      detail: 'Verslag weggehaald; doelpunten teruggezet',
      itemId: matchId,
      reason: 'Het was een proef',
      userId,
    })
  })

  it('says there was nothing to remove, or no such match, and leaves goals that Wikipedia took over', async () => {
    expect(await removeReport(database.db, userId, matchId, 'Niets', t1)).toBe('none')
    expect(await removeReport(database.db, userId, 999_999, 'Niets', t1)).toBe('missing')
    expect(await log()).toHaveLength(0)

    await wikipediaGoals()
    await save(report())
    // Wikipedia has the same goals now: the import cleared the marker and follows the page.
    await database.db.delete(matchEdits)
    await removeReport(database.db, userId, matchId, 'Weg', t1)

    expect((await goalsOf()).map((row) => row.player)).toEqual(['Speler 9', 'Sibbing', 'Speler 10'])
    expect((await log()).at(-1)?.detail).toBe('Verslag weggehaald')
  })
})

describe('the match with a report', () => {
  it('knows it has a report, for the form of the match', async () => {
    expect((await findMatch(database.db, matchId))?.hasReport).toBe(false)
    await save(report())
    expect((await findMatch(database.db, matchId))?.hasReport).toBe(true)
  })

  it('keeps the goals and their marker when the entry of the match is taken away', async () => {
    await wikipediaGoals()
    await saveEntry(
      database.db,
      userId,
      matchId,
      {
        facts: noFacts,
        goals: [],
        kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T18:00:00Z'), matchDate: '2026-10-31' },
        result: playedResult,
      },
      'Aftrap is anders',
      t0,
    )
    await save(report(), t1)

    expect(await undoEntry(database.db, userId, matchId, 'Terug', t1)).toBe('done')
    expect(markedParts((await edits())[0]!)).toEqual(['goals'])
    expect((await database.db.select().from(matches))[0]?.kickoffAt).toEqual(new Date('2026-10-31T17:45:00Z'))
    expect((await goalsOf()).every((row) => row.appearanceId !== null || row.player === 'Sibbing')).toBe(true)

    // Nothing else is left to take away: the goals belong to the report.
    expect(await undoEntry(database.db, userId, matchId, 'Nog een keer', t1)).toBe('none')
  })
})
