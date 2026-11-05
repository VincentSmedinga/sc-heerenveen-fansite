import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Proposal, ReadMatch } from './match-changes.ts'
import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { decideChange, decodeProposal, describeChange, encodeProposal } from './match-changes.ts'
import { adminUsers, auditLog, matchChanges, matches, matchGoals } from './schema.ts'
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

const now = new Date('2026-11-05T10:00:00Z')

const stored: Omit<NewMatch, 'clubId'> = {
  competition: 'KNVB Beker',
  goalsAgainst: 0,
  goalsFor: 2,
  home: true,
  kickoffAt: new Date('2014-02-05T19:45:00Z'),
  matchDate: '2014-02-05',
  opponent: 'Ajax',
  resultSetAt: new Date('2014-02-05T22:00:00Z'),
  round: 'Achtste finales',
  season: '2013/14',
  status: 'played',
}

/** What Wikipedia says now: the same match, 3-0. */
const read: ReadMatch = {
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  attendance: null,
  competition: 'KNVB Beker',
  dateText: null,
  extraTime: false,
  factsProblem: null,
  goals: [],
  goalsAgainst: 0,
  goalsFor: 3,
  goalsProblem: null,
  home: true,
  kickoffAt: stored.kickoffAt ?? null,
  matchDate: '2014-02-05',
  note: null,
  opponent: 'Ajax',
  opponentPage: null,
  penaltiesAgainst: null,
  penaltiesFor: null,
  referee: null,
  round: 'Achtste finales',
  stadium: null,
  status: 'played',
}

const goal = {
  minute: 12,
  ours: true,
  ownGoal: false,
  penalty: true,
  personId: null,
  player: 'Ziyech',
  playerId: null,
  playerPage: null,
  stoppageMinutes: null,
}

/** A match with a goal and a change that waits for it; `newValue` null is a removal. */
async function heldChange(newValue: null | string = 'sc Heerenveen 3–0 Ajax') {
  const [values] = await withClubs(database.db, [stored])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()
  const id = inserted?.id ?? 0
  const proposal: Proposal = { clubId: values!.clubId, goals: [goal], match: read }

  await database.db.insert(matchGoals).values({ matchId: id, minute: 12, ours: true, player: 'Hakim Ziyech' })

  const [change] = await database.db
    .insert(matchChanges)
    .values({
      changed: 'result',
      class: 'suspicious',
      competition: 'KNVB Beker',
      firstSeenAt: new Date('2026-11-01T10:00:00Z'),
      lastSeenAt: now,
      matchId: id,
      newValue,
      oldValue: 'sc Heerenveen 2–0 Ajax',
      proposal: newValue === null ? null : encodeProposal(proposal),
      reason: 'the season is over, and its matches do not change',
      round: 'Achtste finales',
      season: '2013/14',
      status: 'pending',
    })
    .$returningId()

  return { changeId: change?.id ?? 0, matchId: id }
}

const decision = (kind: 'keep' | 'take-over', userId: null | number = adminId) => ({
  kind,
  reason: 'Ik heb de pagina gelezen',
  userId,
})

const log = () => database.db.select().from(auditLog)

describe('decideChange', () => {
  it('takes a held change over: the match and its goals become what Wikipedia says', async () => {
    const { changeId, matchId } = await heldChange()

    expect(await decideChange(database.db, changeId, decision('take-over'), now)).toBe('done')

    const [match] = await database.db.select().from(matches).where(eq(matches.id, matchId))
    const goals = await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, matchId))
    const [change] = await database.db.select().from(matchChanges).where(eq(matchChanges.id, changeId))

    expect(match).toMatchObject({ goalsAgainst: 0, goalsFor: 3 })
    expect(match?.resultSetAt).toEqual(now)
    expect(goals).toMatchObject([{ penalty: true, player: 'Ziyech' }])
    expect(change).toMatchObject({ decidedAt: now, resolution: 'person', status: 'accepted' })
    expect(await log()).toMatchObject([
      {
        action: 'match.take-over',
        createdAt: now,
        detail:
          'Wijziging van Wikipedia (result): op de site: sc Heerenveen 2–0 Ajax; Wikipedia: sc Heerenveen 3–0 Ajax',
        itemId: matchId,
        reason: 'Ik heb de pagina gelezen',
        userId: adminId,
      },
    ])
  })

  it('deletes the match when Wikipedia does not name it any more', async () => {
    const { changeId, matchId } = await heldChange(null)

    expect(await decideChange(database.db, changeId, decision('take-over'), now)).toBe('done')
    expect(await database.db.select().from(matches).where(eq(matches.id, matchId))).toEqual([])
    expect((await database.db.select().from(matchChanges))[0]).toMatchObject({
      resolution: 'person',
      status: 'accepted',
    })
    expect(await log()).toMatchObject([
      { action: 'match.take-over', detail: expect.stringContaining('Wikipedia: niets') },
    ])
  })

  it('rejects a held change: the match stays as it is', async () => {
    const { changeId, matchId } = await heldChange()

    expect(await decideChange(database.db, changeId, decision('keep'), now)).toBe('done')

    const [match] = await database.db.select().from(matches).where(eq(matches.id, matchId))
    const [change] = await database.db.select().from(matchChanges)

    expect(match).toMatchObject({ goalsFor: 2 })
    expect(await database.db.select().from(matchGoals)).toMatchObject([{ player: 'Hakim Ziyech' }])
    expect(change).toMatchObject({ decidedAt: now, resolution: 'person', status: 'rejected' })
    expect(await log()).toMatchObject([{ action: 'match.keep', itemId: matchId, userId: adminId }])
  })

  it('writes the command without an account', async () => {
    const { changeId } = await heldChange()

    await decideChange(database.db, changeId, decision('keep', null), now)

    expect(await log()).toMatchObject([{ action: 'match.keep', userId: null }])
  })

  it('changes nothing for a change that is decided already', async () => {
    const { changeId } = await heldChange()

    await decideChange(database.db, changeId, decision('keep'), now)

    expect(await decideChange(database.db, changeId, decision('take-over'), new Date('2026-11-06T10:00:00Z'))).toBe(
      'not-waiting',
    )
    expect((await database.db.select().from(matchChanges))[0]).toMatchObject({ decidedAt: now, status: 'rejected' })
    expect(await database.db.select().from(matches)).toMatchObject([{ goalsFor: 2 }])
    expect(await log()).toHaveLength(1)
  })

  it('says that a change does not exist, or is a difference with an entry of the editors', async () => {
    const { changeId } = await heldChange()

    await database.db.update(matchChanges).set({ part: 'result' }).where(eq(matchChanges.id, changeId))

    expect(await decideChange(database.db, changeId, decision('take-over'), now)).toBe('not-waiting')
    expect(await decideChange(database.db, changeId + 100, decision('take-over'), now)).toBe('not-waiting')
    expect((await database.db.select().from(matchChanges))[0]).toMatchObject({ status: 'pending' })
    expect(await log()).toEqual([])
  })

  it.each(['take-over', 'keep'] as const)('changes nothing when the match is gone (%s)', async (kind) => {
    const { changeId, matchId } = await heldChange()

    await database.db.delete(matches).where(eq(matches.id, matchId))

    expect(await decideChange(database.db, changeId, decision(kind), now)).toBe('gone')
    expect((await database.db.select().from(matchChanges))[0]).toMatchObject({ decidedAt: null, status: 'pending' })
    expect(await log()).toEqual([])
  })

  it('changes nothing when the change has no proposal to apply, but a person can still reject it', async () => {
    const { changeId } = await heldChange()

    await database.db.update(matchChanges).set({ proposal: 'not json' }).where(eq(matchChanges.id, changeId))

    expect(await decideChange(database.db, changeId, decision('take-over'), now)).toBe('no-proposal')
    expect(await database.db.select().from(matches)).toMatchObject([{ goalsFor: 2 }])
    expect(await log()).toEqual([])
    expect(await decideChange(database.db, changeId, decision('keep'), now)).toBe('done')
  })
})

describe('proposals', () => {
  it('keeps a proposal through its text, with the kick-off as a moment', () => {
    const proposal: Proposal = { clubId: 3, goals: [goal], match: read }

    expect(decodeProposal(encodeProposal(proposal))).toEqual(proposal)
    expect(decodeProposal(null)).toBeUndefined()
    expect(decodeProposal('{"goals":1}')).toBeUndefined()
    expect(decodeProposal('nope')).toBeUndefined()
  })

  it('describes a change for the log', () => {
    expect(describeChange({ changed: 'goals', newValue: null, oldValue: 'x' })).toBe(
      'Wijziging van Wikipedia (goals): op de site: x; Wikipedia: niets',
    )
  })
})
