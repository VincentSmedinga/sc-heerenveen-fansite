import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matches, predictions, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { savePredictionAction } from './actions'

const { holder, requireSupporter } = vi.hoisted(() => ({
  holder: { db: undefined as unknown },
  requireSupporter: vi.fn(),
}))

vi.mock('#src/database', () => ({
  getDatabase: () => {
    if (holder.db === undefined) {
      throw new Error('The database was used.')
    }

    return { db: holder.db }
  },
}))
vi.mock('#src/fans/require-supporter', () => ({ requireSupporter }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

let database: TestDatabase
let matchId: number
let supporterId: number

const form = (entries: Record<string, string>, matchId: number | undefined = undefined) => {
  const data = new FormData()

  if (matchId !== undefined) {
    data.set('wedstrijd', String(matchId))
  }

  for (const [name, value] of Object.entries(entries)) {
    data.set(name, value)
  }

  return data
}

const filled = { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' }
const empty = { errors: {}, values: {} }

beforeAll(async () => {
  database = await createTestDatabase()
  holder.db = database.db
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  await database.db.delete(predictions)
  await database.db.delete(matches)
  await database.db.delete(supporters)
  await database.db.delete(clubs)
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.test', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })

  const [club] = await database.db.select().from(clubs)
  const [supporter] = await database.db.select().from(supporters)
  const [match] = await database.db.insert(matches).values({
    clubId: club?.id ?? 0,
    competition: 'Eredivisie',
    home: true,
    kickoffAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    matchDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    opponent: 'FC Twente',
    round: 'Speelronde 14',
    season: '2026/27',
    status: 'scheduled',
  })

  matchId = match.insertId
  supporterId = supporter?.id ?? 0
  requireSupporter.mockResolvedValue({
    blocked: false,
    email: 'tjalle@example.test',
    screenName: 'Tjalle99',
    supporterId,
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  requireSupporter.mockReset()
})

describe('the action of the prediction', () => {
  it('answers "not found" while the game is off, before it asks for a session or reads anything', async () => {
    vi.stubEnv('FANS_PROGNOSE', 'off')
    requireSupporter.mockClear()

    await expect(savePredictionAction(empty, form(filled, matchId))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(requireSupporter).not.toHaveBeenCalled()
  })

  it('answers "not found" while accounts are off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(savePredictionAction(empty, form(filled, matchId))).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('asks for the session of a supporter, with this page to come back to', async () => {
    await savePredictionAction(empty, form(filled, matchId))

    expect(requireSupporter).toHaveBeenCalledWith({ from: '/fans/prognose' })
  })

  it('stores the prediction and says so', async () => {
    expect(await savePredictionAction(empty, form(filled, matchId))).toEqual({
      errors: {},
      saved: { changed: false },
      values: filled,
    })
    expect(await database.db.select().from(predictions)).toMatchObject([
      { fullTimeAway: 1, fullTimeHome: 2, halftimeAway: 0, halftimeHome: 1, matchId, supporterId },
    ])
  })

  it('says it changed an earlier prediction', async () => {
    await savePredictionAction(empty, form(filled, matchId))

    expect(await savePredictionAction(empty, form({ ...filled, fullTimeHome: '3' }, matchId))).toMatchObject({
      saved: { changed: true },
      values: { fullTimeHome: '3' },
    })
    expect(await database.db.select().from(predictions)).toHaveLength(1)
  })

  it('stores nothing and names the field for a number that is missing, and keeps the rest', async () => {
    const result = await savePredictionAction(empty, form({ ...filled, fullTimeAway: '' }, matchId))

    expect(result).toEqual({
      errors: { fullTimeAway: 'Vul de goals van FC Twente bij de eindstand in.' },
      values: { ...filled, fullTimeAway: '' },
    })
    expect(await database.db.select().from(predictions)).toEqual([])
  })

  it('stores nothing for a number above 9, and for a form without fields', async () => {
    expect(await savePredictionAction(empty, form({ ...filled, halftimeHome: '10' }, matchId))).toHaveProperty(
      'errors.halftimeHome',
    )
    expect(await savePredictionAction(empty, form({}, matchId))).toHaveProperty('errors.fullTimeHome')
    expect(await database.db.select().from(predictions)).toEqual([])
  })

  it('refuses a form without the number of a match', async () => {
    expect(await savePredictionAction(empty, form(filled))).toMatchObject({ failure: 'closed' })
  })

  it('refuses a match that is not the one to predict', async () => {
    expect(await savePredictionAction(empty, form(filled, matchId + 100))).toMatchObject({ failure: 'closed' })
    expect(await database.db.select().from(predictions)).toEqual([])
  })

  it('refuses after the kick-off', async () => {
    await database.db.update(matches).set({ kickoffAt: new Date(Date.now() - 60 * 1000) })

    expect(await savePredictionAction(empty, form(filled, matchId))).toMatchObject({ failure: 'closed' })
    expect(await database.db.select().from(predictions)).toEqual([])
  })
})
