import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { MatchClaim } from './match-lookup.ts'
import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { mailConflicts } from './match-conflict-mail.ts'
import { decideConflict, decodePartProposal, describeConflict, sourceDifferenceReasons } from './match-conflicts.ts'
import { compareClaim } from './match-lookup.ts'
import { adminUsers, auditLog, matchChanges, matches } from './schema.ts'
import { keepSourceDifferences, readTakenOverParts } from './source-differences.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let adminId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
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

const first = new Date('2026-11-09T10:00:00Z')
const later = new Date('2026-11-10T10:00:00Z')

/** A match of the old fansite: sc Heerenveen 2-1 Testdorp FC, with a referee. */
const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '2001-09-01',
  opponent: 'Testdorp FC',
  referee: 'Piet Fluit',
  round: 'Wedstrijd 1',
  season: '2001/02',
  status: 'played',
}

async function insert(values: Partial<NewMatch> = {}) {
  const [row] = await withClubs(database.db, [{ ...base, ...values }])

  await database.db.insert(matches).values(row!)
}

const stored = async () => (await database.db.select().from(matches))[0]!

const changes = () => database.db.select().from(matchChanges).orderBy(asc(matchChanges.id))

/** Compares the stored match with what Wikipedia says and keeps what differs. */
async function keep(claim: MatchClaim, now = first) {
  const match = await stored()

  return keepSourceDifferences(database.db, match, claim, compareClaim(match, claim), 'wikipedia', now)
}

const decide = (id: number, kind: 'keep' | 'take-over') =>
  decideConflict(database.db, id, { kind, reason: 'Nagekeken', resolution: 'person', userId: adminId }, later)

describe('keepSourceDifferences', () => {
  it('makes a change that waits for each part that differs, and leaves the match as it is', async () => {
    await insert()

    const before = await stored()

    expect(await keep({ goalsFor: 3, referee: 'Jan Bel' })).toEqual({ kept: ['result', 'facts'], rest: [] })
    expect(await stored()).toEqual(before)
    expect(await changes()).toMatchObject([
      {
        changed: 'uitslag',
        class: 'suspicious',
        competition: 'Eredivisie',
        firstSeenAt: first,
        matchId: before.id,
        newValue: 'sc Heerenveen 3–1 Testdorp FC',
        oldValue: 'sc Heerenveen 2–1 Testdorp FC',
        part: 'result',
        reason: sourceDifferenceReasons.wikipedia,
        round: 'Wedstrijd 1',
        season: '2001/02',
        status: 'pending',
        timesSeen: 1,
      },
      {
        newValue: 'toeschouwers geen, scheidsrechter Jan Bel, stadion geen, opmerking geen',
        oldValue: 'toeschouwers geen, scheidsrechter Piet Fluit, stadion geen, opmerking geen',
        part: 'facts',
        status: 'pending',
      },
    ])
  })

  it('keeps the same difference once, and sees it again at a later run', async () => {
    await insert()
    await keep({ goalsFor: 3 })

    expect(await keep({ goalsFor: 3 }, later)).toEqual({ kept: [], rest: [] })
    expect(await changes()).toMatchObject([{ firstSeenAt: first, lastSeenAt: later, status: 'pending', timesSeen: 2 }])
  })

  it('closes a difference that is gone, and may keep it again when it comes back', async () => {
    await insert()
    await keep({ goalsFor: 3 })
    await keep({ goalsFor: 2 }, later)

    expect(await changes()).toMatchObject([{ decidedAt: later, resolution: 'reverted', status: 'rejected' }])

    expect(await keep({ goalsFor: 3 }, later)).toMatchObject({ kept: ['result'] })
    expect(await changes()).toMatchObject([{ status: 'rejected' }, { status: 'pending' }])
  })

  it('replaces a difference whose value changed', async () => {
    await insert()
    await keep({ goalsFor: 3 })
    await keep({ goalsFor: 4 }, later)

    expect(await changes()).toMatchObject([
      { newValue: 'sc Heerenveen 3–1 Testdorp FC', resolution: 'replaced', status: 'rejected' },
      { newValue: 'sc Heerenveen 4–1 Testdorp FC', status: 'pending' },
    ])
  })

  it('does not bring a difference back that a person rejected, while both values stay the same', async () => {
    await insert()
    await keep({ goalsFor: 3 })

    const [change] = await changes()

    expect(await decide(change!.id, 'keep')).toBe('done')
    expect(await keep({ goalsFor: 3 }, later)).toEqual({ kept: [], rest: [] })
    expect(await changes()).toMatchObject([{ resolution: 'person', status: 'rejected' }])
    expect((await stored()).goalsFor).toBe(2)

    // Another value of the second source is a new difference.
    expect(await keep({ goalsFor: 4 }, later)).toMatchObject({ kept: ['result'] })
  })

  it('lets an editor take the second source over, with a line in the log that names it', async () => {
    await insert()
    await keep({ goalsFor: 3 })

    const [change] = await changes()

    expect(await decide(change!.id, 'take-over')).toBe('done')
    expect(await stored()).toMatchObject({ goalsAgainst: 1, goalsFor: 3, referee: 'Piet Fluit', status: 'played' })
    expect(await database.db.select().from(auditLog)).toMatchObject([
      {
        action: 'match.take-over',
        detail: 'Uitslag: in de database: sc Heerenveen 2–1 Testdorp FC; Wikipedia: sc Heerenveen 3–1 Testdorp FC',
        userId: adminId,
      },
    ])
    // The sources agree now, so there is nothing to keep.
    expect(await keep({ goalsFor: 3 }, later)).toEqual({ kept: [], rest: [] })
    expect(await readTakenOverParts(database.db, [change!.matchId!])).toEqual(
      new Map([[change!.matchId, new Set(['result'])]]),
    )
  })

  it('proposes the part with the fields the caller fills, so taking it over loses nothing', async () => {
    await insert({ competition: 'KNVB Beker', extraTime: true })
    // The second source has the score after ninety minutes, which is filled, and another score.
    await keep({ afterNinetyAgainst: 1, afterNinetyFor: 1, goalsFor: 3 })

    const [change] = await changes()

    expect(change).toMatchObject({
      newValue: 'sc Heerenveen 3–1 Testdorp FC (na verlenging, 1–1 na 90 minuten)',
      oldValue: 'sc Heerenveen 2–1 Testdorp FC (na verlenging, 1–1 na 90 minuten)',
    })
    expect(decodePartProposal(change!.proposal)).toMatchObject({ afterNinetyFor: 1, goalsFor: 3, part: 'result' })
  })

  it('leaves a difference that the line of its part does not show to the caller', async () => {
    await insert({ dateText: 'x' })

    // The kick-off is filled, and its line names the day of the kick-off, not `matchDate`.
    const kept = await keep({ kickoffAt: new Date('2001-09-02T12:30:00Z'), matchDate: '2001-09-02' })

    expect(kept).toMatchObject({ kept: [], rest: [{ field: 'matchDate' }] })
    expect(await changes()).toEqual([])
  })

  it('leaves a field of no part, such as home, to the caller', async () => {
    await insert()

    expect(await keep({ home: false })).toMatchObject({ kept: [], rest: [{ field: 'home' }] })
    expect(await changes()).toEqual([])
  })

  it('never mails about a difference between two sources', async () => {
    const sent: unknown[] = []

    await insert()
    await keep({ goalsFor: 3 })
    await mailConflicts(database.db, {
      env: { SITE_ENV: 'acceptance' },
      send: async (mail) => {
        sent.push(mail)
      },
      write: () => undefined,
    })

    expect(sent).toEqual([])
    expect(await changes()).toMatchObject([{ mailedAt: null }])
  })
})

describe('readTakenOverParts', () => {
  it('counts the last decision of a person about a part', async () => {
    await insert()
    await keep({ goalsFor: 3 })

    const [change] = await changes()
    const matchId = change!.matchId!

    expect(await readTakenOverParts(database.db, [matchId])).toEqual(new Map())

    await decide(change!.id, 'keep')
    expect(await readTakenOverParts(database.db, [matchId])).toEqual(new Map([[matchId, new Set()]]))
    expect(await readTakenOverParts(database.db, [])).toEqual(new Map())
  })
})

describe('the line for the log', () => {
  it('names the database and the second source for a difference between two sources', () => {
    expect(
      describeConflict({
        newValue: '2 september 2001',
        oldValue: '1 september 2001',
        part: 'kickoff',
        reason: sourceDifferenceReasons['oude-fansite'],
      }),
    ).toBe('Aftrap: in de database: 1 september 2001; de oude fansite: 2 september 2001')
  })
})
