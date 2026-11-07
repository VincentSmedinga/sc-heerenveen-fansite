import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { markedParts } from '@fansite/db/match-edits'
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
  matchSubstitutions,
  type NewMatch,
  persons,
  players,
  playerSeasonStats,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { findMatch, listAdminMatches, saveEntry, undoEntry } from './match-entries'
import {
  contextOf,
  findReportScreen,
  listReportsToCheck,
  removeReport,
  reportReason,
  saveReport,
  valuesOfReport,
} from './match-reports'
import { emptyRow, otherPlayer, type ReportSquadPlayer, type ReportValues } from './report-fields'
import { report as baseReport, card, squadOf, substitution } from './report-fixtures'
import { checkReportForm, type ReportPlan } from './report-form'

let database: TestDatabase
let userId: number
let matchId: number
let squad: ReportSquadPlayer[]

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
  const found = checkReportForm(values, { match: played as never, squad })

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

  it('lets a change of Wikipedia that waited for the goals go, and writes nothing for a match that was not played', async () => {
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
        status: 'scheduled',
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

  it('writes a line in the log for a player whose goals differ, with the account of the editor, when the report is saved as klaar', async () => {
    const nine = await tableOfWikipedia()

    await save(report())

    const lines = (await log()).filter((line) => line.action === 'player.stats-differ')

    // The report has one goal for number 9, where the table has two; number 10 agrees.
    expect(lines).toMatchObject([
      { createdAt: t0, detail: 'Doelpunten Eredivisie 2026/27: verslagen 1, Wikipedia 2', itemId: nine, userId },
    ])
  })

  it('writes nothing about it for a report that is bezig, and nothing when a save changes nothing', async () => {
    await tableOfWikipedia()
    await save({ ...report(), status: 'bezig' })
    expect((await log()).filter((line) => line.action === 'player.stats-differ')).toEqual([])

    await save(report(), t1)
    await save(report(), t1)
    expect((await log()).filter((line) => line.action === 'player.stats-differ')).toHaveLength(1)
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

  it('starts a match without a report with eleven empty players and the goals of Wikipedia by name', async () => {
    await wikipediaGoals()

    const screen = (await findReportScreen(database.db, matchId))!
    const values = valuesOfReport(screen.report, screen.goals, screen.squad)

    expect(values.wij.speler).toHaveLength(11)
    expect(values.wij.doelpunt.map((row) => row.naam)).toEqual(['Speler 9', 'Speler 10'])
    expect(values.zij.doelpunt.map((row) => row.naam)).toEqual(['Sibbing'])
    expect(values.status).toBe('bezig')
  })

  it('has a screen only for a match that was played', async () => {
    const [values] = await withClubs(database.db, [
      {
        ...played,
        goalsAgainst: null,
        goalsFor: null,
        matchDate: '2026-11-07',
        round: 'Speelronde 12',
        status: 'scheduled',
      },
    ])
    const [scheduled] = await database.db.insert(matches).values(values!).$returningId()

    expect(await findReportScreen(database.db, scheduled?.id ?? 0)).toBeUndefined()
    expect(await findReportScreen(database.db, 999_999)).toBeUndefined()
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

    expect(await removeReport(database.db, userId, matchId, 'Het was een proef', t1)).toBe('done')
    expect(await database.db.select().from(matchReports)).toHaveLength(0)
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
