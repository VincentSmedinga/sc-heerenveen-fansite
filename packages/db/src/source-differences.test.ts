import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { MatchClaim } from './match-lookup.ts'
import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { mailConflicts } from './match-conflict-mail.ts'
import { decideConflict, decodePartProposal, describeConflict, sourceDifferenceReasons } from './match-conflicts.ts'
import { partOfField } from './match-edits.ts'
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

    expect(await keep({ goalsFor: 3, referee: 'Jan Bel' })).toEqual(['result', 'facts'])
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

    expect(await keep({ goalsFor: 3 }, later)).toEqual([])
    expect(await changes()).toMatchObject([{ firstSeenAt: first, lastSeenAt: later, status: 'pending', timesSeen: 2 }])
  })

  it('closes a difference that is gone, and may keep it again when it comes back', async () => {
    await insert()
    await keep({ goalsFor: 3 })
    await keep({ goalsFor: 2 }, later)

    expect(await changes()).toMatchObject([{ decidedAt: later, resolution: 'reverted', status: 'rejected' }])

    expect(await keep({ goalsFor: 3 }, later)).toEqual(['result'])
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
    expect(await keep({ goalsFor: 3 }, later)).toEqual([])
    expect(await changes()).toMatchObject([{ resolution: 'person', status: 'rejected' }])
    expect((await stored()).goalsFor).toBe(2)

    // Another value of the second source is a new difference.
    expect(await keep({ goalsFor: 4 }, later)).toEqual(['result'])
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
    expect(await keep({ goalsFor: 3 }, later)).toEqual([])
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

  it('names the column that differs when the line of its part reads the same for both', async () => {
    await insert({ dateText: 'x' })

    // The kick-off is filled, and its line names the day of the kick-off, not `matchDate`.
    expect(await keep({ kickoffAt: new Date('2001-09-02T12:30:00Z'), matchDate: '2001-09-02' })).toEqual(['kickoff'])
    expect(await changes()).toMatchObject([
      {
        newValue: '2 september 2001 om 14:30 (speeldag 2 september 2001)',
        oldValue: '2 september 2001 om 14:30 (speeldag 1 september 2001)',
        part: 'kickoff',
      },
    ])
  })

  it('keeps a difference in who played at home with the result, and takes it over with it', async () => {
    await insert()

    expect(await keep({ home: false })).toEqual(['result'])

    const [change] = await changes()

    expect(change).toMatchObject({
      newValue: 'Testdorp FC 1–2 sc Heerenveen',
      oldValue: 'sc Heerenveen 2–1 Testdorp FC',
      part: 'result',
    })
    expect(await decide(change!.id, 'take-over')).toBe('done')
    expect(await stored()).toMatchObject({ goalsFor: 2, home: false })
  })

  it('says thuis or uit behind the result of a match that is not played', async () => {
    await insert({ goalsAgainst: null, goalsFor: null, status: 'postponed' })

    expect(await keep({ home: false })).toEqual(['result'])
    expect(await changes()).toMatchObject([{ newValue: 'uitgesteld (uit)', oldValue: 'uitgesteld (thuis)' }])
  })

  it('has a part for every column that is compared', async () => {
    await insert({ competition: 'KNVB Beker' })

    const match = await stored()
    const claim = {
      afterNinetyAgainst: 9,
      afterNinetyFor: 9,
      attendance: 9,
      dateText: 'y',
      extraTime: true,
      goalsAgainst: 9,
      goalsFor: 9,
      home: false,
      kickoffAt: new Date('2001-09-03T12:00:00Z'),
      matchDate: '2001-09-02',
      note: 'y',
      penaltiesAgainst: 9,
      penaltiesFor: 9,
      referee: 'y',
      stadium: 'y',
      status: 'postponed',
    } as const
    const filled = { ...match, ...claim, goalsFor: 1, status: 'played' as const }

    for (const { field } of compareClaim(filled, { ...claim, goalsFor: 9 }).differences) {
      expect(partOfField(field), field).toBeDefined()
    }
    for (const field of Object.keys(claim)) {
      expect(partOfField(field), field).toBeDefined()
    }
  })

  it('brings a difference back that was taken over, when the match has its old value again', async () => {
    await insert()
    await keep({ goalsFor: 3 })

    const [change] = await changes()

    await decide(change!.id, 'take-over')
    // Something put the old result back.
    await database.pool.query('UPDATE matches SET goals_for = 2')

    expect(await keep({ goalsFor: 3 }, later)).toEqual(['result'])
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
    ).toBe('Aftrap: in de database: 1 september 2001; de sc Heerenveen Fansite: 2 september 2001')
  })
})
