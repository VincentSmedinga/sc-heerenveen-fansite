import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { PlayerField } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import {
  countWaitingFieldDifferences,
  decidePlayerFieldDifference,
  holdEditorsFields,
  isOfEditors,
  keepPlayerFieldDifferences,
  listWaitingFieldDifferences,
} from './player-field-differences.ts'
import { adminUsers, auditLog, personPages, persons, playerFieldDifferences, players } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let adminId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const season = '2026/27'
const first = new Date('2026-11-09T10:00:00Z')
const later = new Date('2026-11-10T10:00:00Z')

async function player(values: Partial<typeof players.$inferInsert> = {}) {
  const [inserted] = await database.db
    .insert(players)
    .values({ name: 'Sanne Spits', searchTerm: 'Spits', season, ...values })
    .$returningId()

  return inserted!.id
}

const found = (playerId: number, field: PlayerField, editorsValue: null | string, importValue: string) => ({
  editorsValue,
  field,
  importValue,
  playerId,
})
const differences = () => database.db.select().from(playerFieldDifferences).orderBy(playerFieldDifferences.id)
const playerOf = async (id: number) => (await database.db.select().from(players).where(eq(players.id, id)))[0]
const decide = (id: number, kind: 'keep' | 'take-over', now = later) =>
  database.db.transaction((transaction) =>
    decidePlayerFieldDifference(transaction, id, { kind, reason: 'Daarom', userId: adminId }, now),
  )

describe('holding the fields of the editors', () => {
  const row = {
    editorsFields: ['name', 'shirt_number'] as PlayerField[],
    id: 7,
    name: 'Sanne Spits',
    position: 'aanvaller' as const,
    shirtNumber: 9,
    wikipediaPage: null,
  }

  it('lets the import write the fields the editors did not set, and keeps theirs', () => {
    expect(
      holdEditorsFields(row, { name: 'Sanne Spitz', position: 'middenvelder', shirtNumber: 19, wikipediaPage: 'S' }),
    ).toEqual({
      allowed: { name: 'Sanne Spits', position: 'middenvelder', shirtNumber: 9, wikipediaPage: 'S' },
      differences: [
        { editorsValue: 'Sanne Spits', field: 'name', importValue: 'Sanne Spitz', playerId: 7 },
        { editorsValue: '9', field: 'shirt_number', importValue: '19', playerId: 7 },
      ],
    })
  })

  it('finds no difference in a value that is the same, or in a field the list does not give', () => {
    expect(
      holdEditorsFields(row, { name: 'Sanne Spits', position: null, shirtNumber: null, wikipediaPage: null }),
    ).toEqual({
      allowed: { name: 'Sanne Spits', position: null, shirtNumber: 9, wikipediaPage: null },
      differences: [],
    })
  })

  it('keeps a field the editors left empty, with the value of the import as a difference', () => {
    expect(
      holdEditorsFields(
        { ...row, editorsFields: ['wikipedia_page'] },
        { name: 'Sanne Spits', position: 'aanvaller', shirtNumber: 9, wikipediaPage: 'Sanne Spits' },
      ),
    ).toMatchObject({
      allowed: { wikipediaPage: null },
      differences: [{ editorsValue: null, field: 'wikipedia_page', importValue: 'Sanne Spits' }],
    })
  })

  it('knows a player the editors added or changed', () => {
    expect(isOfEditors({ editorsFields: [], source: 'redactie' })).toBe(true)
    expect(isOfEditors({ editorsFields: ['position'], source: 'selectie' })).toBe(true)
    expect(isOfEditors({ editorsFields: [], source: 'selectie' })).toBe(false)
  })
})

describe('keeping a difference', () => {
  it('makes a row with the player, the season, the field and both values', async () => {
    const id = await player({ editorsFields: ['shirt_number'], shirtNumber: 9 })

    expect(await keepPlayerFieldDifferences(database.db, season, [found(id, 'shirt_number', '9', '19')], first)).toBe(1)
    expect(await differences()).toMatchObject([
      {
        decidedAt: null,
        editorsValue: '9',
        field: 'shirt_number',
        firstSeenAt: first,
        importValue: '19',
        lastSeenAt: first,
        playerId: id,
        season,
        status: 'pending',
      },
    ])
    expect(await countWaitingFieldDifferences(database.db)).toEqual(new Map([[season, 1]]))
    expect(await listWaitingFieldDifferences(database.db, season)).toMatchObject([
      { field: 'shirt_number', name: 'Sanne Spits' },
    ])
  })

  it('keeps the same difference once, and sees it again at a later run', async () => {
    const id = await player()
    const same = [found(id, 'shirt_number', '9', '19')]

    await keepPlayerFieldDifferences(database.db, season, same, first)

    expect(await keepPlayerFieldDifferences(database.db, season, same, later)).toBe(0)
    expect(await differences()).toMatchObject([{ firstSeenAt: first, lastSeenAt: later, status: 'pending' }])
  })

  it('closes a difference that is gone, and replaces one whose values changed', async () => {
    const id = await player()
    const other = await player({ name: 'Jelle Jong' })

    await keepPlayerFieldDifferences(
      database.db,
      season,
      [found(id, 'shirt_number', '9', '19'), found(other, 'position', 'aanvaller', 'middenvelder')],
      first,
    )

    expect(await keepPlayerFieldDifferences(database.db, season, [found(id, 'shirt_number', '9', '29')], later)).toBe(1)
    expect(await differences()).toMatchObject([
      { decidedAt: later, importValue: '19', resolution: 'replaced', status: 'rejected' },
      { decidedAt: later, field: 'position', resolution: 'reverted', status: 'rejected' },
      { importValue: '29', status: 'pending' },
    ])
  })

  it('leaves the differences of another season alone', async () => {
    const id = await player({ season: '2025/26' })

    await keepPlayerFieldDifferences(database.db, '2025/26', [found(id, 'shirt_number', '9', '19')], first)
    await keepPlayerFieldDifferences(database.db, season, [], later)

    expect(await differences()).toMatchObject([{ status: 'pending' }])
  })
})

describe('deciding a difference', () => {
  it('keeps the value of the editors, and the difference does not come back while both stay the same', async () => {
    const id = await player({ editorsFields: ['shirt_number'], shirtNumber: 9 })
    const same = [found(id, 'shirt_number', '9', '19')]

    await keepPlayerFieldDifferences(database.db, season, same, first)

    const [difference] = await differences()

    expect(await decide(difference!.id, 'keep')).toBe('done')
    expect(await playerOf(id)).toMatchObject({ editorsFields: ['shirt_number'], shirtNumber: 9 })
    expect(await keepPlayerFieldDifferences(database.db, season, same, later)).toBe(0)
    expect(await differences()).toMatchObject([{ decidedAt: later, resolution: 'person', status: 'rejected' }])
    // Another value of the import is a new difference.
    expect(await keepPlayerFieldDifferences(database.db, season, [found(id, 'shirt_number', '9', '29')], later)).toBe(1)
    expect(await database.db.select().from(auditLog)).toMatchObject([
      {
        action: 'player.field-keep',
        detail: 'rugnummer 2026/27: redactie 9, import 19',
        itemId: id,
        reason: 'Daarom',
        userId: adminId,
      },
    ])
    expect(await decide(difference!.id, 'keep')).toBe('not-waiting')
  })

  it('takes a number and a line over, and the field is no longer of the editors', async () => {
    const id = await player({ editorsFields: ['position', 'shirt_number'], position: 'aanvaller', shirtNumber: 9 })

    await keepPlayerFieldDifferences(
      database.db,
      season,
      [found(id, 'shirt_number', '9', '19'), found(id, 'position', 'aanvaller', 'middenvelder')],
      first,
    )

    const [number, line] = await differences()

    expect(await decide(number!.id, 'take-over')).toBe('done')
    expect(await playerOf(id)).toMatchObject({ editorsFields: ['position'], position: 'aanvaller', shirtNumber: 19 })
    expect(await decide(line!.id, 'take-over')).toBe('done')
    expect(await playerOf(id)).toMatchObject({ editorsFields: [], position: 'middenvelder', shirtNumber: 19 })
    expect(await differences()).toMatchObject([
      { resolution: 'person', status: 'accepted' },
      { resolution: 'person', status: 'accepted' },
    ])
    expect((await database.db.select().from(auditLog)).map((row) => row.action)).toEqual([
      'player.field-take-over',
      'player.field-take-over',
    ])
  })

  it('takes a name over on the row and on a person the editors named', async () => {
    const [person] = await database.db
      .insert(persons)
      .values({ familyName: 'Spits', givenName: 'Sanne', name: 'Sanne Spits', nameSource: 'redactie' })
      .$returningId()
    const id = await player({ editorsFields: ['name'], personId: person!.id })

    await keepPlayerFieldDifferences(
      database.db,
      season,
      [found(id, 'name', 'Sanne Spits', 'Sanne van der Spitz')],
      first,
    )

    expect(await decide((await differences())[0]!.id, 'take-over')).toBe('done')
    expect(await playerOf(id)).toMatchObject({
      editorsFields: [],
      name: 'Sanne van der Spitz',
      searchTerm: 'van der Spitz',
    })
    expect(await database.db.select().from(persons)).toMatchObject([
      { familyName: null, givenName: null, name: 'Sanne van der Spitz', nameSource: null },
    ])
  })

  it('leaves the name of a person the importer or the list named', async () => {
    const [person] = await database.db
      .insert(persons)
      .values({ familyName: 'Spits', name: 'Sanne Spits', nameSource: 'manual', wikipediaPage: 'Sanne Spits' })
      .$returningId()
    const id = await player({ editorsFields: ['name'], name: 'S. Spits', personId: person!.id })

    await keepPlayerFieldDifferences(database.db, season, [found(id, 'name', 'S. Spits', 'Sanne Spits')], first)
    await decide((await differences())[0]!.id, 'take-over')

    expect(await playerOf(id)).toMatchObject({ name: 'Sanne Spits' })
    expect(await database.db.select().from(persons)).toMatchObject([{ familyName: 'Spits', nameSource: 'manual' }])
  })

  it('takes a page over with the person we know for it', async () => {
    const [known] = await database.db.insert(persons).values({ wikipediaPage: 'Sanne Spits (1999)' }).$returningId()

    await database.db.insert(personPages).values({ page: 'Sanne Spits (voetballer)', personId: known!.id })

    const id = await player({ editorsFields: ['wikipedia_page'] })

    await keepPlayerFieldDifferences(
      database.db,
      season,
      [found(id, 'wikipedia_page', null, 'Sanne Spits (voetballer)')],
      first,
    )

    expect(await decide((await differences())[0]!.id, 'take-over')).toBe('done')
    expect(await playerOf(id)).toMatchObject({
      editorsFields: [],
      personId: known!.id,
      wikipediaPage: 'Sanne Spits (voetballer)',
    })
  })

  it('gives a person of the editors without a page the page, and leaves a player without a person otherwise', async () => {
    const [own] = await database.db
      .insert(persons)
      .values({ familyName: 'Spits', name: 'Sanne Spits', nameSource: 'redactie' })
      .$returningId()
    const [titled] = await database.db.insert(persons).values({ wikipediaPage: 'Jelle Jong (1990)' }).$returningId()
    const id = await player({ editorsFields: ['wikipedia_page'], personId: own!.id })
    const other = await player({
      editorsFields: ['wikipedia_page'],
      name: 'Jelle Jong',
      personId: titled!.id,
      wikipediaPage: 'Jelle Jong (1990)',
    })

    await keepPlayerFieldDifferences(
      database.db,
      season,
      [
        found(id, 'wikipedia_page', null, 'Sanne Spits'),
        found(other, 'wikipedia_page', 'Jelle Jong (1990)', 'Jelle Jong (2001)'),
      ],
      first,
    )

    const [mine, theirs] = await differences()

    await decide(mine!.id, 'take-over')
    await decide(theirs!.id, 'take-over')

    expect(await playerOf(id)).toMatchObject({ personId: own!.id, wikipediaPage: 'Sanne Spits' })
    expect(await database.db.select().from(persons).where(eq(persons.id, own!.id))).toMatchObject([
      { name: 'Sanne Spits', nameSource: 'redactie', wikipediaPage: 'Sanne Spits' },
    ])
    expect(await database.db.select().from(personPages)).toEqual([{ page: 'Sanne Spits', personId: own!.id }])
    expect(await playerOf(other)).toMatchObject({ personId: null, wikipediaPage: 'Jelle Jong (2001)' })
  })

  it('says so when another player of the season has the name or the page, and leaves the difference waiting', async () => {
    const id = await player({ editorsFields: ['name', 'wikipedia_page'] })

    await player({ name: 'Sanne Spitz', wikipediaPage: 'Sanne Spitz' })
    await keepPlayerFieldDifferences(
      database.db,
      season,
      [found(id, 'name', 'Sanne Spits', 'Sanne Spitz'), found(id, 'wikipedia_page', null, 'Sanne Spitz')],
      first,
    )

    const [name, page] = await differences()

    expect(await decide(name!.id, 'take-over')).toBe('taken')
    expect(await decide(page!.id, 'take-over')).toBe('taken')
    expect(await playerOf(id)).toMatchObject({ name: 'Sanne Spits', wikipediaPage: null })
    expect(await differences()).toMatchObject([{ status: 'pending' }, { status: 'pending' }])
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
  it('says so when another player of the season is the person of the page already', async () => {
    const [known] = await database.db.insert(persons).values({ wikipediaPage: 'Sanne Spits' }).$returningId()

    await database.db.insert(personPages).values({ page: 'Sanne Spits (voetballer)', personId: known!.id })
    await player({ name: 'S. Spits', personId: known!.id, wikipediaPage: 'Sanne Spits' })

    const id = await player({ editorsFields: ['wikipedia_page'] })

    await keepPlayerFieldDifferences(
      database.db,
      season,
      [found(id, 'wikipedia_page', null, 'Sanne Spits (voetballer)')],
      first,
    )

    expect(await decide((await differences())[0]!.id, 'take-over')).toBe('taken')
    expect(await playerOf(id)).toMatchObject({ personId: null, wikipediaPage: null })
    expect(await differences()).toMatchObject([{ status: 'pending' }])
  })
})
