import type { TestDatabase } from '@fansite/db/test-database'

import {
  clubs,
  coachRatings,
  matchAppearances,
  matches,
  matchReports,
  playerRatings,
  players,
  staff,
  supporters,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ratingData } from '#src/fans/rating-data'

import { saveRatingsAction } from './actions'

const { holder, requireSupporter } = vi.hoisted(() => ({
  holder: { db: undefined as unknown },
  requireSupporter: vi.fn(),
}))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

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
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))

const day = 24 * 60 * 60 * 1000
const empty = { errors: {}, values: {} }

let database: TestDatabase
let matchId: number
let supporterId: number
let appearances: number[]

const form = (grades: Record<number, string>, number: null | number = matchId) => {
  const data = new FormData()

  if (number !== null) {
    data.set('wedstrijd', String(number))
  }

  for (const [appearance, grade] of Object.entries(grades)) {
    data.set(`cijfer-${appearance}`, grade)
  }

  return data
}

const all = (grade: string) => Object.fromEntries(appearances.map((appearance) => [appearance, grade]))

beforeAll(async () => {
  database = await createTestDatabase()
  holder.db = database.db
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_UITBLINKER', 'on')
  await database.db.delete(playerRatings)
  await database.db.delete(coachRatings)
  await database.db.delete(staff)
  await database.db.delete(matches)
  await database.db.delete(players)
  await database.db.delete(supporters)
  await database.db.delete(clubs)
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })

  const [club] = await database.db.select().from(clubs)
  const kickoffAt = new Date(Date.now() - day)
  const next = new Date(Date.now() + 6 * day)
  const [played] = await database.db
    .insert(matches)
    .values({
      clubId: club?.id ?? 0,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      kickoffAt,
      matchDate: kickoffAt.toISOString().slice(0, 10),
      opponent: 'FC Twente',
      round: 'Speelronde 14',
      season: '2026/27',
      status: 'played',
    })
    .$returningId()

  await database.db.insert(matches).values({
    clubId: club?.id ?? 0,
    competition: 'Eredivisie',
    home: false,
    kickoffAt: next,
    matchDate: next.toISOString().slice(0, 10),
    opponent: 'FC Twente',
    round: 'Speelronde 15',
    season: '2026/27',
    status: 'scheduled',
  })
  matchId = played?.id ?? 0
  await database.db.insert(matchReports).values({ matchId, status: 'klaar' })
  appearances = []

  for (const [index, name] of ['Anne Spits', 'Bas Keeper', 'Cor Back'].entries()) {
    const [player] = await database.db
      .insert(players)
      .values({ name, searchTerm: name, season: '2026/27', source: 'selectie' })
      .$returningId()
    const [added] = await database.db
      .insert(matchAppearances)
      .values({ matchId, name, ours: true, playerId: player?.id ?? 0, shirtNumber: index + 1, starter: true })
      .$returningId()

    appearances.push(added?.id ?? 0)
  }

  const [supporter] = await database.db
    .insert(supporters)
    .values({
      createdAt: new Date(Date.now() - 30 * day),
      email: 'tjalle@example.test',
      screenName: 'Tjalle99',
      screenNameKey: 'tjalle99',
    })
    .$returningId()

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

describe('the action of the grades', () => {
  it('answers "not found" while the game is off, before it asks for a session', async () => {
    vi.stubEnv('FANS_UITBLINKER', 'off')
    requireSupporter.mockClear()

    await expect(saveRatingsAction(empty, form(all('7')))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(requireSupporter).not.toHaveBeenCalled()
  })

  it('answers "not found" while accounts are off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(saveRatingsAction(empty, form(all('7')))).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('does nothing while the game is off, also when the form is sent', async () => {
    vi.stubEnv('FANS_UITBLINKER', 'off')
    await expect(saveRatingsAction(empty, form(all('7')))).rejects.toThrow('NEXT_NOT_FOUND')

    expect(await database.db.select().from(playerRatings)).toEqual([])
  })

  it('asks for the session of a supporter, with this page to come back to', async () => {
    await saveRatingsAction(empty, form({})).catch(() => undefined)

    expect(requireSupporter).toHaveBeenCalledWith({ from: '/fans/uitblinker' })
  })

  it('stores a grade for every player, and goes to the page that shows them', async () => {
    await expect(saveRatingsAction(empty, form(all('8')))).rejects.toMatchObject({
      url: '/fans/uitblinker?opgeslagen=1',
    })
    expect(await database.db.select().from(playerRatings)).toHaveLength(3)
  })

  it('shows the grades with the page of what we keep of a supporter', async () => {
    expect(await ratingData(database.db, supporterId)).toBeUndefined()

    await saveRatingsAction(empty, form({ ...all('8'), [appearances[0] ?? 0]: '3' })).catch(() => undefined)

    const data = await ratingData(database.db, supporterId)

    expect(data?.summary).toBe('3 cijfers voor 1 wedstrijd')
    expect(data?.columns).toEqual(['Wedstrijd', 'Speler', 'Cijfer'])
    expect(data?.rows.map((row) => row.cells)).toEqual([
      ['Anne Spits', '3'],
      ['Bas Keeper', '8'],
      ['Cor Back', '8'],
    ])
    expect(data?.rows[0]?.header).toMatch(/^sc Heerenveen – FC Twente, \d+ \w+ 20\d\d$/)
  })

  it('replaces the grades when they are changed', async () => {
    await saveRatingsAction(empty, form(all('8'))).catch(() => undefined)
    await saveRatingsAction(empty, form({ ...all('8'), [appearances[0] ?? 0]: '2' })).catch(() => undefined)

    const rows = await database.db.select().from(playerRatings)

    expect(rows).toHaveLength(3)
    expect(rows.find((row) => row.appearanceId === appearances[0])?.grade).toBe(2)
  })

  it('stores nothing for a gap, names the player, and keeps the grades that were chosen', async () => {
    const [first, second, third] = appearances

    const result = await saveRatingsAction(empty, form({ [first ?? 0]: '6', [third ?? 0]: '9' }))

    expect(result).toEqual({
      errors: { [second ?? 0]: 'Geef Bas Keeper een cijfer.' },
      values: { [first ?? 0]: '6', [third ?? 0]: '9' },
    })
    expect(await database.db.select().from(playerRatings)).toEqual([])
  })

  it('stores nothing for a grade of 0 or 11', async () => {
    expect(await saveRatingsAction(empty, form({ ...all('5'), [appearances[0] ?? 0]: '11' }))).toHaveProperty('errors')
    expect(await saveRatingsAction(empty, form({ ...all('5'), [appearances[1] ?? 0]: '0' }))).toHaveProperty('errors')
    expect(await database.db.select().from(playerRatings)).toEqual([])
  })

  it('refuses a form without the number of a match, and another match', async () => {
    expect(await saveRatingsAction(empty, form(all('7'), null))).toMatchObject({
      failure: 'closed',
      values: all('7'),
    })
    expect(await saveRatingsAction(empty, form(all('7'), matchId + 100))).toMatchObject({ failure: 'closed' })
    expect(await database.db.select().from(playerRatings)).toEqual([])
  })

  it('refuses when the next match has begun', async () => {
    // The next match is the one that is still scheduled.
    await database.db
      .update(matches)
      .set({ kickoffAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(matches.status, 'scheduled'))

    expect(await saveRatingsAction(empty, form(all('7')))).toMatchObject({ failure: 'closed' })
    expect(await database.db.select().from(playerRatings)).toEqual([])
  })

  it('refuses an account that was made after the match began', async () => {
    await database.db.update(supporters).set({ createdAt: new Date() })

    expect(await saveRatingsAction(empty, form(all('7')))).toMatchObject({ failure: 'late' })
    expect(await database.db.select().from(playerRatings)).toEqual([])
  })

  it('refuses while the report is not finished', async () => {
    await database.db.update(matchReports).set({ status: 'bezig' })

    expect(await saveRatingsAction(empty, form(all('7')))).toMatchObject({ failure: 'closed' })
  })

  describe('with a head coach', () => {
    const withCoach = (grades: Record<number, string>, coach?: string) => {
      const data = form(grades)

      if (coach !== undefined) {
        data.set('cijfer-trainer', coach)
      }

      return data
    }

    beforeEach(async () => {
      await database.db
        .insert(staff)
        .values({ name: 'Robin Veldman', role: 'coach', startDate: '2020-01-01', startPrecision: 'day' })
    })

    it('stores the grade of the coach with those of the players, and replaces it', async () => {
      await saveRatingsAction(empty, withCoach(all('8'), '6')).catch(() => undefined)
      await saveRatingsAction(empty, withCoach(all('8'), '9')).catch(() => undefined)

      expect(await database.db.select().from(playerRatings)).toHaveLength(3)
      expect(await database.db.select().from(coachRatings)).toMatchObject([{ grade: 9, matchId }])
    })

    it('stores nothing without a grade for the coach, names him, and keeps the other grades', async () => {
      const result = await saveRatingsAction(empty, withCoach(all('8')))

      expect(result).toEqual({
        coachError: 'Geef Robin Veldman een cijfer.',
        errors: {},
        values: all('8'),
      })
      expect(await database.db.select().from(playerRatings)).toEqual([])
      expect(await database.db.select().from(coachRatings)).toEqual([])
    })

    it('stores nothing for a grade of 0 or 11 for the coach', async () => {
      expect(await saveRatingsAction(empty, withCoach(all('8'), '11'))).toHaveProperty('coachError')
      expect(await saveRatingsAction(empty, withCoach(all('8'), '0'))).toHaveProperty('coachError')
      expect(await database.db.select().from(coachRatings)).toEqual([])
    })

    it('keeps the grade of the coach in the form when the grades of the players have a gap or the window is closed', async () => {
      const [first] = appearances

      expect(await saveRatingsAction(empty, withCoach({ [first ?? 0]: '6' }, '7'))).toMatchObject({
        coachValue: '7',
        errors: expect.any(Object) as unknown,
      })
      const other = withCoach(all('7'), '5')

      other.set('wedstrijd', String(matchId + 100))

      expect(await saveRatingsAction(empty, other)).toMatchObject({ coachValue: '5', failure: 'closed' })
    })

    it('shows the grade in the table of what is kept of a supporter, after the players', async () => {
      await saveRatingsAction(empty, withCoach(all('8'), '6')).catch(() => undefined)

      const data = await ratingData(database.db, supporterId)

      expect(data?.summary).toBe('4 cijfers voor 1 wedstrijd')
      expect(data?.rows.at(-1)?.cells).toEqual(['Robin Veldman (trainer)', '6'])
    })
  })
})
