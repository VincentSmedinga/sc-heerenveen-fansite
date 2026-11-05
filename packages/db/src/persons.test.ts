import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { createPersonBook, knownPersonPages, rememberedPersonArticles } from './persons.ts'
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
    expect(await database.db.select().from(persons)).toEqual([{ id: a, wikipediaPage: 'Alfreð Finnbogason' }])
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
