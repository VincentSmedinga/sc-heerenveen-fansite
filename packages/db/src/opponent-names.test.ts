import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { readOpponentNames } from './opponent-names.ts'
import { clubs, clubSquadPlayers, matchAppearances, matches, matchReports } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

describe('readOpponentNames (#1542)', () => {
  it('lists the squad first, then the names of earlier reports, each name once', async () => {
    const [club] = await database.db.insert(clubs).values({ name: 'N.E.C.', slug: 'nec' }).$returningId()
    const [other] = await database.db.insert(clubs).values({ name: 'Ajax', slug: 'ajax' }).$returningId()
    const clubId = club?.id ?? 0
    const readAt = new Date('2026-11-20T10:00:00Z')

    await database.db.insert(clubSquadPlayers).values([
      { clubId, name: 'Piet Bakker', readAt, shirtNumber: 9 },
      { clubId, name: 'Jan Jansen', readAt, shirtNumber: 1 },
      { clubId: other?.id ?? 0, name: 'Dusan Tadic', readAt },
    ])

    let round = 0
    const report = async (forClub: number, names: string[], ours = false) => {
      round += 1

      const [match] = await database.db
        .insert(matches)
        .values({
          clubId: forClub,
          competition: 'Eredivisie',
          goalsAgainst: 0,
          goalsFor: 1,
          home: true,
          kickoffAt: new Date('2026-10-24T18:45:00Z'),
          matchDate: '2026-10-24',
          opponent: 'x',
          round: `Speelronde ${round}`,
          season: '2026/27',
          status: 'played',
        })
        .$returningId()
      const matchId = match?.id ?? 0

      await database.db.insert(matchReports).values({ matchId, status: 'klaar' })
      await database.db
        .insert(matchAppearances)
        .values(names.map((name, index) => ({ matchId, name, ours, shirtNumber: index + 1, starter: true })))
    }

    await report(clubId, ['jan jansen', 'Kees de Boer', 'Aad Mulder'])
    await report(clubId, ['Kees de Boer'])
    await report(clubId, ['Onze Speler'], true)
    await report(other?.id ?? 0, ['Henk Vos'])

    expect(await readOpponentNames(database.db, clubId)).toEqual([
      'Jan Jansen',
      'Piet Bakker',
      'Aad Mulder',
      'Kees de Boer',
    ])
  })

  it('is the names of earlier reports alone when no squad was read, and empty without any', async () => {
    const [club] = await database.db.insert(clubs).values({ name: 'Vitesse', slug: 'vitesse' }).$returningId()

    expect(await readOpponentNames(database.db, club?.id ?? 0)).toEqual([])
  })
})
