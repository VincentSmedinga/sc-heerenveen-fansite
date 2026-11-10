import type { TestDatabase } from '@fansite/db/test-database'

import { playerListReport } from '@fansite/db/persons'
import { persons, playerListTitles, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { importPlayerList, playerListMaxAge, playerListTitle, readPlayerList } from './player-list.ts'
import { pageUrl } from './read-wikipedia.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8' }

// The shape of the page: a text on top, a heading, and the players in a block of columns.
const page = `Dit is een lijst van [[voetballer]]s van [[sc Heerenveen]].
{{Inhoud abc}}

==A==
{{Kolommen lijst | breedte=19 | aantal=4 | inhoud=* {{NL-VLAG|15}} [[Gerrit Abma]]
* {{NL-VLAG|15}}{{GH-VLAG|15}} [[Piet Adema (voetballer)|Piet Adema]]
* [[Daniël Jansen]]
* [[Luca Oyen]]
}}

[[Categorie:Sc Heerenveen]]
`

let database: TestDatabase
const servers: TestServer[] = []
const first = new Date('2026-11-10T12:00:00Z')

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM player_list_titles')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function serve(text: null | string) {
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }

  routes[pageUrl('', playerListTitle)] = text === null ? reply(500, 'kapot') : reply(200, text, wiki)

  const server = await startServer(routes)

  servers.push(server)

  return server
}

describe('readPlayerList', () => {
  it('takes the first link of each item, without the templates, and nothing above the first heading', () => {
    expect(readPlayerList(page)).toEqual(['Gerrit Abma', 'Piet Adema (voetballer)', 'Daniël Jansen', 'Luca Oyen'])
  })

  it('gives nothing for a page that is a redirect', () => {
    expect(readPlayerList('#REDIRECT [[Iets anders]]')).toEqual([])
  })
})

describe('importPlayerList', () => {
  it('keeps the titles, and a second run a day later changes nothing', async () => {
    const server = await serve(page)
    const fetcher = fetcherFor([server])

    expect(await importPlayerList(database.db, fetcher, server.origin, () => first)).toEqual([
      'Player list: 4 titles read, 4 new, 0 gone',
    ])

    const later = new Date(first.getTime() + playerListMaxAge + 1)

    expect(await importPlayerList(database.db, fetcher, server.origin, () => later)).toEqual([])
    expect((await database.db.select().from(playerListTitles)).map((row) => row.title).sort()).toEqual([
      'Daniël Jansen',
      'Gerrit Abma',
      'Luca Oyen',
      'Piet Adema (voetballer)',
    ])
  })

  it('asks nothing when the last read is younger than a day', async () => {
    const server = await serve(page)
    const fetcher = fetcherFor([server])

    await importPlayerList(database.db, fetcher, server.origin, () => first)

    const before = server.paths().length

    expect(
      await importPlayerList(database.db, fetcher, server.origin, () => new Date(first.getTime() + 3600_000)),
    ).toEqual([])
    expect(server.paths()).toHaveLength(before)
  })

  it('leaves the titles as they are and says so when the page cannot be read', async () => {
    const good = await serve(page)

    await importPlayerList(database.db, fetcherFor([good]), good.origin, () => first)

    const broken = await serve(null)
    const lines = await importPlayerList(
      database.db,
      fetcherFor([broken]),
      broken.origin,
      () => new Date(first.getTime() + playerListMaxAge + 1),
    )

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^Player list: not read, /u)
    expect(await database.db.select().from(playerListTitles)).toHaveLength(4)

    const empty = await serve('Een pagina zonder spelers.')

    expect(
      await importPlayerList(
        database.db,
        fetcherFor([empty]),
        empty.origin,
        () => new Date(first.getTime() + 2 * playerListMaxAge),
      ),
    ).toEqual(['Player list: not read, the page has no titles of players'])
    expect(await database.db.select().from(playerListTitles)).toHaveLength(4)
  })

  it('makes no person and no player and changes no name', async () => {
    await database.db.insert(persons).values({ name: 'Gerrit Abma', wikipediaPage: 'Gerrit Abma' })

    const server = await serve(page)

    await importPlayerList(database.db, fetcherFor([server]), server.origin, () => first)

    expect(await database.db.select({ name: persons.name, page: persons.wikipediaPage }).from(persons)).toEqual([
      { name: 'Gerrit Abma', page: 'Gerrit Abma' },
    ])
    expect(await database.db.select().from(players)).toHaveLength(0)
  })
})

describe('playerListReport', () => {
  it('says what is not on the list, what is no person of ours, and what differs in a sign', async () => {
    await database.db
      .insert(persons)
      .values([
        { wikipediaPage: 'Gerrit Abma' },
        { wikipediaPage: 'Daniel Jansen' },
        { wikipediaPage: 'Iemand Anders' },
        { wikipediaPage: null },
      ])
    await database.db
      .insert(playerListTitles)
      .values(['Gerrit Abma', 'Daniël Jansen', 'Luca Oyen'].map((title) => ({ readAt: first, title })))

    expect(await playerListReport(database.db)).toEqual({
      notOnList: ['Iemand Anders'],
      notOurs: ['Luca Oyen'],
      read: 3,
      spelling: [['Daniel Jansen', 'Daniël Jansen']],
    })
  })

  it('leaves out the titles the owner decided on, and says nothing before the list is read', async () => {
    await database.db.insert(persons).values([{ wikipediaPage: 'Jordy Bruijn' }, { wikipediaPage: 'Ruud Kool' }])

    expect(await playerListReport(database.db)).toMatchObject({ notOnList: [], read: 0 })

    await database.db.insert(playerListTitles).values([
      { readAt: first, title: 'Jordy Buijs' },
      { readAt: first, title: 'Robert van der Berg' },
      { readAt: first, title: 'Luca Oyen' },
    ])

    expect(await playerListReport(database.db)).toEqual({
      notOnList: [],
      notOurs: ['Luca Oyen'],
      read: 3,
      spelling: [],
    })
  })
})
