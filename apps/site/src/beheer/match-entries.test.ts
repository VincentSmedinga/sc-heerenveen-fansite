import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { markedParts } from '@fansite/db/match-edits'
import {
  adminUsers,
  auditLog,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  type NewMatch,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { MatchEntry } from './match-form'

import { createAccount } from './accounts'
import { findMatch, listAdminMatches, saveEntry, undoEntry } from './match-entries'

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const t0 = new Date('2026-11-01T12:00:00Z')
const t1 = new Date('2026-11-01T13:00:00Z')

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

/** A match, or a match with these values. Returns its number. */
async function addMatch(overrides: Partial<Omit<NewMatch, 'clubId'>> = {}) {
  const [values] = await withClubs(database.db, [{ ...scheduled, ...overrides }])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  return inserted?.id ?? 0
}

const entry = (overrides: Partial<MatchEntry> = {}): MatchEntry => ({
  goals: [],
  kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T17:45:00Z'), matchDate: '2026-10-31' },
  result: {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    extraTime: false,
    goalsAgainst: 1,
    goalsFor: 2,
    penaltiesAgainst: null,
    penaltiesFor: null,
    status: 'played',
  },
  ...overrides,
})

const goal = (overrides: Partial<MatchEntry['goals'][number]> = {}): MatchEntry['goals'][number] => ({
  minute: 12,
  ours: true,
  ownGoal: false,
  penalty: false,
  player: 'Oyen',
  playerId: null,
  stoppageMinutes: null,
  wikipediaPage: null,
  ...overrides,
})

const stored = async (id: number) => (await database.db.select().from(matches).where(eq(matches.id, id)))[0]
const goalsOf = (id: number) =>
  database.db.select().from(matchGoals).where(eq(matchGoals.matchId, id)).orderBy(asc(matchGoals.id))
const edit = async (id: number) => (await database.db.select().from(matchEdits).where(eq(matchEdits.matchId, id)))[0]
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))

describe('saveEntry', () => {
  it('stores the result and the goals in the tables, marks the parts and keeps the match as it was', async () => {
    const id = await addMatch()
    const goals = [goal({ minute: 12 }), goal({ minute: 40, ours: false, player: 'Sibbing' }), goal({ minute: 77 })]

    expect(await saveEntry(database.db, userId, id, entry({ goals }), 'Wikipedia is achter', t0)).toEqual({
      parts: ['result', 'goals'],
      status: 'saved',
    })
    expect(await stored(id)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, resultSetAt: t0, status: 'played' })
    expect((await goalsOf(id)).map((row) => [row.minute, row.player, row.ours])).toEqual([
      [12, 'Oyen', true],
      [40, 'Sibbing', false],
      [77, 'Oyen', true],
    ])

    const marker = await edit(id)

    expect(marker).toMatchObject({
      editedAt: t0,
      editedBy: userId,
      goalsEdited: true,
      kickoffEdited: false,
      reason: 'Wikipedia is achter',
      resultEdited: true,
    })
    expect(JSON.parse(marker?.beforeMatch ?? '')).toMatchObject({
      goalsFor: null,
      resultSetAt: null,
      status: 'scheduled',
    })
    expect(JSON.parse(marker?.beforeGoals ?? '')).toEqual([])
  })

  it('writes match.edit in the log with who, why and the values before and after, and nothing else', async () => {
    const id = await addMatch()

    await saveEntry(database.db, userId, id, entry(), 'Wikipedia is achter', t0)

    expect(await log()).toEqual([
      {
        action: 'match.edit',
        createdAt: t0,
        detail: 'Uitslag: gepland → sc Heerenveen 2-1 N.E.C.',
        id: expect.any(Number),
        itemId: id,
        reason: 'Wikipedia is achter',
        userId,
      },
    ])
  })

  it('marks the kick-off as a part of its own', async () => {
    const id = await addMatch()

    expect(
      await saveEntry(
        database.db,
        userId,
        id,
        entry({
          kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T18:00:00Z'), matchDate: '2026-10-31' },
          result: { ...entry().result, goalsAgainst: null, goalsFor: null, status: 'scheduled' },
        }),
        'De tijd is veranderd',
        t0,
      ),
    ).toEqual({ parts: ['kickoff'], status: 'saved' })
    expect(markedParts((await edit(id))!)).toEqual(['kickoff'])
    expect(await stored(id)).toMatchObject({ kickoffAt: new Date('2026-10-31T18:00:00Z'), resultSetAt: null })
  })

  it('stores and logs nothing for a save that changes nothing', async () => {
    const id = await addMatch()

    expect(
      await saveEntry(
        database.db,
        userId,
        id,
        entry({ result: { ...entry().result, goalsAgainst: null, goalsFor: null, status: 'scheduled' } }),
        'Niets',
        t0,
      ),
    ).toEqual({ status: 'unchanged' })
    expect(await edit(id)).toBeUndefined()
    expect(await log()).toEqual([])
  })

  it('keeps the match as it was before the first entry through a second one, and moves the other fields along', async () => {
    const id = await addMatch()

    await saveEntry(database.db, userId, id, entry(), 'Eerst', t0)
    await saveEntry(
      database.db,
      userId,
      id,
      entry({ goals: [goal(), goal({ minute: 50, ours: false, player: 'Sibbing' }), goal({ minute: 80 })] }),
      'Daarna de doelpunten',
      t1,
    )

    const marker = await edit(id)

    expect(marker).toMatchObject({
      editedAt: t1,
      goalsEdited: true,
      reason: 'Daarna de doelpunten',
      resultEdited: true,
    })
    expect(JSON.parse(marker?.beforeMatch ?? '')).toMatchObject({ status: 'scheduled' })
    expect((await stored(id))?.resultSetAt).toEqual(t0)
    expect((await log()).map((line) => line.reason)).toEqual(['Eerst', 'Daarna de doelpunten'])
  })

  it('forgets what Wikipedia was reported to say about a part that is entered again', async () => {
    const id = await addMatch()

    await saveEntry(database.db, userId, id, entry(), 'Eerst', t0)
    await database.db
      .update(matchEdits)
      .set({ reportedGoals: 'x', reportedResult: 'sc Heerenveen 1-1 N.E.C.' })
      .where(eq(matchEdits.matchId, id))
    await saveEntry(
      database.db,
      userId,
      id,
      entry({ result: { ...entry().result, goalsAgainst: 1, goalsFor: 3 } }),
      'Nog een doelpunt',
      t1,
    )

    expect(await edit(id)).toMatchObject({ reportedGoals: 'x', reportedResult: null })
  })

  it('lets a change of Wikipedia that waited for the match go, since the entry replaces it', async () => {
    const id = await addMatch()

    await database.db.insert(matchChanges).values({
      changed: 'result',
      class: 'suspicious',
      competition: 'Eredivisie',
      firstSeenAt: t0,
      lastSeenAt: t0,
      matchId: id,
      oldValue: 'a',
      reason: 'x',
      round: 'Speelronde 11',
      season: '2026/27',
      status: 'pending',
    })
    await saveEntry(database.db, userId, id, entry(), 'Wij weten het beter', t1)

    expect((await database.db.select().from(matchChanges))[0]).toMatchObject({
      decidedAt: t1,
      resolution: 'replaced',
      status: 'rejected',
    })
  })

  it('takes a played match back to a match without a result, and clears the spectators of a match not played', async () => {
    const id = await addMatch({ attendance: 20_000, goalsAgainst: 0, goalsFor: 1, status: 'played' })

    await saveEntry(
      database.db,
      userId,
      id,
      entry({ result: { ...entry().result, goalsAgainst: null, goalsFor: null, status: 'postponed' } }),
      'Uitgesteld',
      t0,
    )

    expect(await stored(id)).toMatchObject({ attendance: null, goalsFor: null, resultSetAt: null, status: 'postponed' })
  })

  it('says a match is missing, and writes nothing', async () => {
    expect(await saveEntry(database.db, userId, 99_999, entry(), 'Wie weet', t0)).toEqual({ status: 'missing' })
    expect(await log()).toEqual([])
  })

  it('writes nothing to the log when the save fails', async () => {
    const id = await addMatch()

    await expect(
      saveEntry(database.db, userId, id, entry({ goals: [goal({ player: 'x'.repeat(200) })] }), 'Te lang', t0),
    ).rejects.toBeDefined()
    expect(await log()).toEqual([])
    expect(await edit(id)).toBeUndefined()
    expect(await stored(id)).toMatchObject({ goalsFor: null, status: 'scheduled' })
  })
})

describe('undoEntry', () => {
  it('puts the match and the goals back, removes the row and writes match.undo with the reason', async () => {
    const id = await addMatch()
    const before = await stored(id)

    await saveEntry(
      database.db,
      userId,
      id,
      entry({ goals: [goal(), goal({ minute: 50, ours: false }), goal({ minute: 80 })] }),
      'Eerst',
      t0,
    )

    expect(await undoEntry(database.db, userId, id, 'Het was een vergissing', t1)).toBe('done')
    expect(await stored(id)).toEqual(before)
    expect(await goalsOf(id)).toEqual([])
    expect(await edit(id)).toBeUndefined()
    expect((await log())[1]).toMatchObject({
      action: 'match.undo',
      createdAt: t1,
      detail: 'Teruggezet: uitslag, doelpunten',
      itemId: id,
      reason: 'Het was een vergissing',
      userId,
    })
  })

  it('says there is no entry, or no match, and writes nothing', async () => {
    const id = await addMatch()

    expect(await undoEntry(database.db, userId, id, 'Waarom', t1)).toBe('none')
    expect(await undoEntry(database.db, userId, 99_999, 'Waarom', t1)).toBe('missing')
    expect(await log()).toEqual([])
  })
})

describe('listAdminMatches and findMatch', () => {
  it('puts the matches without a result first, labels the entries, and keeps the order of the season otherwise', async () => {
    const played = await addMatch({
      goalsAgainst: 0,
      goalsFor: 1,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      matchDate: '2026-08-09',
      round: 'Speelronde 1',
      status: 'played',
    })
    const noResult = await addMatch({ kickoffAt: new Date('2026-10-31T17:45:00Z'), round: 'Speelronde 11' })
    const future = await addMatch({
      kickoffAt: new Date('2026-12-05T17:45:00Z'),
      matchDate: '2026-12-05',
      round: 'Speelronde 15',
    })
    const soon = await addMatch({
      kickoffAt: new Date('2026-11-01T09:00:00Z'),
      matchDate: '2026-11-01',
      round: 'Speelronde 12',
    })

    await saveEntry(database.db, userId, noResult, entry(), 'Wikipedia is achter', t0)

    const { rows } = await listAdminMatches(database.db, '2026/27', new Date('2026-11-01T12:00:00Z'))

    expect(rows.map((row) => [row.id, row.lacksResult, row.edited])).toEqual([
      [soon, true, []],
      [played, false, []],
      [noResult, false, ['result']],
      [future, false, []],
    ])
  })

  it('finds a match with its goals, its marker with the email of the editor, and the squad of its season', async () => {
    const id = await addMatch()

    await database.db.insert(players).values([
      { name: 'Bernt Klaverboer', position: 'aanvaller', searchTerm: 'klaverboer', season: '2026/27' },
      { name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season: '2026/27' },
      { name: 'Vorig Jaar', position: 'aanvaller', searchTerm: 'vorig', season: '2025/26' },
    ])
    await saveEntry(
      database.db,
      userId,
      id,
      entry({ goals: [goal(), goal({ minute: 50, ours: false }), goal({ minute: 80 })] }),
      'Eerst',
      t0,
    )

    const found = await findMatch(database.db, id)

    expect(found?.match).toMatchObject({ id, round: 'Speelronde 11' })
    expect(found?.goals).toHaveLength(3)
    expect(found?.edit).toMatchObject({ editedByEmail: 'sanne@example.org', resultEdited: true })
    expect(found?.squad.map((player) => player.name)).toEqual(['Bernt Klaverboer', 'Luca Oyen'])
    expect(await findMatch(database.db, 99_999)).toBeUndefined()
  })
})
