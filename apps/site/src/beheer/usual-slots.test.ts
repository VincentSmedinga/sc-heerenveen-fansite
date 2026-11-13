import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { matchAppearances, matches, matchReports, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { readLineUpsInCountedFormation, slotsOfLineUp, slotText, usualSlots } from './usual-slots'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
})

const names = ['Keeper', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const lineUp = (swap: Record<number, string> = {}) =>
  names.map((name, index) => ({ name: swap[index] ?? name, playerId: null }))

describe('the slots of a line-up', () => {
  it('are the keeper, then four in the defence, three in midfield and three in attack, from the left', () => {
    const slots = slotsOfLineUp(11)

    expect(slots).toHaveLength(11)
    expect(slots[0]).toEqual({ place: 0, row: 0 })
    expect(slots[1]).toEqual({ place: 0, row: 1 })
    expect(slots[4]).toEqual({ place: 3, row: 1 })
    expect(slots[5]).toEqual({ place: 0, row: 2 })
    expect(slots[10]).toEqual({ place: 2, row: 3 })
  })

  it('are none for a line-up that does not have eleven starters', () => {
    expect(slotsOfLineUp(10)).toEqual([])
    expect(slotsOfLineUp(12)).toEqual([])
  })
})

describe('the usual slot of a player', () => {
  it('is the slot where he stood most often, with the share of his matches', () => {
    const many = Array.from({ length: 10 }, (_nothing, index) => (index < 8 ? lineUp() : lineUp({ 2: 'C', 3: 'B' })))
    const found = usualSlots(many)
    const b = found.find((slot) => slot.name === 'B')

    expect(b).toMatchObject({ line: 'verdediger', matches: 10, percentage: 80, place: 2, size: 4 })
    expect(found.find((slot) => slot.name === 'Keeper')).toMatchObject({ line: 'keeper', percentage: 100 })
  })

  it('leaves out a player with fewer than ten matches, and a line-up without eleven starters', () => {
    const nine = Array.from({ length: 9 }, () => lineUp())

    expect(usualSlots(nine)).toEqual([])
    expect(usualSlots([...nine, lineUp().slice(0, 10)])).toEqual([])
    expect(usualSlots([...nine, lineUp()]).length).toBe(11)
  })

  it('puts the players with the most matches first, and the first slot when two are equally often', () => {
    const lineUps = [
      ...Array.from({ length: 10 }, () => lineUp()),
      ...Array.from({ length: 2 }, () => lineUp({ 1: 'Gast' })),
    ]
    const found = usualSlots(lineUps, 2)

    expect(found[0]?.matches).toBe(12)
    expect(found.find((slot) => slot.name === 'Gast')).toMatchObject({ matches: 2, place: 1 })
  })

  it('says a slot in words, and the keeper has no place', () => {
    expect(slotText({ line: 'middenvelder', place: 3, size: 3 })).toBe('middenvelder, 3 van 3')
    expect(slotText({ line: 'keeper', place: 1, size: 1 })).toBe('keeper')
  })
})

describe('the line-ups in a 4-3-3 from the database', () => {
  let round = 0
  const base: Omit<NewMatch, 'clubId'> = {
    competition: 'Eredivisie',
    dataSource: 'oude-fansite',
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    matchDate: '2005-08-13',
    opponent: 'Testdorp FC',
    round: '1',
    season: '2005/06',
    status: 'played',
  }

  async function addReport(formation: null | string, starters: number, bench = 0) {
    const [row] = await withClubs(database.db, [{ ...base, round: String(++round) }])
    const [{ insertId }] = await database.db.insert(matches).values(row!)

    await database.db.insert(matchReports).values({ formationOurs: formation, matchId: insertId, status: 'klaar' })
    await database.db.insert(matchAppearances).values([
      ...Array.from({ length: starters }, (_nothing, index) => ({
        matchId: insertId,
        name: `Speler ${index + 1}`,
        ours: true,
        starter: true,
      })),
      ...Array.from({ length: bench }, (_nothing, index) => ({
        matchId: insertId,
        name: `Bank ${index + 1}`,
        ours: true,
        starter: false,
      })),
      { matchId: insertId, name: 'Tegenstander', ours: false, starter: true },
    ])

    return insertId
  }

  it('has only the starters of ours of a report with a 4-3-3, in the order they were saved', async () => {
    await addReport('4-4-2', 11)
    await addReport(null, 11)
    await addReport('4-3-3', 11, 3)

    const lineUps = await readLineUpsInCountedFormation(database.db)

    expect(lineUps).toHaveLength(1)
    expect(lineUps[0]?.map((starter) => starter.name)).toEqual(
      Array.from({ length: 11 }, (_nothing, index) => `Speler ${index + 1}`),
    )
  })
})
