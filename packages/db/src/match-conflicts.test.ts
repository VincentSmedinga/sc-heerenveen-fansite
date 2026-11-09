import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { decideConflict, decodePartProposal, encodePartProposal } from './match-conflicts.ts'
import { encodeGoals, encodeMatch } from './match-edits.ts'
import { adminUsers, auditLog, matchChanges, matchEdits, matches, matchGoals } from './schema.ts'
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
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const now = new Date('2026-11-02T10:00:00Z')

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

/** The match as Wikipedia has it: played, 3-1. */
const wikipedia = {
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  attendance: null,
  dateText: null,
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 3,
  kickoffAt: scheduled.kickoffAt ?? null,
  matchDate: '2026-10-31',
  note: null,
  penaltiesAgainst: null,
  penaltiesFor: null,
  referee: null,
  stadium: null,
  status: 'played',
} as const

/**
 * A match the editors filled in as 2-1 with a goal of ours, with a waiting difference for each
 * of the result and the goals: Wikipedia says 3-1 and a goal of ours in another minute.
 */
async function difference() {
  const [values] = await withClubs(database.db, [scheduled])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()
  const id = inserted?.id ?? 0
  const [before] = await database.db.select().from(matches).where(eq(matches.id, id))

  await database.db
    .update(matches)
    .set({ goalsAgainst: 1, goalsFor: 2, resultSetAt: now, status: 'played' })
    .where(eq(matches.id, id))
  await database.db
    .insert(matchGoals)
    .values({ matchId: id, minute: 12, ours: true, ownGoal: false, penalty: false, player: 'Oyen' })
  await database.db.insert(matchEdits).values({
    beforeGoals: encodeGoals([]),
    beforeMatch: encodeMatch(before!),
    editedAt: now,
    editedBy: adminId,
    goalsEdited: true,
    matchId: id,
    reason: 'Wikipedia is achter',
    resultEdited: true,
  })

  const base = {
    class: 'suspicious',
    competition: 'Eredivisie',
    firstSeenAt: now,
    lastSeenAt: now,
    matchId: id,
    reason: 'wijkt af van de invoer van de redactie',
    round: 'Speelronde 11',
    season: '2026/27',
    status: 'pending',
  } as const

  await database.db.insert(matchChanges).values([
    {
      ...base,
      changed: 'uitslag',
      newValue: 'sc Heerenveen 3–1 N.E.C.',
      oldValue: 'sc Heerenveen 2–1 N.E.C.',
      part: 'result',
      proposal: encodePartProposal('result', {
        goals: [],
        match: wikipedia,
      }),
    },
    {
      ...base,
      changed: 'doelpunten',
      newValue: "13' Oyen",
      oldValue: "12' Oyen",
      part: 'goals',
      proposal: encodePartProposal('goals', {
        goals: [
          {
            minute: 13,
            ours: true,
            ownGoal: false,
            penalty: false,
            player: 'Oyen',
            playerId: null,
            wikipediaPage: null,
          },
        ],
        match: wikipedia,
      }),
    },
  ])

  return id
}

const changeOf = async (part: 'goals' | 'result') =>
  (await database.db.select().from(matchChanges).where(eq(matchChanges.part, part)))[0]!

const takeOver = () =>
  ({ kind: 'take-over', reason: 'Wikipedia heeft gelijk', resolution: 'person', userId: adminId }) as const

describe('decideConflict', () => {
  it('takes the result over, clears its marker and keeps the rest of the entry', async () => {
    const id = await difference()
    const change = await changeOf('result')

    expect(await decideConflict(database.db, change.id, takeOver(), now)).toBe('done')

    expect((await database.db.select().from(matches).where(eq(matches.id, id)))[0]).toMatchObject({
      goalsAgainst: 1,
      goalsFor: 3,
      resultSetAt: now,
      status: 'played',
    })
    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, id))).toMatchObject([
      { minute: 12 },
    ])
    expect(await database.db.select().from(matchEdits)).toMatchObject([{ goalsEdited: true, resultEdited: false }])
    expect(await changeOf('result')).toMatchObject({ decidedAt: now, resolution: 'person', status: 'accepted' })
    expect(await changeOf('goals')).toMatchObject({ status: 'pending' })
    expect(await database.db.select().from(auditLog)).toMatchObject([
      {
        action: 'match.take-over',
        createdAt: now,
        detail: 'Uitslag: onze invoer: sc Heerenveen 2–1 N.E.C.; Wikipedia: sc Heerenveen 3–1 N.E.C.',
        itemId: id,
        reason: 'Wikipedia heeft gelijk',
        userId: adminId,
      },
    ])
  })

  it('takes the goals over and removes the row of the entry when no part is left', async () => {
    const id = await difference()

    await decideConflict(database.db, (await changeOf('result')).id, takeOver(), now)
    await decideConflict(database.db, (await changeOf('goals')).id, takeOver(), now)

    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, id))).toMatchObject([
      { minute: 13 },
    ])
    expect(await database.db.select().from(matchEdits)).toEqual([])
  })

  it('keeps the entry and writes it down', async () => {
    const id = await difference()
    const change = await changeOf('goals')

    expect(
      await decideConflict(
        database.db,
        change.id,
        { ...takeOver(), kind: 'keep', reason: 'Wij hebben het gezien' },
        now,
      ),
    ).toBe('done')

    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, id))).toMatchObject([
      { minute: 12 },
    ])
    expect(await database.db.select().from(matchEdits)).toMatchObject([{ goalsEdited: true, resultEdited: true }])
    expect(await changeOf('goals')).toMatchObject({ resolution: 'person', status: 'rejected' })
    expect(await database.db.select().from(auditLog)).toMatchObject([
      { action: 'match.keep', itemId: id, reason: 'Wij hebben het gezien', userId: adminId },
    ])
  })

  it('decides a difference once, and leaves a match that is gone alone', async () => {
    const id = await difference()
    const change = await changeOf('result')

    expect(await decideConflict(database.db, change.id, takeOver(), now)).toBe('done')
    expect(await decideConflict(database.db, change.id, { ...takeOver(), kind: 'keep' }, now)).toBe('not-waiting')
    expect(await decideConflict(database.db, 99_999, takeOver(), now)).toBe('not-waiting')
    expect(await database.db.select().from(auditLog)).toHaveLength(1)

    await database.db.delete(matches).where(eq(matches.id, id))

    expect(await decideConflict(database.db, (await changeOf('goals')).id, takeOver(), now)).toBe('gone')
  })

  it('does not take over a change that has no proposal', async () => {
    await difference()

    const change = await changeOf('result')

    await database.db.update(matchChanges).set({ proposal: 'geen json' }).where(eq(matchChanges.id, change.id))

    expect(await decideConflict(database.db, change.id, takeOver(), now)).toBe('no-proposal')
    expect(await changeOf('result')).toMatchObject({ status: 'pending' })
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})

describe('the proposal of a part', () => {
  it('goes through JSON and back, for each part', () => {
    for (const part of ['kickoff', 'result', 'goals'] as const) {
      expect(decodePartProposal(encodePartProposal(part, { goals: [], match: wikipedia }))).toMatchObject({ part })
    }

    expect(decodePartProposal(null)).toBeUndefined()
    expect(decodePartProposal('{"part":"result"}')).toBeUndefined()
    expect(decodePartProposal('niet json')).toBeUndefined()
  })
})
