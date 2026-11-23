import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matchAppearances, matches, matchReports, persons } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { describeOpponentPersons, importOpponentPersons } from './link-opponent-persons.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

describe('describeOpponentPersons', () => {
  it('says nothing when there was no row to look at, else how each row ended', () => {
    expect(describeOpponentPersons({ excepted: 0, goal: 0, name: 0, nobody: 0, several: 0, squad: 0 })).toEqual([])
    expect(describeOpponentPersons({ excepted: 0, goal: 2, name: 3, nobody: 4, several: 1, squad: 0 })).toEqual([
      "Opponents' players: 2 got a person through a goal, 3 through the name, 4 left without (the name fits nobody), 1 left without (the name fits more than one person).",
    ])
    expect(describeOpponentPersons({ excepted: 0, goal: 0, name: 0, nobody: 0, several: 0, squad: 5 })[0]).toContain(
      '5 through the squad of the club, ',
    )
    expect(describeOpponentPersons({ excepted: 1, goal: 0, name: 0, nobody: 0, several: 0, squad: 0 })[0]).toContain(
      '1 left without (on the list of namesakes)',
    )
  })
})

describe('importOpponentPersons', () => {
  it('links the existing rows once, and finds nothing to change the second time', async () => {
    const [club] = await database.db.insert(clubs).values({ name: 'N.E.C.', slug: 'nec' }).$returningId()
    const [match] = await database.db
      .insert(matches)
      .values({
        clubId: club?.id ?? 0,
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: true,
        kickoffAt: new Date('2026-10-24T18:45:00Z'),
        matchDate: '2026-10-24',
        opponent: 'N.E.C.',
        round: 'Speelronde 10',
        season: '2026/27',
        status: 'played',
      })
      .$returningId()
    const matchId = match?.id ?? 0

    await database.db.insert(matchReports).values({ matchId, status: 'klaar' })

    const [person] = await database.db.insert(persons).values({ name: 'Jan de Vries' }).$returningId()

    await database.db.insert(matchAppearances).values([
      { matchId, name: 'Jan de Vries', ours: false, starter: true },
      { matchId, name: 'Onbekend Persoon', ours: false, starter: true },
    ])

    expect(await importOpponentPersons(database.db)).toEqual([
      "Opponents' players: 0 got a person through a goal, 1 through the name, 1 left without (the name fits nobody), 0 left without (the name fits more than one person).",
    ])

    const rows = await database.db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId))

    expect(rows.map((row) => [row.name, row.personId])).toEqual([
      ['Jan de Vries', person?.id],
      ['Onbekend Persoon', null],
    ])

    // The second run links nothing: the only row left is the one that fits nobody.
    expect(await importOpponentPersons(database.db)).toEqual([
      "Opponents' players: 0 got a person through a goal, 0 through the name, 1 left without (the name fits nobody), 0 left without (the name fits more than one person).",
    ])
    expect(
      (await database.db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId))).map(
        (row) => row.personId,
      ),
    ).toEqual([person?.id, null])
  })
})
