import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { countPersonsWithout, listPersonsWithout, ourCountries } from '#src/beheer/person-facts'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitPersonFact } from './actions'

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))
vi.mock('#src/database', () => ({ getDatabase: () => database }))

let database: TestDatabase
let userId: number
let moderatorId: number
let personId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(persons)
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  moderatorId =
    (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))
  personId = await addPerson({ name: 'Verzonnen Spits' }, ['2003/04'])
})

async function addPerson(values: typeof persons.$inferInsert, seasons: string[] = []) {
  const [person] = await database.db.insert(persons).values(values).$returningId()
  const id = person?.id ?? 0

  if (seasons.length > 0) {
    await database.db.insert(players).values(
      seasons.map((season) => ({
        name: values.name ?? values.wikipediaPage ?? 'Naamloos',
        personId: id,
        searchTerm: 'verzonnen',
        season,
      })),
    )
  }

  return id
}

function choose(id: number | string, fact: 'land' | 'linie', value?: string) {
  const formData = new FormData()

  if (value !== undefined) {
    formData.set(fact, value)
  }

  return submitPersonFact(id as number, fact, {}, formData)
}

const person = async (id = personId) => (await database.db.select().from(persons).where(eq(persons.id, id)))[0]
const log = () => database.db.select().from(auditLog)

describe('choosing the line or the country of a person on the work list', () => {
  it('gives the person the line with the source manual, and writes it in the log', async () => {
    expect(await choose(personId, 'linie', 'verdediger')).toEqual({ saved: 'verdediger' })
    expect(await person()).toMatchObject({ country: null, line: 'verdediger', lineSource: 'manual' })
    expect(await log()).toMatchObject([
      { action: 'person.edit', detail: 'Verzonnen Spits, linie: geen → verdediger', itemId: personId, userId },
    ])
  })

  it('gives the person the country with the source manual, and writes it in the log', async () => {
    expect(await choose(personId, 'land', 'DK')).toEqual({ saved: 'DK' })
    expect(await person()).toMatchObject({ country: 'DK', countrySource: 'manual', line: null, lineSource: null })
    expect(await log()).toMatchObject([
      { action: 'person.edit', detail: 'Verzonnen Spits, land: geen → DK', itemId: personId, userId },
    ])
  })

  it('refuses a country code we do not know, and keeps what was chosen for the list', async () => {
    for (const code of ['XX', 'dk', 'Denemarken', '']) {
      expect(await choose(personId, 'land', code)).toEqual({ error: 'Kies een land uit de lijst.', land: code })
    }

    expect(await choose(personId, 'land')).toEqual({ error: 'Kies een land uit de lijst.' })
    expect(await person()).toMatchObject({ country: null, countrySource: null })
    expect(await log()).toEqual([])
  })

  it('refuses a line that is no line', async () => {
    for (const line of ['spits', '', undefined]) {
      expect(await choose(personId, 'linie', line)).toEqual({
        error: 'Kies doelman, verdediger, middenvelder of aanvaller.',
      })
    }

    expect(await person()).toMatchObject({ line: null, lineSource: null })
    expect(await log()).toEqual([])
  })

  it('says so when the person does not exist', async () => {
    const gone = { error: 'Deze persoon bestaat niet meer. Laad de pagina opnieuw voor de lijst van nu.' }

    expect(await choose(personId + 100, 'linie', 'doelman')).toEqual(gone)
    expect(await choose('geen-nummer', 'linie', 'doelman')).toEqual(gone)
    expect(await choose(personId + 100, 'land', 'NL')).toEqual({ ...gone, land: 'NL' })
    expect(await log()).toEqual([])
  })

  it('keeps the first of two choices for one row', async () => {
    await choose(personId, 'linie', 'verdediger')

    expect(await choose(personId, 'linie', 'aanvaller')).toEqual({
      error: 'Verzonnen Spits heeft al een linie. Laad de pagina opnieuw voor de lijst van nu.',
    })
    expect(await person()).toMatchObject({ line: 'verdediger', lineSource: 'manual' })

    await choose(personId, 'land', 'NL')

    expect(await choose(personId, 'land', 'BE')).toEqual({
      error: 'Verzonnen Spits heeft al een land. Laad de pagina opnieuw voor de lijst van nu.',
      land: 'BE',
    })
    expect(await person()).toMatchObject({ country: 'NL' })
    expect(await log()).toHaveLength(2)
  })

  it('leaves a line of an import alone', async () => {
    await database.pool.query("UPDATE persons SET line = 'doelman', line_source = 'wikidata'")

    expect(await choose(personId, 'linie', 'aanvaller')).toMatchObject({ error: /heeft al een linie/u })
    expect(await person()).toMatchObject({ line: 'doelman', lineSource: 'wikidata' })
  })

  it('is for a beheerder only', async () => {
    jar.set(sessionCookieName, await startSession(database.db, moderatorId))

    await expect(choose(personId, 'linie', 'doelman')).rejects.toThrow()
    expect(await person()).toMatchObject({ line: null })
  })
})

describe('the persons of the work list', () => {
  it('lists who misses the fact, the newest seasons first and then by name', async () => {
    await addPerson({ name: 'Bedachte Back' }, ['2001/02', '2003/04', '2002/03'])
    await addPerson({ line: 'doelman', lineSource: 'squad', name: 'Proef de Keeper' }, ['2010/11'])
    await addPerson({ country: 'NL', countrySource: 'list', wikipediaPage: 'Nieuwe Naam (voetballer)' }, ['2010/11'])
    await addPerson({ name: 'Test Zonder Selectie' })

    expect(await listPersonsWithout(database.db, 'linie')).toMatchObject([
      { firstSeason: '2010/11', lastSeason: '2010/11', name: 'Nieuwe Naam (voetballer)' },
      { firstSeason: '2001/02', lastSeason: '2003/04', name: 'Bedachte Back', wikipediaPage: null },
      { firstSeason: '2003/04', lastSeason: '2003/04', name: 'Verzonnen Spits' },
      { firstSeason: null, lastSeason: null, name: 'Test Zonder Selectie' },
    ])
    expect((await listPersonsWithout(database.db, 'land')).map(({ name }) => name)).toEqual([
      'Proef de Keeper',
      'Bedachte Back',
      'Verzonnen Spits',
      'Test Zonder Selectie',
    ])
    expect(await countPersonsWithout(database.db)).toEqual({ land: 4, linie: 4 })
    expect((await listPersonsWithout(database.db, 'linie', { limit: 2, offset: 1 })).map(({ name }) => name)).toEqual([
      'Bedachte Back',
      'Verzonnen Spits',
    ])
  })

  it('counts nothing in an empty table', async () => {
    await database.db.delete(persons)

    expect(await countPersonsWithout(database.db)).toEqual({ land: 0, linie: 0 })
    expect(await listPersonsWithout(database.db, 'land')).toEqual([])
  })

  it('names the countries of our persons, the most used first', async () => {
    await addPerson({ country: 'DK', countrySource: 'wikidata', name: 'Een' })
    await addPerson({ country: 'NL', countrySource: 'wikidata', name: 'Twee' })
    await addPerson({ country: 'NL', countrySource: 'manual', name: 'Drie' })

    expect(await ourCountries(database.db)).toEqual(['NL', 'DK'])
  })
})
