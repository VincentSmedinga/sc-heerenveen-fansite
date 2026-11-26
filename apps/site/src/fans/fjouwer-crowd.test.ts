import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, fantasyPicks, matches, players, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { loadFjouwerCrowd } from './fjouwer-crowd'

let database: TestDatabase
let clubId: number
let ids: Record<string, number> = {}
let rounds = 0
let people = 0

beforeAll(async () => {
  database = await createTestDatabase()
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  clubId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente')))[0]?.id ?? 0
})

afterAll(async () => {
  await database?.drop()
})

const names = ['Noppert', 'Wolters', 'Hilgers', 'Van Beek', 'Sauer', 'Proper', 'Smans', 'Vente', 'Trenskow']

beforeEach(async () => {
  await database.db.delete(fantasyPicks)
  await database.db.delete(players)
  await database.db.delete(matches)
  await database.db.delete(supporters)
  rounds = 0
  people = 0
  await database.db.insert(players).values(
    names.map((name) => ({
      position: 'middenvelder' as const,
      searchTerm: name,
      season: '2026/27',
      sourceName: name,
    })),
  )
  ids = Object.fromEntries((await database.db.select().from(players)).map((row) => [row.sourceName, row.id]))
})

// Matches in the order they close: one a week from 1 November 2026.
async function addMatch(): Promise<number> {
  rounds += 1

  const day = String(rounds + 7).padStart(2, '0')
  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    goalsAgainst: 0,
    goalsFor: 1,
    home: true,
    kickoffAt: new Date(`2026-11-${day}T19:00:00Z`),
    matchDate: `2026-11-${day}`,
    opponent: 'FC Twente',
    round: `Speelronde ${rounds}`,
    season: '2026/27',
    status: 'played',
  })

  return result.insertId
}

/** A new supporter who chose the four for the match. */
async function choose(matchId: number, four: readonly string[], extra: Partial<typeof supporters.$inferInsert> = {}) {
  people += 1

  const [supporter] = await database.db
    .insert(supporters)
    .values({ email: `fan${people}@example.test`, screenName: `Fan${people}`, screenNameKey: `fan${people}`, ...extra })

  await pick(matchId, supporter.insertId, four)

  return supporter.insertId
}

async function pick(matchId: number, supporterId: null | number, four: readonly string[]) {
  const [one, two, three, fourth] = four.map((name) => ids[name] as number) as [number, number, number, number]

  await database.db
    .insert(fantasyPicks)
    .values({ matchId, player1Id: one, player2Id: two, player3Id: three, player4Id: fourth, supporterId })
}

const crowd = async (matchId: number) => loadFjouwerCrowd(database.db, matchId)

describe('the figures of Fjouwer for a match', () => {
  it('has no figures for a match without a four, such as one from before the game', async () => {
    const before = await addMatch()

    expect(await crowd(before)).toBeUndefined()
  })

  it('counts each supporter once and gives the share of each player, the most chosen first', async () => {
    const match = await addMatch()

    for (const four of [
      ['Vente', 'Noppert', 'Proper', 'Hilgers'],
      ['Vente', 'Noppert', 'Proper', 'Sauer'],
      ['Vente', 'Noppert', 'Smans', 'Sauer'],
      ['Vente', 'Wolters', 'Smans', 'Sauer'],
      ['Trenskow', 'Wolters', 'Smans', 'Sauer'],
    ]) {
      await choose(match, four)
    }

    expect(await crowd(match)).toEqual({
      count: 5,
      players: [
        { name: 'Sauer', percentage: 80 },
        { name: 'Vente', percentage: 80 },
        { name: 'Noppert', percentage: 60 },
        { name: 'Smans', percentage: 60 },
        { name: 'Proper', percentage: 40 },
        { name: 'Wolters', percentage: 40 },
      ],
    })
  })

  it('goes on past five players when the fifth place is shared', async () => {
    const match = await addMatch()

    for (const four of [
      ['Vente', 'Noppert', 'Proper', 'Hilgers'],
      ['Vente', 'Noppert', 'Proper', 'Hilgers'],
      ['Vente', 'Noppert', 'Proper', 'Sauer'],
      ['Vente', 'Noppert', 'Smans', 'Sauer'],
      ['Wolters', 'Trenskow', 'Smans', 'Van Beek'],
    ]) {
      await choose(match, four)
    }

    const found = (await crowd(match))?.players?.map((player) => player.name)

    // Noppert 4, Vente 4, Proper 3; Hilgers, Sauer and Smans have 2 and share the fourth place.
    expect(found).toEqual(['Noppert', 'Vente', 'Proper', 'Hilgers', 'Sauer', 'Smans'])
  })

  it('gives only the count under five supporters', async () => {
    const match = await addMatch()

    for (let index = 0; index < 4; index += 1) {
      await choose(match, ['Vente', 'Noppert', 'Proper', 'Hilgers'])
    }

    expect(await crowd(match)).toEqual({ count: 4 })
  })

  it('counts a four that was inherited from the match before, and not a later one', async () => {
    const first = await addMatch()
    const second = await addMatch()
    const third = await addMatch()
    const kept = await choose(first, ['Vente', 'Noppert', 'Proper', 'Hilgers'])

    for (let index = 0; index < 3; index += 1) {
      await choose(first, ['Vente', 'Noppert', 'Proper', 'Hilgers'])
    }

    await choose(second, ['Wolters', 'Trenskow', 'Smans', 'Van Beek'])
    // A change for the third match comes after the second, so it does not count for it.
    await pick(third, kept, ['Sauer', 'Smans', 'Trenskow', 'Wolters'])

    const found = await crowd(second)

    expect(found?.count).toBe(5)
    expect(found?.players?.find((player) => player.name === 'Vente')?.percentage).toBe(80)
    expect(found?.players?.find((player) => player.name === 'Wolters')?.percentage).toBe(20)
  })

  it('leaves out a blocked account, and counts one that was closed', async () => {
    const match = await addMatch()

    for (let index = 0; index < 4; index += 1) {
      await choose(match, ['Vente', 'Noppert', 'Proper', 'Hilgers'])
    }

    await choose(match, ['Wolters', 'Trenskow', 'Smans', 'Van Beek'], { disabledAt: new Date('2026-11-01T00:00:00Z') })

    expect(await crowd(match)).toEqual({ count: 4 })

    await pick(match, null, ['Vente', 'Noppert', 'Proper', 'Hilgers'])

    expect((await crowd(match))?.count).toBe(5)
  })

  it('does not count a player of an inherited four who has used up his ten', async () => {
    const matchIds: number[] = []

    for (let index = 0; index < 11; index += 1) {
      matchIds.push(await addMatch())
    }

    const last = matchIds.at(-1) as number

    // Ten matches in a row with the same four, then a match without a new choice: none of the
    // four counts any more.
    const supporterId = await choose(matchIds[0] as number, ['Vente', 'Noppert', 'Proper', 'Hilgers'])

    for (let index = 0; index < 4; index += 1) {
      await choose(last, ['Wolters', 'Trenskow', 'Smans', 'Van Beek'])
    }

    expect(supporterId).toBeGreaterThan(0)

    const found = await crowd(last)

    expect(found?.count).toBe(5)
    expect(found?.players?.map((player) => player.name)).not.toContain('Vente')
    expect(found?.players?.map((player) => player.name)).not.toContain('Noppert')
    expect(found?.players?.map((player) => player.name)).toContain('Wolters')
  })

  it('gives a player with a surname that another one has the whole name', async () => {
    const match = await addMatch()
    const [other] = await database.db.insert(players).values({
      position: 'aanvaller',
      searchTerm: 'Joost Vente',
      season: '2026/27',
      sourceName: 'Joost Vente',
    })

    ids['Joost Vente'] = other.insertId

    for (let index = 0; index < 5; index += 1) {
      await choose(match, ['Vente', 'Joost Vente', 'Noppert', 'Proper'])
    }

    const found = (await crowd(match))?.players?.map((player) => player.name) ?? []

    expect(found).toContain('Joost Vente')
    expect(new Set(found).size).toBe(found.length)
  })
})
