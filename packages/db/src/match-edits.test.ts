import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import {
  clearParts,
  describeEntryGoals,
  describeEntryKickoff,
  describeEntryResult,
  encodeGoals,
  encodeMatch,
  markedParts,
  removeEntry,
} from './match-edits.ts'
import { hasEditedMatches } from './queries.ts'
import { adminUsers, matchEdits, matches, matchGoals, players } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let adminId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const scheduled: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  home: true,
  kickoffAt: new Date('2026-10-31T17:45:00Z'),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season: '2026/27',
  status: 'scheduled',
}

/** A scheduled match, and the row of an entry that made it a played one with a goal. */
async function entered(parts: { goals?: boolean; kickoff?: boolean; result?: boolean }) {
  const [values] = await withClubs(database.db, [scheduled])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()
  const id = inserted?.id ?? 0
  const [before] = await database.db.select().from(matches).where(eq(matches.id, id))

  await database.db
    .update(matches)
    .set({
      goalsAgainst: 0,
      goalsFor: 1,
      kickoffAt: new Date('2026-10-31T18:00:00Z'),
      resultSetAt: new Date('2026-11-01T12:00:00Z'),
      status: 'played',
    })
    .where(eq(matches.id, id))
  await database.db.insert(matchGoals).values({ matchId: id, minute: 12, ours: true, player: 'Oyen' })
  await database.db.insert(matchEdits).values({
    beforeGoals: encodeGoals([]),
    beforeMatch: encodeMatch(before!),
    editedAt: new Date('2026-11-01T12:00:00Z'),
    editedBy: adminId,
    goalsEdited: parts.goals ?? false,
    kickoffEdited: parts.kickoff ?? false,
    matchId: id,
    reason: 'Wikipedia is achter',
    resultEdited: parts.result ?? false,
  })

  const [edit] = await database.db.select().from(matchEdits).where(eq(matchEdits.matchId, id))

  return { before: before!, edit: edit!, id }
}

describe('the table match_edits', () => {
  it('refuses a row that marks no part', async () => {
    const { id } = await entered({ result: true })

    await expect(
      database.db
        .update(matchEdits)
        .set({ goalsEdited: false, kickoffEdited: false, resultEdited: false })
        .where(eq(matchEdits.matchId, id)),
    ).rejects.toBeDefined()
  })

  it('holds one row per match, goes with its match and keeps the account of the last entry', async () => {
    const { id } = await entered({ result: true })

    await expect(
      database.db.insert(matchEdits).values({
        beforeGoals: '[]',
        beforeMatch: '{}',
        editedAt: new Date(),
        editedBy: adminId,
        matchId: id,
        reason: 'nog een keer',
        resultEdited: true,
      }),
    ).rejects.toBeDefined()

    await database.db.delete(matches).where(eq(matches.id, id))

    expect(await database.db.select().from(matchEdits)).toEqual([])
  })

  it('knows whether any match has an entry', async () => {
    expect(await hasEditedMatches(database.db)).toBe(false)

    const { edit } = await entered({ result: true })

    expect(await hasEditedMatches(database.db)).toBe(true)

    await clearParts(database.db, edit, ['result'])

    expect(await hasEditedMatches(database.db)).toBe(false)
  })
})

describe('clearParts', () => {
  it('clears the markers it is given, with what was reported for them, and leaves the others', async () => {
    const { edit, id } = await entered({ goals: true, result: true })

    await database.db
      .update(matchEdits)
      .set({ reportedGoals: 'x', reportedResult: 'y' })
      .where(eq(matchEdits.matchId, id))

    const left = await clearParts(database.db, edit, ['goals'])

    expect(left).toEqual(['result'])
    expect((await database.db.select().from(matchEdits))[0]).toMatchObject({
      goalsEdited: false,
      reportedGoals: null,
      reportedResult: 'y',
      resultEdited: true,
    })
  })

  it('removes the row when no part is left', async () => {
    const { edit } = await entered({ kickoff: true, result: true })

    expect(markedParts(edit)).toEqual(['kickoff', 'result'])
    expect(await clearParts(database.db, edit, ['kickoff', 'result'])).toEqual([])
    expect(await database.db.select().from(matchEdits)).toEqual([])
  })
})

describe('removeEntry', () => {
  it('puts the match, the result and the goals back to what they were before the first entry', async () => {
    const { before, edit, id } = await entered({ goals: true, kickoff: true, result: true })

    await removeEntry(database.db, edit)

    expect((await database.db.select().from(matches).where(eq(matches.id, id)))[0]).toEqual(before)
    expect(await database.db.select().from(matchGoals)).toEqual([])
    expect(await database.db.select().from(matchEdits)).toEqual([])
  })

  it('puts back only the parts that are still marked, so what Wikipedia took over stays', async () => {
    const { edit, id } = await entered({ result: true })

    await removeEntry(database.db, edit)

    const [match] = await database.db.select().from(matches).where(eq(matches.id, id))

    expect(match).toMatchObject({ goalsFor: null, kickoffAt: new Date('2026-10-31T18:00:00Z'), status: 'scheduled' })
    // The goals were not the editors' to take back.
    expect(await database.db.select().from(matchGoals)).toHaveLength(1)
  })

  it('brings back the goals as they were, without a link to a player that is gone', async () => {
    const [values] = await withClubs(database.db, [scheduled])
    const [{ id: playerId }] = await database.db
      .insert(players)
      .values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season: '2026/27' })
      .$returningId()
      .then((rows) => rows as [{ id: number }])
    const [inserted] = await database.db
      .insert(matches)
      .values({ ...values!, goalsAgainst: 0, goalsFor: 1, status: 'played' })
      .$returningId()
    const id = inserted?.id ?? 0

    await database.db.insert(matchGoals).values({ matchId: id, minute: 5, ours: true, player: 'Oyen', playerId })

    const [match] = await database.db.select().from(matches).where(eq(matches.id, id))
    const goals = await database.db.select().from(matchGoals)

    await database.db.insert(matchEdits).values({
      beforeGoals: encodeGoals(goals),
      beforeMatch: encodeMatch(match!),
      editedAt: new Date(),
      editedBy: adminId,
      goalsEdited: true,
      matchId: id,
      reason: 'Fout',
    })
    await database.db.delete(matchGoals)
    await database.db.delete(players)

    const [edit] = await database.db.select().from(matchEdits)

    await removeEntry(database.db, edit!)

    expect(await database.db.select().from(matchGoals)).toMatchObject([{ minute: 5, player: 'Oyen', playerId: null }])
  })
})

describe('the lines the log and the page use', () => {
  const match = { home: true, opponent: 'N.E.C.' }

  it('writes a result from the side of the home club, with extra time, the score after 90 minutes and penalties', () => {
    const score = {
      afterNinetyAgainst: null,
      afterNinetyFor: null,
      extraTime: false,
      penaltiesAgainst: null,
      penaltiesFor: null,
    }

    expect(describeEntryResult({ ...match, ...score, goalsAgainst: 1, goalsFor: 2, status: 'played' })).toBe(
      'sc Heerenveen 2–1 N.E.C.',
    )
    expect(
      describeEntryResult({ ...match, ...score, goalsAgainst: 1, goalsFor: 2, home: false, status: 'played' }),
    ).toBe('N.E.C. 1–2 sc Heerenveen')
    expect(
      describeEntryResult({
        ...match,
        afterNinetyAgainst: 1,
        afterNinetyFor: 1,
        extraTime: true,
        goalsAgainst: 1,
        goalsFor: 1,
        penaltiesAgainst: 3,
        penaltiesFor: 4,
        status: 'played',
      }),
    ).toBe('sc Heerenveen 1–1 N.E.C. (na verlenging, 1–1 na 90 minuten, strafschoppen 4–3)')
    expect(describeEntryResult({ ...match, ...score, goalsAgainst: null, goalsFor: null, status: 'postponed' })).toBe(
      'uitgesteld',
    )
    expect(describeEntryResult({ ...match, ...score, goalsAgainst: null, goalsFor: null, status: 'scheduled' })).toBe(
      'gepland',
    )
  })

  it('writes a kick-off in Dutch time, or the date as it is given', () => {
    expect(
      describeEntryKickoff({ dateText: null, kickoffAt: new Date('2026-10-31T17:45:00Z'), matchDate: '2026-10-31' }),
    ).toBe('31 oktober 2026 18:45')
    expect(describeEntryKickoff({ dateText: '12-14 februari 2027', kickoffAt: null, matchDate: '2027-02-12' })).toBe(
      '12-14 februari 2027',
    )
  })

  it('writes the goals with the minute, the added time and what kind they were', () => {
    expect(describeEntryGoals([])).toBe('geen doelpunten')
    expect(
      describeEntryGoals([
        { minute: 12, ours: true, ownGoal: false, penalty: false, player: 'Oyen', playerId: 1, stoppageMinutes: null },
        {
          minute: 45,
          ours: false,
          ownGoal: true,
          penalty: false,
          player: 'Sibbing',
          playerId: null,
          stoppageMinutes: 1,
        },
        {
          minute: 80,
          ours: false,
          ownGoal: false,
          penalty: true,
          player: 'Van Dijk',
          playerId: null,
          stoppageMinutes: null,
        },
      ]),
    ).toBe("12' Oyen, 45+1' Sibbing (tegenstander, eigen doelpunt), 80' Van Dijk (tegenstander, strafschop)")
  })
})
