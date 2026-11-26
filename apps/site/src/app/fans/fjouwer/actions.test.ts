import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, fantasyPicks, matches, players, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { emptyFjouwerState } from '#src/fans/fjouwer-form'

import { saveFjouwerAction } from './actions'

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
let ids: Record<string, number> = {}

const names = [
  ['Noppert', 'doelman'],
  ['Hilgers', 'verdediger'],
  ['Sauer', 'verdediger'],
  ['Van Beek', 'verdediger'],
  ['Proper', 'middenvelder'],
  ['Vente', 'aanvaller'],
] as const

const form = (players: readonly (number | string)[], id: number | undefined = matchId) => {
  const data = new FormData()

  data.set('wedstrijd', String(id))

  for (const player of players) {
    data.append('speler', String(player))
  }

  return data
}
const start = emptyFjouwerState([])

beforeAll(async () => {
  database = await createTestDatabase()
  holder.db = database.db
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_VIER', 'on')
  await database.db.delete(fantasyPicks)
  await database.db.delete(players)
  await database.db.delete(matches)
  await database.db.delete(clubs)
  await database.db.delete(supporters)
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.test', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })
  supporterId = (await database.db.select().from(supporters))[0]?.id ?? 0
  requireSupporter.mockResolvedValue({
    blocked: false,
    email: 'tjalle@example.test',
    screenName: 'Tjalle99',
    supporterId,
  })

  const [club] = await database.db.select().from(clubs)
  const kickoffAt = new Date(Date.now() + 30 * 60 * 60 * 1000)
  const [result] = await database.db.insert(matches).values({
    clubId: club?.id ?? 0,
    competition: 'Eredivisie',
    home: true,
    kickoffAt,
    matchDate: kickoffAt.toISOString().slice(0, 10),
    opponent: 'FC Twente',
    round: 'Speelronde 14',
    season: '2026/27',
    status: 'scheduled',
  })

  matchId = result.insertId
  await database.db
    .insert(players)
    .values(names.map(([name, position]) => ({ position, searchTerm: name, season: '2026/27', sourceName: name })))
  ids = Object.fromEntries((await database.db.select().from(players)).map((row) => [row.sourceName, row.id]))
})

afterEach(() => {
  vi.unstubAllEnvs()
  requireSupporter.mockReset()
})

const fourIds = () => ['Noppert', 'Hilgers', 'Proper', 'Vente'].map((name) => ids[name] as number)
const rows = async () => database.db.select().from(fantasyPicks)

describe('saveFjouwerAction', () => {
  it('answers "not found" and writes nothing while Fjouwer is off, or accounts are', async () => {
    vi.stubEnv('FANS_VIER', 'off')
    await expect(saveFjouwerAction(start, form(fourIds()))).rejects.toThrow('NEXT_NOT_FOUND')

    vi.stubEnv('FANS_VIER', 'on')
    vi.stubEnv('FANS_ACCOUNTS', 'off')
    await expect(saveFjouwerAction(start, form(fourIds()))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(await rows()).toHaveLength(0)
  })

  it('stores the four and says until when they can change', async () => {
    const state = await saveFjouwerAction(start, form(fourIds()))

    expect(state.saved?.until).toMatch(/\d\d\.\d\d$/)
    expect(state.errors).toEqual({ general: [], lines: {} })
    expect(state.values).toEqual(fourIds().map(String))
    expect(await rows()).toHaveLength(1)
  })

  it('shows the errors, with the ticked players, and writes nothing', async () => {
    const three = ['Hilgers', 'Sauer', 'Van Beek', 'Vente'].map((name) => ids[name] as number)
    const state = await saveFjouwerAction(start, form(three))

    expect(state.errors.lines.verdediger).toEqual(['Kies hoogstens 2 verdedigers.'])
    expect(state.values).toEqual(three.map(String))
    expect(state.saved).toBeUndefined()

    const five = await saveFjouwerAction(start, form([...fourIds(), ids['Sauer'] as number]))

    expect(five.errors.general).toEqual(['Kies 4 spelers. Je hebt er nu 5.'])
    expect(await rows()).toHaveLength(0)
  })

  it('ignores what is not an id, and refuses a match that is not the one of the card', async () => {
    const state = await saveFjouwerAction(start, form([...fourIds(), 'abc']))

    expect(state.saved).toBeDefined()
    expect(await saveFjouwerAction(start, form(fourIds(), matchId + 1))).toMatchObject({ failure: 'closed' })
  })
})
