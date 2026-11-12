import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import {
  adminUsers,
  auditLog,
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchReports,
  type NewMatch,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitLiveEvent, submitRemoveLiveEvent } from './actions'

const { jar, revalidatePath } = vi.hoisted(() => ({ jar: new Map<string, string>(), revalidatePath: vi.fn() }))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('#src/database', () => ({ getDatabase: () => database }))

let database: TestDatabase
let matchId: number
let scorer: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const played: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 0,
  home: true,
  kickoffAt: new Date('2026-10-31T17:45:00Z'),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season: '2026/27',
  status: 'played',
}

beforeEach(async () => {
  jar.clear()
  revalidatePath.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')

  const userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  jar.set(sessionCookieName, await startSession(database.db, userId))

  const [values] = await withClubs(database.db, [played])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  matchId = inserted?.id ?? 0
  await database.db.insert(matchReports).values({ matchId, opponentComplete: false, status: 'bezig' })

  const [added] = await database.db
    .insert(matchAppearances)
    .values({ captain: false, matchId, name: 'Speler 9', ours: true, shirtNumber: 9, starter: true })
    .$returningId()

  scorer = added?.id ?? 0
})

const form = (fields: Record<string, string>) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  return formData
}

describe('submitLiveEvent', () => {
  it('stores the event and says what was added, so the form is empty again', async () => {
    const state = await submitLiveEvent(
      matchId,
      'doelpunt',
      { version: 3 },
      form({ kant: 'wij', minuut: '23', speler: String(scorer) }),
    )

    expect(state).toEqual({ saved: 'Doelpunt opgeslagen: 23e minuut, Speler 9', version: 4 })
    expect(await database.db.select().from(matchGoals)).toHaveLength(1)
    expect(revalidatePath).toHaveBeenCalledWith(`/beheer/wedstrijden/${matchId}/verslag/live`)
  })

  it('stores a second yellow card of a player as a yellow-red card and says so', async () => {
    const card = (soort: string) => form({ kant: 'wij', minuut: '30', soort, speler: String(scorer) })
    const first = await submitLiveEvent(matchId, 'kaart', { version: 0 }, card('geel'))

    expect(first.saved).toBe('Kaart opgeslagen: 30e minuut, Speler 9')

    const second = await submitLiveEvent(matchId, 'kaart', { version: 1 }, card('geel'))

    expect(second.saved).toBe('Geel-rode kaart opgeslagen: 30e minuut, Speler 9')
    expect((await database.db.select().from(matchCards)).map((stored) => stored.kind)).toEqual(['geel', 'geel-rood'])
  })

  it('does not take geel-rood as a choice from the form, only yellow or red', async () => {
    const state = await submitLiveEvent(
      matchId,
      'kaart',
      { version: 0 },
      form({ kant: 'wij', minuut: '30', soort: 'geel-rood', speler: String(scorer) }),
    )

    expect(state.errors?.['live-kaart-soort']).toBe('Kies geel of rood.')
    expect(await database.db.select().from(matchCards)).toEqual([])
  })

  it('gives a goal that can not be stored back with the errors and what was typed', async () => {
    const state = await submitLiveEvent(matchId, 'doelpunt', { version: 0 }, form({ kant: 'wij', minuut: 'abc' }))

    expect(state).toMatchObject({ values: { kant: 'wij', minuut: 'abc' }, version: 1 })
    expect(Object.keys(state.errors ?? {})).toContain('live-doelpunt-minuut')
    expect(await database.db.select().from(matchGoals)).toEqual([])
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('says a match without a report needs its line-up first', async () => {
    await database.db.delete(matchReports)

    expect(await submitLiveEvent(matchId, 'kaart', { version: 0 }, form({ kant: 'wij' }))).toMatchObject({
      errors: { 'live-kaart-kant': expect.stringContaining('opstelling') as string },
    })
  })

  it('ends on the list for a match that is gone, and refuses a call without a session or a wrong kind', async () => {
    await expect(submitLiveEvent(999_999, 'doelpunt', { version: 0 }, form({}))).rejects.toMatchObject({
      url: '/beheer/wedstrijden?fout=weg',
    })
    await expect(submitLiveEvent(matchId, 'strafschop' as 'doelpunt', { version: 0 }, form({}))).rejects.toMatchObject({
      url: '/beheer/wedstrijden?fout=weg',
    })

    jar.clear()
    await expect(submitLiveEvent(matchId, 'doelpunt', { version: 0 }, form({}))).rejects.toThrow()
    expect(await database.db.select().from(auditLog).orderBy(asc(auditLog.id))).toEqual([])
  })
})

describe('submitRemoveLiveEvent', () => {
  it('takes the event away and says what went, and says so when it was gone already', async () => {
    await submitLiveEvent(
      matchId,
      'doelpunt',
      { version: 0 },
      form({ kant: 'wij', minuut: '23', speler: String(scorer) }),
    )

    const [goal] = await database.db.select().from(matchGoals)

    expect(await submitRemoveLiveEvent(matchId, 'doelpunt', goal!.id)).toEqual({
      removed: "Doelpunt 23' Speler 9 weggehaald",
    })
    expect(await database.db.select().from(matchGoals)).toEqual([])
    expect(await submitRemoveLiveEvent(matchId, 'doelpunt', goal!.id)).toMatchObject({
      error: expect.any(String) as string,
    })
  })

  it('ends on the list for a number that is not a match', async () => {
    await expect(submitRemoveLiveEvent(Number.NaN, 'doelpunt', 1)).rejects.toMatchObject({
      url: '/beheer/wedstrijden?fout=weg',
    })
  })
})
