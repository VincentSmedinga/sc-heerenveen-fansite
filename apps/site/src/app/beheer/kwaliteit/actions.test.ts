import type { TestDatabase } from '@fansite/db/test-database'

import {
  adminUsers,
  auditLog,
  playerFieldDifferences,
  players,
  playerSeasonStats,
  playerStatDifferences,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitFieldDifference, submitStatDifference } from './actions'

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))

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
let userId: number
let authorId: number
let differenceId: number
let playerId: number

const page = '/beheer/kwaliteit/2026-27/spelerscijfers'

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  await createAccount(database.db, 'jelle@example.org', 'author', '')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  authorId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))

  const [player] = await database.db
    .insert(players)
    .values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season: '2026/27' })
    .$returningId()

  playerId = player?.id ?? 0
  await database.db
    .insert(playerSeasonStats)
    .values({ appearances: 5, assists: 0, competition: 'Eredivisie', goals: 1, playerId, season: '2026/27' })

  const [difference] = await database.db
    .insert(playerStatDifferences)
    .values({
      comparedWith: 'matches',
      competition: 'Eredivisie',
      firstSeenAt: new Date('2026-11-09T10:00:00Z'),
      lastSeenAt: new Date('2026-11-09T10:00:00Z'),
      otherGoals: 2,
      playerId,
      season: '2026/27',
      status: 'pending',
      tableGoals: 1,
    })
    .$returningId()

  differenceId = difference?.id ?? 0
})

async function decide(id: number | string, fields: Record<string, string>, season = '2026-27') {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  try {
    return await submitStatDifference(id as number, season, {}, formData)
  } catch (error) {
    if (error instanceof Redirect) {
      return { redirect: error.url }
    }

    throw error
  }
}

const stats = async () => (await database.db.select().from(playerSeasonStats))[0]
const differences = () => database.db.select().from(playerStatDifferences)

describe('deciding a difference in the numbers of a player', () => {
  it('takes the other number over, with the reason and the account in the log', async () => {
    expect(await decide(differenceId, { besluit: 'overnemen', reden: 'De wedstrijden kloppen' })).toEqual({
      redirect: `${page}?gedaan=overgenomen`,
    })
    expect(await stats()).toMatchObject({ goals: 2, tableGoals: 1 })
    expect(await differences()).toMatchObject([{ resolution: 'person', status: 'accepted' }])
    expect(await database.db.select().from(auditLog)).toMatchObject([
      { action: 'player.stats-take-over', itemId: playerId, reason: 'De wedstrijden kloppen', userId },
    ])
  })

  it('keeps the squad table', async () => {
    expect(await decide(differenceId, { besluit: 'houden', reden: 'Wikipedia klopt' })).toEqual({
      redirect: `${page}?gedaan=gehouden`,
    })
    expect(await stats()).toMatchObject({ goals: 1, tableGoals: null })
    expect(await differences()).toMatchObject([{ resolution: 'person', status: 'rejected' }])
  })

  it('decides without a reason, and writes none in the log', async () => {
    expect(await decide(differenceId, { besluit: 'houden', reden: ' ' })).toEqual({
      redirect: `${page}?gedaan=gehouden`,
    })
    expect(await database.db.select().from(auditLog)).toMatchObject([{ reason: null }])
  })

  it('asks for a choice and a reason of at most 300 characters, and changes nothing without them', async () => {
    expect(await decide(differenceId, { besluit: 'overnemen', reden: 'x'.repeat(301) })).toEqual({
      error: 'Schrijf hoogstens 300 tekens.',
    })
    expect(await decide(differenceId, { besluit: 'iets', reden: 'Daarom' })).toEqual({
      error: 'Kies of je het andere getal overneemt of de selectietabel houdt.',
    })
    expect(await differences()).toMatchObject([{ status: 'pending' }])
  })

  it('says so when the difference is decided already, has no row to change, or is no number', async () => {
    await decide(differenceId, { besluit: 'houden', reden: 'Wikipedia klopt' })

    expect(await decide(differenceId, { besluit: 'houden', reden: 'Nog eens' })).toEqual({
      redirect: `${page}?fout=besloten`,
    })
    expect(await decide('abc', { besluit: 'houden', reden: 'Daarom' })).toEqual({ redirect: `${page}?fout=besloten` })
    expect(await decide(differenceId, { besluit: 'houden', reden: 'Daarom' }, 'geen-seizoen')).toEqual({
      redirect: '/beheer/kwaliteit',
    })

    await database.db.update(playerStatDifferences).set({ decidedAt: null, resolution: null, status: 'pending' })
    await database.db.delete(playerSeasonStats)
    expect(await decide(differenceId, { besluit: 'overnemen', reden: 'Daarom' })).toEqual({
      redirect: `${page}?fout=geen-rij`,
    })
  })

  it('is for an editor only', async () => {
    jar.set(sessionCookieName, await startSession(database.db, authorId))

    await expect(decide(differenceId, { besluit: 'houden', reden: 'Daarom' })).rejects.toThrow()
    expect(await differences()).toMatchObject([{ status: 'pending' }])
  })
})

describe('deciding a difference between the editors and the import about a player', () => {
  const fieldPage = '/beheer/kwaliteit/2026-27/spelersgegevens'
  let fieldDifferenceId: number

  beforeEach(async () => {
    await database.db
      .update(players)
      .set({ editorsFields: ['shirt_number'], shirtNumber: 9 })
      .where(eq(players.id, playerId))

    const [difference] = await database.db
      .insert(playerFieldDifferences)
      .values({
        editorsValue: '9',
        field: 'shirt_number',
        firstSeenAt: new Date('2026-11-10T10:00:00Z'),
        importValue: '19',
        lastSeenAt: new Date('2026-11-10T10:00:00Z'),
        playerId,
        season: '2026/27',
        status: 'pending',
      })
      .$returningId()

    fieldDifferenceId = difference?.id ?? 0
  })

  async function decideField(id: number | string, fields: Record<string, string>, season = '2026-27') {
    const formData = new FormData()

    for (const [name, value] of Object.entries(fields)) {
      formData.set(name, value)
    }

    try {
      return await submitFieldDifference(id as number, season, {}, formData)
    } catch (error) {
      if (error instanceof Redirect) {
        return { redirect: error.url }
      }

      throw error
    }
  }

  const player = async () => (await database.db.select().from(players))[0]
  const fieldDifferences = () => database.db.select().from(playerFieldDifferences)

  it('takes the value of the import over, with the reason and the account in the log', async () => {
    expect(await decideField(fieldDifferenceId, { besluit: 'overnemen', reden: 'Wikipedia klopt' })).toEqual({
      redirect: `${fieldPage}?gedaan=overgenomen`,
    })
    expect(await player()).toMatchObject({ editorsFields: [], shirtNumber: 19 })
    expect(await fieldDifferences()).toMatchObject([{ resolution: 'person', status: 'accepted' }])
    expect(await database.db.select().from(auditLog)).toMatchObject([
      {
        action: 'player.field-take-over',
        detail: 'rugnummer 2026/27: redactie 9, import 19',
        itemId: playerId,
        reason: 'Wikipedia klopt',
        userId,
      },
    ])
  })

  it('keeps the value of the editors', async () => {
    expect(await decideField(fieldDifferenceId, { besluit: 'houden', reden: 'Hij speelt met 9' })).toEqual({
      redirect: `${fieldPage}?gedaan=gehouden`,
    })
    expect(await player()).toMatchObject({ editorsFields: ['shirt_number'], shirtNumber: 9 })
    expect(await fieldDifferences()).toMatchObject([{ resolution: 'person', status: 'rejected' }])
    expect(await database.db.select().from(auditLog)).toMatchObject([{ action: 'player.field-keep' }])
  })

  it('decides without a reason, and writes none in the log', async () => {
    expect(await decideField(fieldDifferenceId, { besluit: 'houden', reden: ' ' })).toEqual({
      redirect: `${fieldPage}?gedaan=gehouden`,
    })
    expect(await database.db.select().from(auditLog)).toMatchObject([{ reason: null }])
  })

  it('asks for a choice and a reason of at most 300 characters, and changes nothing without them', async () => {
    expect(await decideField(fieldDifferenceId, { besluit: 'iets', reden: 'Daarom' })).toEqual({
      error: 'Kies of je de import overneemt of de redactie houdt.',
    })
    expect(await fieldDifferences()).toMatchObject([{ status: 'pending' }])
    expect(await player()).toMatchObject({ shirtNumber: 9 })
  })

  it('says so when the difference is decided already, is no number, or the name is taken', async () => {
    await decideField(fieldDifferenceId, { besluit: 'houden', reden: 'Hij speelt met 9' })

    expect(await decideField(fieldDifferenceId, { besluit: 'houden', reden: 'Nog eens' })).toEqual({
      redirect: `${fieldPage}?fout=besloten`,
    })
    expect(await decideField('abc', { besluit: 'houden', reden: 'Daarom' })).toEqual({
      redirect: `${fieldPage}?fout=besloten`,
    })
    expect(await decideField(fieldDifferenceId, { besluit: 'houden', reden: 'Daarom' }, 'geen-seizoen')).toEqual({
      redirect: '/beheer/kwaliteit',
    })

    await database.db.insert(players).values({ name: 'Luuk Oyen', searchTerm: 'Oyen', season: '2026/27' })
    await database.db
      .update(playerFieldDifferences)
      .set({ decidedAt: null, field: 'name', importValue: 'Luuk Oyen', resolution: null, status: 'pending' })
    expect(await decideField(fieldDifferenceId, { besluit: 'overnemen', reden: 'Daarom' })).toEqual({
      redirect: `${fieldPage}?fout=bezet`,
    })
    expect(await fieldDifferences()).toMatchObject([{ status: 'pending' }])
  })

  it('is for an editor only', async () => {
    jar.set(sessionCookieName, await startSession(database.db, authorId))

    await expect(decideField(fieldDifferenceId, { besluit: 'houden', reden: 'Daarom' })).rejects.toThrow()
    expect(await fieldDifferences()).toMatchObject([{ status: 'pending' }])
  })
})
