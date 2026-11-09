import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { compareClaim, differenceLine, findMatchByDate } from './match-lookup.ts'
import { matches } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
})

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '2001-09-01',
  opponent: 'Testdorp FC',
  round: 'Wedstrijd 1',
  season: '2001/02',
  status: 'played',
}

async function insert(values: Partial<NewMatch>) {
  const [row] = await withClubs(database.db, [{ ...base, ...values }])

  await database.db.insert(matches).values(row!)

  return row!
}

const lookup = async (clubId: number, date: string, competition: NewMatch['competition'] = 'Eredivisie') =>
  findMatchByDate(database.db, { clubId, competition, date, season: '2001/02' })

describe('findMatchByDate', () => {
  it('finds the same match from another source under another round', async () => {
    const row = await insert({})

    expect(await lookup(row.clubId, '2001-09-01')).toMatchObject({
      kind: 'found',
      match: { dataSource: 'oude-fansite', round: 'Wedstrijd 1' },
    })
  })

  it('finds a match that was postponed by a day, and not one that moved further', async () => {
    const row = await insert({ matchDate: '2001-09-02' })

    expect(await lookup(row.clubId, '2001-09-01')).toMatchObject({ kind: 'found' })
    expect(await lookup(row.clubId, '2001-09-04')).toEqual({ kind: 'none' })
  })

  it('finds nothing in another competition or season, or against another club', async () => {
    const row = await insert({})
    const other = await insert({ opponent: 'Andere Club', round: 'Wedstrijd 2' })

    expect(await lookup(row.clubId, '2001-09-01', 'KNVB Beker')).toEqual({ kind: 'none' })
    expect(
      await findMatchByDate(database.db, {
        ...{ clubId: row.clubId, competition: 'Eredivisie', date: '2001-09-01' },
        season: '2002/03',
      }),
    ).toEqual({ kind: 'none' })
    expect(await lookup(other.clubId, '2001-09-01')).toMatchObject({ kind: 'found', match: { round: 'Wedstrijd 2' } })
  })

  it('returns nothing for two matches against the same club within a day', async () => {
    const row = await insert({})

    await insert({ matchDate: '2001-09-02', round: 'Wedstrijd 2' })

    expect(await lookup(row.clubId, '2001-09-01')).toMatchObject({ kind: 'ambiguous', matches: [{}, {}] })
  })
})

describe('compareClaim', () => {
  it('fills only the empty fields and names the fields that differ', async () => {
    const row = await insert({ referee: null, stadium: 'Abe Lenstra' })
    const [stored] = await database.db.select().from(matches)
    const { differences, fill } = compareClaim(stored!, { goalsFor: 3, referee: 'Piet Fluit', stadium: 'Elders' })

    expect(row.clubId).toBeGreaterThan(0)
    expect(fill).toEqual({ referee: 'Piet Fluit' })
    expect(differences.map((difference) => difference.field).sort()).toEqual(['goalsFor', 'stadium'])
    expect(
      differenceLine(
        stored!,
        differences.find((d) => d.field === 'goalsFor')!,
        'wikipedia',
      ),
    ).toMatch(
      /^match difference: 2001\/02 Eredivisie Wedstrijd 1 \(match \d+\) goalsFor: oude-fansite says 2, wikipedia says 3$/,
    )
  })
})
