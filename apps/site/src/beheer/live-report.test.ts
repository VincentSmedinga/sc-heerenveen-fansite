import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { readMatchReport } from '@fansite/db/match-reports'
import {
  adminUsers,
  auditLog,
  matchAppearances,
  matchCards,
  matchEdits,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
  type NewMatch,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import {
  addLiveEvent,
  describeEvent,
  type LiveEventInput,
  liveFieldId,
  liveViewOf,
  removeLiveEvent,
} from './live-report'
import { findReportScreen, reportBasis, saveReport } from './match-reports'
import { report, squadOf } from './report-fixtures'
import { checkReportForm } from './report-form'

let database: TestDatabase
let userId: number
let matchId: number
let squad: { id: number; name: string; shirtNumber: null | number }[]

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

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
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  const [values] = await withClubs(database.db, [played])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  matchId = inserted?.id ?? 0
  await database.db.insert(players).values(
    squadOf(1).map((player) => ({
      name: player.name,
      searchTerm: player.name,
      season: '2026/27',
      shirtNumber: player.shirtNumber,
    })),
  )
  squad = (await database.db.select().from(players).orderBy(asc(players.shirtNumber))).map((player) => ({
    id: player.id,
    name: player.name,
    shirtNumber: player.shirtNumber,
  }))

  // A report of a 2-1 win that is right, which the live screen adds to.
  const screen = await findReportScreen(database.db, matchId)
  const checked = checkReportForm(report(squad), { match: screen!.match, squad: screen!.squad })

  await saveReport(database.db, userId, matchId, checked.plan!)
  await database.pool.query('DELETE FROM audit_log')
})

/** The id of the row of the player with this shirt number, of our team or of the opponent. */
async function appearanceOf(shirtNumber: number, ours = true) {
  const rows = await database.db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId))

  return String(rows.find((row) => row.ours === ours && row.shirtNumber === shirtNumber)?.id ?? 0)
}

const event = (fields: Partial<LiveEventInput>): LiveEventInput => ({ extra: '', kant: 'wij', minuut: '', ...fields })
const add = (kind: 'doelpunt' | 'kaart' | 'wissel', fields: Partial<LiveEventInput>) =>
  addLiveEvent(database.db, userId, matchId, kind, event(fields))
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))

describe('addLiveEvent for a goal', () => {
  it('adds the goal to the report without writing the rest again, and logs one line', async () => {
    const before = await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id))

    expect(await add('doelpunt', { minuut: '23', speler: await appearanceOf(9) })).toEqual({
      saved: 'Doelpunt opgeslagen: 23e minuut, Speler 9',
      status: 'saved',
    })

    expect(await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id))).toEqual(before)
    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.minute, 23))).toMatchObject([
      { ours: true, player: 'Speler 9' },
    ])
    expect(await database.db.select().from(matchGoals)).toHaveLength(4)
    expect(await log()).toMatchObject([
      { action: 'match.edit', detail: "Doelpunt 23' Speler 9", itemId: matchId, userId },
    ])
    expect(await database.db.select().from(matchReports)).toMatchObject([{ savedBy: userId }])
    expect(await database.db.select().from(matchEdits)).toMatchObject([{ goalsEdited: true }])
  })

  it('adds a goal of the opponent with a typed name, a penalty and added time', async () => {
    expect(
      await add('doelpunt', { extra: '3', kant: 'zij', minuut: '45', naam: 'Sibbing', soort: 'strafschop' }),
    ).toMatchObject({ status: 'saved' })
    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.ours, false))).toMatchObject([
      { minute: 40, player: 'Sibbing' },
      { minute: 45, penalty: true, player: 'Sibbing', stoppageMinutes: 3 },
    ])
    expect((await log())[0]?.detail).toBe("Doelpunt 45+3' Sibbing")
  })

  it('refuses a goal that can not be stored, with an error at the field, and writes nothing', async () => {
    expect(await add('doelpunt', { minuut: '', speler: await appearanceOf(9) })).toMatchObject({
      errors: { [liveFieldId('doelpunt', 'minuut')]: expect.any(String) as string },
      status: 'refused',
    })
    expect(await add('doelpunt', { minuut: '200', speler: await appearanceOf(9) })).toMatchObject({ status: 'refused' })
    expect(await add('doelpunt', { extra: '2', minuut: '30', speler: await appearanceOf(9) })).toMatchObject({
      errors: { [liveFieldId('doelpunt', 'extra')]: expect.any(String) as string },
      status: 'refused',
    })
    expect(await add('doelpunt', { kant: '', minuut: '30' })).toMatchObject({ status: 'refused' })
    expect(await add('doelpunt', { minuut: '30', speler: '999999' })).toMatchObject({
      errors: { [liveFieldId('doelpunt', 'speler')]: expect.any(String) as string },
      status: 'refused',
    })
    expect(await database.db.select().from(matchGoals)).toHaveLength(3)
    expect(await log()).toEqual([])
  })

  it('stores a goal that a rule objects to, and takes a klaar report back to bezig', async () => {
    // A goal for sc Heerenveen by a player of the opponent that is not an own goal.
    expect(await add('doelpunt', { minuut: '50', speler: await appearanceOf(9) })).toMatchObject({ status: 'saved' })
    expect((await database.db.select().from(matchReports))[0]?.status).toBe('bezig')
  })
})

describe('addLiveEvent for a card and a substitution', () => {
  it('adds a card and a substitution', async () => {
    expect(await add('kaart', { minuut: '30', soort: 'geel', speler: await appearanceOf(4) })).toEqual({
      saved: 'Kaart opgeslagen: 30e minuut, Speler 4',
      status: 'saved',
    })
    expect(
      await add('wissel', { erin: await appearanceOf(12), eruit: await appearanceOf(9), minuut: '60' }),
    ).toMatchObject({ status: 'saved' })
    expect(await database.db.select().from(matchCards)).toMatchObject([{ kind: 'geel', minute: 30, ours: true }])
    expect(await database.db.select().from(matchSubstitutions)).toMatchObject([{ minute: 60, ours: true }])
    expect((await log()).map((line) => line.detail)).toEqual([
      "Gele kaart 30' Speler 4",
      "Wissel 60' Speler 9 eruit, Speler 12 erin",
    ])
  })

  it('refuses a card for a player of the other team and a card without a kind', async () => {
    expect(
      await add('kaart', { kant: 'zij', minuut: '30', soort: 'geel', speler: await appearanceOf(9) }),
    ).toMatchObject({
      errors: { [liveFieldId('kaart', 'speler')]: expect.any(String) as string },
      status: 'refused',
    })
    expect(await add('kaart', { minuut: '30', speler: await appearanceOf(4) })).toMatchObject({
      errors: { [liveFieldId('kaart', 'soort')]: expect.any(String) as string },
      status: 'refused',
    })
    expect(await database.db.select().from(matchCards)).toEqual([])
  })

  it('refuses a substitution that can not be stored: the same player going off twice', async () => {
    const out = await appearanceOf(9)

    expect(await add('wissel', { erin: await appearanceOf(12), eruit: out, minuut: '60' })).toMatchObject({
      status: 'saved',
    })
    expect(await add('wissel', { erin: await appearanceOf(13), eruit: out, minuut: '70' })).toMatchObject({
      errors: { [liveFieldId('wissel', 'eruit')]: expect.any(String) as string },
      status: 'refused',
    })
    expect(await database.db.select().from(matchSubstitutions)).toHaveLength(1)
  })

  it('stores a substitution that a rule objects to, and takes a klaar report back to bezig', async () => {
    // Someone from the bench goes off, who is not on the pitch.
    expect(
      await add('wissel', { erin: await appearanceOf(13), eruit: await appearanceOf(12), minuut: '60' }),
    ).toMatchObject({
      status: 'saved',
    })
    expect(await database.db.select().from(matchSubstitutions)).toHaveLength(1)
    expect((await database.db.select().from(matchReports))[0]?.status).toBe('bezig')
  })

  it('stores a card for a player who left the pitch, and the report needs a look', async () => {
    await add('wissel', { erin: await appearanceOf(12), eruit: await appearanceOf(9), minuut: '60' })

    expect(await add('kaart', { minuut: '70', soort: 'geel', speler: await appearanceOf(9) })).toMatchObject({
      status: 'saved',
    })
    expect(await database.db.select().from(matchCards)).toHaveLength(1)
  })
})

describe('removeLiveEvent', () => {
  it('takes an event away, logs a line, and says so when it is gone already', async () => {
    await add('doelpunt', { kant: 'zij', minuut: '88', naam: 'Sibbing' })

    const [added] = await database.db.select().from(matchGoals).where(eq(matchGoals.minute, 88))

    expect(await removeLiveEvent(database.db, userId, matchId, 'doelpunt', added!.id)).toEqual({
      removed: "Doelpunt 88' Sibbing weggehaald",
      status: 'removed',
    })
    expect(await database.db.select().from(matchGoals)).toHaveLength(3)
    expect((await log()).map((line) => line.detail)).toEqual([
      "Doelpunt 88' Sibbing",
      "Doelpunt 88' Sibbing weggehaald",
    ])

    expect(await removeLiveEvent(database.db, userId, matchId, 'doelpunt', added!.id)).toEqual({ status: 'gone' })
    expect(await log()).toHaveLength(2)
  })

  it('takes away a card and a substitution, and no event of another match', async () => {
    await add('kaart', { minuut: '30', soort: 'rood', speler: await appearanceOf(4) })
    await add('wissel', { erin: await appearanceOf(12), eruit: await appearanceOf(9), minuut: '60' })

    const [card] = await database.db.select().from(matchCards)
    const [substitution] = await database.db.select().from(matchSubstitutions)

    expect(await removeLiveEvent(database.db, userId, matchId, 'kaart', card!.id)).toMatchObject({ status: 'removed' })
    expect(await removeLiveEvent(database.db, userId, matchId, 'wissel', substitution!.id)).toMatchObject({
      status: 'removed',
    })
    expect(await removeLiveEvent(database.db, userId, matchId + 1, 'wissel', substitution!.id)).toEqual({
      status: 'missing',
    })
    expect(await database.db.select().from(matchCards)).toEqual([])
    expect(await database.db.select().from(matchSubstitutions)).toEqual([])
  })
})

describe('two editors at the same time', () => {
  it('keeps every event when several are added at once, and logs each', async () => {
    const scorer = await appearanceOf(9)
    const minutes = ['10', '20', '30', '40', '50', '60']
    const outcomes = await Promise.all(minutes.map((minuut) => add('doelpunt', { minuut, speler: scorer })))

    expect(outcomes.map((outcome) => outcome.status)).toEqual(minutes.map(() => 'saved'))
    expect(await database.db.select().from(matchGoals)).toHaveLength(3 + minutes.length)
    expect(await log()).toHaveLength(minutes.length)
  })

  it('keeps an event that is added while a goal is taken away', async () => {
    await add('doelpunt', { minuut: '5', speler: await appearanceOf(9) })

    const [added] = await database.db.select().from(matchGoals).where(eq(matchGoals.minute, 5))
    const [removed, saved] = await Promise.all([
      removeLiveEvent(database.db, userId, matchId, 'doelpunt', added!.id),
      add('kaart', { minuut: '33', soort: 'geel', speler: await appearanceOf(4) }),
    ])

    expect(removed.status).toBe('removed')
    expect(saved.status).toBe('saved')
    expect(await database.db.select().from(matchCards)).toHaveLength(1)
    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.minute, 5))).toEqual([])
  })

  it('refuses the save of the full form that was opened before an event was added, and keeps the event', async () => {
    const screen = await findReportScreen(database.db, matchId)
    const opened = reportBasis(screen!.report)
    const checked = checkReportForm(report(squad), { match: screen!.match, squad: screen!.squad })

    await add('doelpunt', { minuut: '23', speler: await appearanceOf(9) })

    expect(await saveReport(database.db, userId, matchId, checked.plan!, new Date(), opened)).toEqual({
      status: 'stale',
    })
    expect(await database.db.select().from(matchGoals)).toHaveLength(4)

    const current = reportBasis(await readMatchReport(database.db, matchId))

    expect(current).not.toBe(opened)
    // With the report it was opened on, the form saves as before and replaces what is there.
    expect(await saveReport(database.db, userId, matchId, checked.plan!, new Date(), current)).toEqual({
      status: 'saved',
    })
    expect(await database.db.select().from(matchGoals)).toHaveLength(3)
  })
})

describe('the overview', () => {
  it('lists the events from the last to the first and the players for the lists', async () => {
    await add('doelpunt', { minuut: '23', speler: await appearanceOf(9) })
    await add('wissel', { erin: await appearanceOf(12), eruit: await appearanceOf(9), minuut: '60' })

    const stored = (await readMatchReport(database.db, matchId))!
    const goals = await database.db.select().from(matchGoals).orderBy(asc(matchGoals.id))
    const view = liveViewOf(stored, goals)

    expect(view.events.map((row) => row.text)).toEqual([
      "Doelpunt 77' Speler 10",
      "Wissel 60' Speler 9 eruit, Speler 12 erin",
      "Doelpunt 40' Sibbing",
      "Doelpunt 23' Speler 9",
      "Doelpunt 12' Speler 9",
    ])
    expect(view.score).toEqual({ opponent: 1, ours: 3 })
    expect(view.players.find((player) => player.label === '12 Speler 12')).toMatchObject({
      bench: false,
      onPitch: true,
    })
    expect(view.players.find((player) => player.label === '9 Speler 9')).toMatchObject({ bench: false, onPitch: false })
  })

  it('writes the minute with added time', () => {
    expect(describeEvent('doelpunt', { minute: 90, stoppageMinutes: 4 }, 'Van Aken')).toBe("Doelpunt 90+4' Van Aken")
    expect(describeEvent('doelpunt', { minute: null, stoppageMinutes: null }, 'Van Aken')).toBe('Doelpunt Van Aken')
  })
})
