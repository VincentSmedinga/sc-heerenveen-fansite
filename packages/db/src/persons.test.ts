import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import {
  countPersonNames,
  createPersonBook,
  findOrAddEditorsPerson,
  givePersonPage,
  joinNameParts,
  knownPersonPages,
  type PersonName,
  personNamesBySource,
  personsToRead,
  rememberedPersonArticles,
  setEditorsName,
  similarPersons,
  storePersonNames,
} from './persons.ts'
import { personPages, persons } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM persons')
})

const pages = async () =>
  (await database.db.select().from(personPages).orderBy(personPages.page)).map((row) => [row.page, row.personId])

describe('createPersonBook', () => {
  it('makes one person of the titles that end in the same article, and remembers every title', async () => {
    const book = await createPersonBook(database.db, {
      redirects: new Map([
        ['Alfred Finnbogason', 'Alfreð Finnbogason'],
        ['Alfreð Finnbogason', 'Alfreð Finnbogason'],
      ]),
    })
    const a = await book.resolve('Alfred Finnbogason')
    const b = await book.resolve('Alfreð Finnbogason')

    expect(a).not.toBeNull()
    expect(b).toBe(a)
    expect(await database.db.select().from(persons)).toMatchObject([{ id: a, wikipediaPage: 'Alfreð Finnbogason' }])
    expect(await pages()).toEqual([
      ['Alfred Finnbogason', a],
      ['Alfreð Finnbogason', a],
    ])
    expect(book.counts).toEqual({ people: 1, titles: 2 })
  })

  it('gives a person with its own id to every article, and keeps the addition between brackets', async () => {
    const book = await createPersonBook(database.db, {
      redirects: new Map([
        ['Johnny Jansen (1952)', 'Johnny Jansen (1952)'],
        ['Johnny Jansen (1975)', 'Johnny Jansen (1975)'],
      ]),
    })
    const old = await book.resolve('Johnny Jansen (1952)')
    const young = await book.resolve('Johnny Jansen (1975)')

    expect(old).not.toBe(young)
    expect((await database.db.select().from(persons)).map((row) => row.wikipediaPage)).toEqual([
      'Johnny Jansen (1952)',
      'Johnny Jansen (1975)',
    ])
  })

  it('knows a title from an earlier run without an answer, and writes nothing for it', async () => {
    const first = await createPersonBook(database.db, { redirects: new Map([['Luca Oyen', 'Luca Oyen']]) })
    const id = await first.resolve('Luca Oyen')
    const second = await createPersonBook(database.db)

    expect(await second.resolve('Luca Oyen')).toBe(id)
    expect(second.counts).toEqual({ people: 0, titles: 0 })
  })

  it('gives null for a title nobody could ask about, and remembers nothing', async () => {
    const book = await createPersonBook(database.db)

    expect(await book.resolve('Onbekende speler')).toBeNull()
    expect(await database.db.select().from(persons)).toEqual([])
    expect(await pages()).toEqual([])
  })

  it('takes a title of the list of aliases for the person of the title that stays, before any answer', async () => {
    const book = await createPersonBook(database.db, {
      aliases: new Map([['Jan Jansen (voetballer)', 'Jan Jansen (voetballer, 1990)']]),
      redirects: new Map([['Jan Jansen (voetballer, 1990)', 'Jan Jansen (voetballer, 1990)']]),
    })
    const stays = await book.resolve('Jan Jansen (voetballer, 1990)')

    expect(await book.resolve('Jan Jansen (voetballer)')).toBe(stays)
    expect(await database.db.select().from(persons)).toHaveLength(1)
    expect(await pages()).toEqual([
      ['Jan Jansen (voetballer)', stays],
      ['Jan Jansen (voetballer, 1990)', stays],
    ])
  })

  it('finds the person of a redirect to an article that a person has, without making another', async () => {
    const first = await createPersonBook(database.db, { redirects: new Map([['Luca Oyen', 'Luca Oyen']]) })
    const id = await first.resolve('Luca Oyen')
    const later = await createPersonBook(database.db, { redirects: new Map([['Luca Öyen', 'Luca Oyen']]) })

    expect(await later.resolve('Luca Öyen')).toBe(id)
    expect(await database.db.select().from(persons)).toHaveLength(1)
    expect(later.counts).toEqual({ people: 0, titles: 1 })
  })
})

describe('knownPersonPages and rememberedPersonArticles', () => {
  it('lists every title and the article it ends in', async () => {
    const book = await createPersonBook(database.db, {
      redirects: new Map([
        ['Alfred Finnbogason', 'Alfreð Finnbogason'],
        ['Luca Oyen', 'Luca Oyen'],
      ]),
    })

    await book.resolve('Alfred Finnbogason')
    await book.resolve('Luca Oyen')

    expect([...(await knownPersonPages(database.db))].sort()).toEqual([
      'Alfred Finnbogason',
      'Alfreð Finnbogason',
      'Luca Oyen',
    ])
    expect(await rememberedPersonArticles(database.db)).toEqual(
      new Map([
        ['Alfred Finnbogason', 'Alfreð Finnbogason'],
        ['Alfreð Finnbogason', 'Alfreð Finnbogason'],
        ['Luca Oyen', 'Luca Oyen'],
      ]),
    )
  })
})

describe('the names of persons', () => {
  const name = (source: PersonName['source'], givenName = 'Joost'): PersonName => ({
    familyName: 'Aken',
    familyNamePrefix: 'van',
    givenName,
    name: `${givenName} van Aken`,
    source,
  })
  const rowOf = async (page: string) =>
    (await database.db.select().from(persons).where(eq(persons.wikipediaPage, page)))[0]

  it('starts empty, and stores the parts and where they came from', async () => {
    await database.db.insert(persons).values({ wikipediaPage: 'Joost van Aken' })

    expect(await rowOf('Joost van Aken')).toMatchObject({ familyName: null, name: null, nameSource: null })

    const stored = await storePersonNames(database.db, new Map([['Joost van Aken', name('sort_key')]]))

    expect(stored.counts).toEqual({ guess: 0, manual: 0, sort_key: 1 })
    expect(await rowOf('Joost van Aken')).toMatchObject({
      familyName: 'Aken',
      familyNamePrefix: 'van',
      givenName: 'Joost',
      name: 'Joost van Aken',
      nameSource: 'sort_key',
    })
  })

  it('keeps a name it has, takes a name from the list over it, and never replaces that', async () => {
    await database.db.insert(persons).values({ wikipediaPage: 'Joost van Aken' })
    await storePersonNames(database.db, new Map([['Joost van Aken', name('sort_key')]]))

    const again = await storePersonNames(database.db, new Map([['Joost van Aken', name('guess', 'Jo')]]))

    expect(again.counts).toEqual({ guess: 0, manual: 0, sort_key: 0 })
    expect(await rowOf('Joost van Aken')).toMatchObject({ givenName: 'Joost', nameSource: 'sort_key' })

    await storePersonNames(database.db, new Map([['Joost van Aken', name('manual', 'Joost J.')]]))
    await storePersonNames(database.db, new Map([['Joost van Aken', name('sort_key')]]))

    expect(await rowOf('Joost van Aken')).toMatchObject({ givenName: 'Joost J.', nameSource: 'manual' })
  })

  it('reports the guesses, skips a title that is no person, and counts the names by source', async () => {
    await database.db.insert(persons).values([{ wikipediaPage: 'Ramon Zomer' }, { wikipediaPage: 'Luca Oyen' }])

    const stored = await storePersonNames(
      database.db,
      new Map([
        ['Niemand', name('sort_key')],
        ['Ramon Zomer', { ...name('guess'), givenName: 'Ramon' }],
      ]),
    )

    expect(stored.guessed.map((one) => one.title)).toEqual(['Ramon Zomer'])
    expect(await countPersonNames(database.db)).toEqual({ guess: 1, manual: 0, none: 1, redactie: 0, sort_key: 0 })
  })
})

describe('the persons of the editors', () => {
  const pelle = { familyName: 'Amersfoort', familyNamePrefix: 'van', givenName: 'Pelle' }

  it('makes a person without a title, with the name of the editors', async () => {
    const made = await findOrAddEditorsPerson(database.db, { name: pelle, page: null })

    expect(made.created).toBe(true)
    expect(await database.db.select().from(persons)).toMatchObject([
      {
        familyName: 'Amersfoort',
        familyNamePrefix: 'van',
        givenName: 'Pelle',
        id: made.id,
        name: 'Pelle van Amersfoort',
        nameSource: 'redactie',
        wikipediaPage: null,
      },
    ])
    expect(await pages()).toEqual([])
  })

  it('makes two persons without a title: the unique key lets more than one be empty', async () => {
    const a = await findOrAddEditorsPerson(database.db, { name: pelle, page: null })
    const b = await findOrAddEditorsPerson(database.db, { name: { ...pelle, givenName: 'Piet' }, page: null })

    expect(b.id).not.toBe(a.id)
  })

  it('makes the person of a title once, remembers the title, and finds him the second time', async () => {
    const first = await findOrAddEditorsPerson(database.db, { name: pelle, page: 'Pelle van Amersfoort' })
    const second = await findOrAddEditorsPerson(database.db, {
      name: { ...pelle, givenName: 'P.' },
      page: 'Pelle van Amersfoort',
    })

    expect(first.created).toBe(true)
    expect(second).toEqual({ created: false, id: first.id })
    expect(await database.db.select().from(persons)).toMatchObject([
      { name: 'Pelle van Amersfoort', nameSource: 'redactie', wikipediaPage: 'Pelle van Amersfoort' },
    ])
    expect(await pages()).toEqual([['Pelle van Amersfoort', first.id]])
  })

  it('finds the person of a title that redirects to him, and leaves the name he has', async () => {
    const book = await createPersonBook(database.db, {
      redirects: new Map([['Alfred Finnbogason', 'Alfreð Finnbogason']]),
    })
    const id = await book.resolve('Alfred Finnbogason')

    await storePersonNames(
      database.db,
      new Map([
        [
          'Alfreð Finnbogason',
          {
            familyName: 'Finnbogason',
            familyNamePrefix: null,
            givenName: 'Alfreð',
            name: 'Alfreð Finnbogason',
            source: 'sort_key',
          },
        ],
      ]),
    )

    expect(
      await findOrAddEditorsPerson(database.db, {
        name: { familyName: 'Finbogason', familyNamePrefix: null, givenName: 'Alfred' },
        page: 'Alfred Finnbogason',
      }),
    ).toEqual({ created: false, id })
    expect(await database.db.select().from(persons)).toMatchObject([
      { name: 'Alfreð Finnbogason', nameSource: 'sort_key' },
    ])
  })

  it('gives a person the title of his article and the name the editors changed', async () => {
    const { id } = await findOrAddEditorsPerson(database.db, { name: pelle, page: null })

    await givePersonPage(database.db, id, 'Pelle van Amersfoort')
    await setEditorsName(database.db, id, { familyName: 'Dinho', familyNamePrefix: null, givenName: null })

    expect(await database.db.select().from(persons)).toMatchObject([
      {
        familyNamePrefix: null,
        givenName: null,
        name: 'Dinho',
        nameSource: 'redactie',
        wikipediaPage: 'Pelle van Amersfoort',
      },
    ])
    expect(await pages()).toEqual([['Pelle van Amersfoort', id]])
    expect(joinNameParts({ familyName: 'Aken', familyNamePrefix: 'van', givenName: 'Joost' })).toBe('Joost van Aken')
  })

  it('keeps a person without a title out of what the importer reads by title', async () => {
    await findOrAddEditorsPerson(database.db, { name: pelle, page: null })
    await findOrAddEditorsPerson(database.db, { name: pelle, page: 'Luca Oyen' })

    const book = await createPersonBook(database.db)

    expect(await book.resolve('Pelle van Amersfoort')).toBeNull()
    expect([...(await personNamesBySource(database.db))]).toEqual([['Luca Oyen', 'redactie']])
    expect((await personsToRead(database.db, 10)).map((person) => person.wikipediaPage)).toEqual(['Luca Oyen'])
    expect(await similarPersons(database.db)).toEqual([])
    expect(await countPersonNames(database.db)).toEqual({ guess: 0, manual: 0, none: 0, redactie: 1, sort_key: 0 })
  })

  it('never lets the importer replace a name of the editors with a guess or a sort key', async () => {
    await findOrAddEditorsPerson(database.db, { name: pelle, page: 'Pelle van Amersfoort' })
    await storePersonNames(
      database.db,
      new Map([
        [
          'Pelle van Amersfoort',
          { familyName: 'Amersfoort', familyNamePrefix: null, givenName: 'Pelle van', name: 'x', source: 'guess' },
        ],
      ]),
    )

    expect(await database.db.select().from(persons)).toMatchObject([{ givenName: 'Pelle', nameSource: 'redactie' }])
  })
})
