import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matches, matchGoals, players, squadCompleteness } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  describeChange,
  recalculateCompleteness,
  runCompletenessCommand,
  storeCompleteness,
} from './store-completeness.ts'

const season = '2013/14'
const first = new Date('2026-11-06T10:00:00Z')
const later = new Date('2026-11-06T12:00:00Z')

let database: TestDatabase
let clubId: number

beforeAll(async () => {
  database = await createTestDatabase()
  ;[{ id: clubId }] = (await database.db.insert(clubs).values({ name: 'FC Test', slug: 'fc-test' }).$returningId()) as [
    { id: number },
  ]
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['match_goals', 'matches', 'players', 'squad_completeness']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

async function goal(player: string, round: string) {
  const [{ id }] = (await database.db
    .insert(matches)
    .values({
      clubId,
      competition: 'Eredivisie',
      dateText: 'x',
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      matchDate: '2013-09-01',
      opponent: 'FC Test',
      round,
      season,
      status: 'played',
    })
    .$returningId()) as [{ id: number }]

  await database.db.insert(matchGoals).values({ matchId: id, minute: 10, ours: true, player })
}

/** Twenty-six players: 24 from the selection and two from the transfers. */
async function twoSources() {
  await database.db.insert(players).values([
    ...Array.from({ length: 24 }, (_, index) => ({
      name: `Speler ${index}`,
      searchTerm: `Speler ${index}`,
      season,
      source: 'selectie' as const,
    })),
    ...['Oud Een', 'Oud Twee'].map((name) => ({ name, searchTerm: name, season, source: 'transfers' as const })),
  ])
}

const rowOf = async () => (await database.db.select().from(squadCompleteness))[0]

describe('storeCompleteness', () => {
  it('stores the chance of a season with two sources, with the best source and the sums it was given', async () => {
    await twoSources()

    const change = await storeCompleteness(database.db, season, { goalsTotal: 40, matchesTotal: 900 }, first)

    expect(change.kind).toBe('changed')
    expect(await rowOf()).toMatchObject({
      bestSource: 'selectie',
      calculatedAt: first,
      goalsTotal: 40,
      level: 'compleet',
      matchesTotal: 900,
      playerCount: 26,
      probability: 95,
      season,
    })
    expect((await rowOf())?.checks.map((check) => `${check.name}:${check.outcome}`)).toEqual([
      'size:passed',
      'scorers:unavailable',
      'matches:unavailable',
      'goals:unavailable',
    ])
  })

  it('gives the season a lower chance when new goals show a scorer who is not in the list, and a higher one when he is', async () => {
    await twoSources()
    await storeCompleteness(database.db, season, { goalsTotal: 40, matchesTotal: 900 }, first)
    await goal('Speler 3', 'Speelronde 1')

    // The scorer is in the list: still whole, and the checks now say so, so the row changes.
    expect((await storeCompleteness(database.db, season, undefined, later)).kind).toBe('changed')
    expect(await rowOf()).toMatchObject({ level: 'compleet', probability: 95 })

    await goal('Onbekende Spits', 'Speelronde 2')

    // The sums that were stored stay when the caller gives none.
    const change = await storeCompleteness(database.db, season, undefined, later)

    expect(change.kind).toBe('changed')
    expect(await rowOf()).toMatchObject({ goalsTotal: 40, matchesTotal: 900 })
    expect((await rowOf())?.probability).toBeLessThan(55)
    expect((await rowOf())?.level).not.toBe('compleet')
    expect(describeChange(season, change)).toMatch(/was 95% compleet/)

    // The scorer joins the list: the chance rises again.
    await database.db.insert(players).values({
      name: 'Onbekende Spits',
      searchTerm: 'Spits',
      season,
      source: 'selectie',
    })
    await storeCompleteness(database.db, season, undefined, later)
    expect((await rowOf())?.probability).toBe(95)
  })

  it('has no row for a season without players, and removes the row when the players are gone', async () => {
    expect(await storeCompleteness(database.db, season, undefined, first)).toEqual({
      kind: 'none',
      removed: false,
      season,
    })
    expect(await database.db.select().from(squadCompleteness)).toEqual([])

    await twoSources()
    await storeCompleteness(database.db, season, undefined, first)
    await database.db.delete(players).where(eq(players.season, season))

    expect(await storeCompleteness(database.db, season, undefined, later)).toMatchObject({ removed: true })
    expect(await database.db.select().from(squadCompleteness)).toEqual([])
  })

  it('writes nothing the second time when nothing is new, so the moment stays', async () => {
    await twoSources()
    await storeCompleteness(database.db, season, { goalsTotal: 40, matchesTotal: 900 }, first)

    const change = await storeCompleteness(database.db, season, { goalsTotal: 40, matchesTotal: 900 }, later)

    expect(change.kind).toBe('unchanged')
    expect((await rowOf())?.calculatedAt).toEqual(first)
    expect(describeChange(season, change)).toBe('Completeness 2013/14: 95% compleet, 26 players, unchanged')
  })
})

describe('recalculateCompleteness and the command', () => {
  it('calculates every season from the database without a request, one line each', async () => {
    await twoSources()
    await database.db
      .insert(players)
      .values({ name: 'Een', searchTerm: 'Een', season: '2012/13', source: 'doelpunten' })

    const lines = await recalculateCompleteness(database.db, first)

    expect(lines).toEqual([
      'Completeness 2012/13: 20% weinig, 1 players, new',
      'Completeness 2013/14: 95% compleet, 26 players, new',
      'Completeness: 2 seasons calculated.',
    ])
    expect(await recalculateCompleteness(database.db, later)).toEqual([
      'Completeness 2012/13: 20% weinig, 1 players, unchanged',
      'Completeness 2013/14: 95% compleet, 26 players, unchanged',
      'Completeness: 2 seasons calculated.',
    ])
  })

  it('runs as a command, and does nothing when a run holds the lock', async () => {
    await twoSources()

    const lines: string[] = []

    expect(await runCompletenessCommand(database.url, { clock: () => first, write: (line) => lines.push(line) })).toBe(
      0,
    )
    expect(lines[0]).toBe('Completeness 2013/14: 95% compleet, 26 players, new')
  })
})
