import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, personPages, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { type PersonValues } from './person-fields'
import { editPerson, findAdminPerson, type PersonEntry, personValuesOf, validatePerson } from './person-form'

let database: TestDatabase
let userId: number
let personId: number
let otherId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const now = new Date('2026-11-12T12:00:00Z')

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM person_pages')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  const [{ insertId }] = await database.db.insert(persons).values({
    birthDate: '1990-03-01',
    birthDatePrecision: 'month',
    birthDateSource: 'wikidata',
    country: 'NL',
    countrySource: 'wikidata',
    familyName: 'Verzonnen',
    givenName: 'Jan',
    line: 'aanvaller',
    lineSource: 'wikidata',
    name: 'Jan Verzonnen',
    nameSource: 'sort_key',
  })
  const [{ insertId: other }] = await database.db.insert(persons).values({
    name: 'Piet Bedacht',
    wikipediaPage: 'Piet Bedacht',
  })

  personId = insertId
  otherId = other
  await database.db.insert(personPages).values({ page: 'Piet Bedacht', personId: otherId })
  await database.db.insert(players).values([
    { name: 'Jan Verzonnen', personId, searchTerm: 'Verzonnen', season: '2004/05' },
    { name: 'Jan Verzonnen', personId, searchTerm: 'Verzonnen', season: '2005/06' },
    { name: 'Piet Bedacht', personId: otherId, searchTerm: 'Bedacht', season: '2005/06' },
  ])
})

const valuesOf = async (changes: Partial<PersonValues> = {}): Promise<PersonValues> => {
  const found = await findAdminPerson(database.db, personId)

  return { ...personValuesOf({ person: found!.person }), reden: 'Uit het clubblad', ...changes }
}

const entryOf = async (changes: Partial<PersonValues>, part?: Parameters<typeof validatePerson>[1]) => {
  const checked = validatePerson(await valuesOf(changes), part, '3-1990', now)

  if (checked.errors !== undefined) {
    throw new Error(JSON.stringify(checked.errors))
  }

  return checked.entry
}

const person = async () => (await database.db.select().from(persons).where(eq(persons.id, personId)))[0]
const ourRows = () =>
  database.db
    .select({ editorsFields: players.editorsFields, name: players.name, page: players.wikipediaPage })
    .from(players)
    .where(eq(players.personId, personId))
    .orderBy(asc(players.season))
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))

describe('the form of a person', () => {
  it('opens with what the person has, a month of Wikidata as it is', async () => {
    expect(await valuesOf({ reden: '' })).toEqual({
      achternaam: 'Verzonnen',
      geboren: '3-1990',
      land: 'NL',
      linie: 'aanvaller',
      overleden: '',
      reden: '',
      tussenvoegsel: '',
      voornaam: 'Jan',
      wikipedia: '',
    })
  })

  it('lists the seasons of the person, the oldest first', async () => {
    expect((await findAdminPerson(database.db, personId))?.seasons.map((row) => row.season)).toEqual([
      '2004/05',
      '2005/06',
    ])
  })

  it('renames the person and his player in every season, as the editors name', async () => {
    const outcome = await editPerson(
      database.db,
      userId,
      personId,
      await entryOf({ achternaam: 'Bedenksel', tussenvoegsel: 'van' }, 'naam'),
      now,
    )

    expect(outcome).toEqual({ status: 'changed' })
    expect(await person()).toMatchObject({ familyNamePrefix: 'van', name: 'Jan van Bedenksel', nameSource: 'redactie' })
    expect(await ourRows()).toEqual([
      { editorsFields: ['name'], name: 'Jan van Bedenksel', page: null },
      { editorsFields: ['name'], name: 'Jan van Bedenksel', page: null },
    ])
    expect((await log()).map(({ action, detail, itemId }) => ({ action, detail, itemId }))).toEqual([
      {
        action: 'person.edit',
        detail: 'Aangepast: Jan Verzonnen. naam: Jan Verzonnen → Jan van Bedenksel. Reden: Uit het clubblad',
        itemId: personId,
      },
    ])
  })

  it('writes no reason in the log when there is none', async () => {
    const entry = await entryOf({ achternaam: 'Bedenksel' }, 'naam')

    await editPerson(database.db, userId, personId, { ...entry, reason: undefined }, now)

    expect((await log()).map(({ detail }) => detail)).toEqual([
      'Aangepast: Jan Verzonnen. naam: Jan Verzonnen → Jan Bedenksel.',
    ])
  })

  it('refuses a name that another player of one of his seasons has, and changes nothing', async () => {
    const outcome = await editPerson(
      database.db,
      userId,
      personId,
      await entryOf({ achternaam: 'Bedacht', voornaam: 'Piet' }, 'naam'),
      now,
    )

    expect(outcome).toMatchObject({ errors: { achternaam: expect.stringMatching(/^Het seizoen 2005\/06 heeft al/u) } })
    expect((await person())?.name).toBe('Jan Verzonnen')
    expect(await log()).toEqual([])
  })

  it('gives a person without a page the page, and his players too', async () => {
    await editPerson(database.db, userId, personId, await entryOf({ wikipedia: 'Jan Verzonnen' }, 'naam'), now)

    expect((await person())?.wikipediaPage).toBe('Jan Verzonnen')
    expect((await ourRows()).map((row) => [row.page, row.editorsFields])).toEqual([
      ['Jan Verzonnen', ['wikipedia_page']],
      ['Jan Verzonnen', ['wikipedia_page']],
    ])
  })

  it('refuses a page of another person, with the two persons to merge', async () => {
    const outcome = await editPerson(
      database.db,
      userId,
      personId,
      await entryOf({ wikipedia: 'Piet Bedacht' }, 'naam'),
      now,
    )

    expect(outcome).toEqual({
      errors: { wikipedia: expect.stringMatching(/^Deze pagina hoort bij een andere persoon: Piet Bedacht\./u) },
      merge: { label: 'Voeg Jan Verzonnen samen met Piet Bedacht', personId, withId: otherId },
      status: 'refused',
    })
    expect((await person())?.wikipediaPage).toBeNull()
  })

  it('tells the editor what to do when a person that has a page gets another page or none', async () => {
    await editPerson(database.db, userId, personId, await entryOf({ wikipedia: 'Jan Verzonnen' }, 'naam'), now)

    const tail =
      'De import herkent een persoon aan die pagina, daarom blijft ze zoals ze is. Zet de pagina terug zoals ze was om de rest te bewaren.'

    expect(
      await editPerson(database.db, userId, personId, await entryOf({ wikipedia: 'Jan (1990)' }, 'naam'), now),
    ).toEqual({
      errors: { wikipedia: `Deze persoon heeft al een Wikipedia-pagina: Jan Verzonnen. ${tail}` },
      status: 'refused',
    })
    expect(await editPerson(database.db, userId, personId, await entryOf({ wikipedia: '' }, 'naam'), now)).toEqual({
      errors: { wikipedia: `Deze persoon heeft een Wikipedia-pagina: Jan Verzonnen. ${tail}` },
      status: 'refused',
    })
  })

  it('saves a birth date as the editors give it, and an empty one gives Wikidata back, without dates in the log', async () => {
    await editPerson(database.db, userId, personId, await entryOf({ geboren: '14-3-1990' }, 'leven'), now)
    expect(await person()).toMatchObject({
      birthDate: '1990-03-14',
      birthDatePrecision: 'day',
      birthDateSource: 'manual',
    })

    await editPerson(database.db, userId, personId, await entryOf({ geboren: '' }, 'leven'), now)
    expect(await person()).toMatchObject({
      birthDate: null,
      birthDatePrecision: null,
      birthDateSource: null,
      wikidataReadAt: null,
    })
    expect((await log()).map((row) => row.detail)).toEqual([
      'Aangepast: Jan Verzonnen. geboortedatum aangepast. Reden: Uit het clubblad',
      'Aangepast: Jan Verzonnen. geboortedatum weggehaald. Reden: Uit het clubblad',
    ])
  })

  it('keeps a month of Wikidata while its field is not touched', async () => {
    const outcome = await editPerson(database.db, userId, personId, await entryOf({ overleden: '2020' }, 'leven'), now)

    expect(outcome).toEqual({ status: 'changed' })
    expect(await person()).toMatchObject({ birthDatePrecision: 'month', birthDateSource: 'wikidata' })
  })

  it('saves only the fields of its part', async () => {
    const entry = await entryOf({ achternaam: 'Anders', land: 'BE', linie: 'doelman' }, 'land')

    expect(entry).toEqual({ country: 'BE', reason: 'Uit het clubblad' })
    await editPerson(database.db, userId, personId, entry, now)
    expect(await person()).toMatchObject({
      country: 'BE',
      countrySource: 'manual',
      familyName: 'Verzonnen',
      line: 'aanvaller',
    })
  })

  it('writes nothing for a save that changes nothing', async () => {
    expect(await editPerson(database.db, userId, personId, await entryOf({}), now)).toEqual({ status: 'unchanged' })
    expect(await log()).toEqual([])
  })

  it('says a person who is gone is missing', async () => {
    const entry: PersonEntry = { country: 'BE', reason: 'Test' }

    expect(await editPerson(database.db, userId, 999_999, entry, now)).toEqual({ status: 'missing' })
  })
})

describe('validatePerson', () => {
  it('checks the fields of the part only, and a reason of more than 300 characters', async () => {
    const values = await valuesOf({ achternaam: '', land: 'XX', reden: 'x'.repeat(301) })

    expect(validatePerson(values, 'land', '3-1990', now).errors).toEqual({
      land: 'Kies een land uit de lijst, of kies Onbekend.',
      reden: 'Schrijf hoogstens 300 tekens.',
    })
    expect(Object.keys(validatePerson(values, undefined, '3-1990', now).errors ?? {})).toEqual([
      'achternaam',
      'land',
      'reden',
    ])
  })

  it('takes no reason, and then the entry has none', async () => {
    expect(validatePerson(await valuesOf({ land: 'NL', reden: '' }), 'land', '3-1990', now)).toMatchObject({
      entry: { reason: undefined },
    })
  })

  it('refuses a birth date after the year of death', async () => {
    expect(validatePerson(await valuesOf({ geboren: '1990', overleden: '1980' }), 'leven', '', now).errors).toEqual({
      geboren: 'De geboortedatum ligt na het jaar van overlijden. Pas een van de twee aan.',
    })
  })
})
