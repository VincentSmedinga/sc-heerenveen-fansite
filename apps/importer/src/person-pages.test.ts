import type { TestDatabase } from '@fansite/db/test-database'

import { createPersonBook } from '@fansite/db/persons'
import { persons } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { aliasMap } from './person-names.ts'
import {
  describePersons,
  lookUpPersonPages,
  mostFailuresInARow,
  similarPersons,
  similarPersonsWarning,
} from './person-pages.ts'
import { pageUrl } from './read-wikipedia.ts'
import { articleText } from './test-articles.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8' }

let database: TestDatabase
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM persons')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** A web server that answers as Wikipedia does: the text of a title, or a status. */
async function serve(pages: Record<string, number | string>, { robots = '' }: { robots?: string } = {}) {
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, robots, { 'Content-Type': 'text/plain' }) }

  for (const [title, answer] of Object.entries(pages)) {
    routes[pageUrl('', title)] = typeof answer === 'number' ? reply(answer, 'Fout') : reply(200, answer, wiki)
  }

  const server = await startServer(routes)

  servers.push(server)

  return server
}

const asked = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

const lookUp = (server: TestServer, titles: string[], aliases = new Map<string, string>()) =>
  lookUpPersonPages(database.db, fetcherFor([server]), server.origin, titles, aliases)

describe('lookUpPersonPages', () => {
  it('follows a redirect to the article, and asks once for each title', async () => {
    const server = await serve({
      'Alfred Finnbogason': '#REDIRECT [[Alfreð Finnbogason]]',
      'Alfreð Finnbogason': articleText,
      'Filip Djuričić': '#REDIRECT [[Filip Đuričić]]',
      'Filip Đuričić': articleText,
    })
    const found = await lookUp(server, [
      'Alfred Finnbogason',
      'Alfreð Finnbogason',
      'Alfred Finnbogason',
      'Filip Djuričić',
      'Filip Đuričić',
    ])

    expect(found).toEqual({
      asked: 2,
      redirects: new Map([
        ['Alfred Finnbogason', 'Alfreð Finnbogason'],
        ['Alfreð Finnbogason', 'Alfreð Finnbogason'],
        ['Filip Djuričić', 'Filip Đuričić'],
        ['Filip Đuričić', 'Filip Đuričić'],
      ]),
      warnings: [],
    })
    // Alfreð Finnbogason was asked for as the target of the redirect, and not again: two titles
    // were looked up, and a redirect costs one request more.
    expect(asked(server)).toEqual([
      '/wiki/Alfred_Finnbogason?action=raw',
      '/wiki/Alfre%C3%B0_Finnbogason?action=raw',
      '/wiki/Filip_Djuri%C4%8Di%C4%87?action=raw',
      '/wiki/Filip_%C4%90uri%C4%8Di%C4%87?action=raw',
    ])
  })

  it('asks nothing about a title the database knows, and nothing about the target of a redirect it knows', async () => {
    const book = await createPersonBook(database.db, {
      redirects: new Map([['Alfreð Finnbogason', 'Alfreð Finnbogason']]),
    })

    await book.resolve('Alfreð Finnbogason')

    const server = await serve({ 'Alfred Finnbogason': '#REDIRECT [[Alfreð Finnbogason]]' })

    expect(await lookUp(server, ['Alfreð Finnbogason'])).toEqual({ asked: 0, redirects: new Map(), warnings: [] })
    expect(asked(server)).toEqual([])
    expect(await lookUp(server, ['Alfred Finnbogason'])).toEqual({
      asked: 1,
      redirects: new Map([['Alfred Finnbogason', 'Alfreð Finnbogason']]),
      warnings: [],
    })
    expect(asked(server)).toEqual(['/wiki/Alfred_Finnbogason?action=raw'])
  })

  it('takes a title without an article as it stands, with no warning', async () => {
    const server = await serve({ 'Luca Oyen': articleText, 'Rode Link': 404 })
    const found = await lookUp(server, ['Rode Link', 'Luca Oyen'])

    expect(found).toEqual({
      asked: 2,
      redirects: new Map([
        ['Luca Oyen', 'Luca Oyen'],
        ['Rode Link', 'Rode Link'],
      ]),
      warnings: [],
    })
  })

  it('gives no answer for a title whose request fails, warns once, and goes on with the other titles', async () => {
    const server = await serve({ 'Kapotte Speler': 500, 'Luca Oyen': articleText })
    const found = await lookUp(server, ['Kapotte Speler', 'Luca Oyen'])

    expect(found.redirects).toEqual(new Map([['Luca Oyen', 'Luca Oyen']]))
    expect(found.warnings).toEqual([
      expect.stringMatching(
        /^Persons: 1 title could not be asked, so their goals and players have no person until the next run: Kapotte Speler: HTTP 500$/u,
      ),
    ])
  })

  it('stops asking after three failures in a row, and counts a title that worked as a new start', async () => {
    const titles = ['A', 'B', 'C', 'D', 'E']
    const failing = await serve(Object.fromEntries(titles.map((title) => [title, 500])))
    const stopped = await lookUp(failing, titles)

    expect(mostFailuresInARow).toBe(3)
    expect(asked(failing)).toHaveLength(3)
    expect(stopped.redirects.size).toBe(0)
    expect(stopped.warnings).toEqual([expect.stringContaining('Persons: 3 titles could not be asked')])

    const mixed = await serve({ A: 500, B: 500, C: articleText, D: 500, E: 500 })
    const found = await lookUp(mixed, titles)

    expect(asked(mixed)).toHaveLength(5)
    expect(found.redirects).toEqual(new Map([['C', 'C']]))
    expect(found.warnings).toEqual([expect.stringContaining('Persons: 4 titles could not be asked')])
  })

  it('stops at once and warns when robots.txt refuses, or Wikipedia asks us to wait', async () => {
    const closed = await serve({ 'Luca Oyen': articleText }, { robots: 'User-agent: *\nDisallow: /wiki/' })
    const refused = await lookUp(closed, ['Luca Oyen', 'Jacob Trenskow'])

    expect(refused.redirects.size).toBe(0)
    expect(refused.warnings).toEqual([expect.stringMatching(/^Persons: robots\.txt does not allow .*Luca_Oyen/u)])

    const busy = await startServer({
      '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }),
      [pageUrl('', 'Luca Oyen')]: reply(429, 'Te druk', { 'Retry-After': '90' }),
    })

    servers.push(busy)

    const waiting = await lookUp(busy, ['Luca Oyen', 'Jacob Trenskow'])

    expect(waiting.warnings).toEqual([expect.stringMatching(/^Persons: Wikipedia asks us to wait .*Luca_Oyen/u)])
    expect(asked(busy)).toEqual(['/wiki/Luca_Oyen?action=raw'])
  })

  it('asks the title that stays for a title of the list of aliases, and not the alias', async () => {
    const server = await serve({ 'Jan Jansen (voetballer, 1990)': articleText })
    const found = await lookUp(
      server,
      ['Jan Jansen (voetballer)', 'Jan Jansen (voetballer, 1990)'],
      aliasMap([{ aliases: ['Jan Jansen (voetballer)'], title: 'Jan Jansen (voetballer, 1990)' }]),
    )

    expect(found.redirects).toEqual(new Map([['Jan Jansen (voetballer, 1990)', 'Jan Jansen (voetballer, 1990)']]))
    expect(asked(server)).toHaveLength(1)
  })
})

describe('describePersons', () => {
  it('says what was asked and made, and nothing when it was nothing', () => {
    expect(describePersons(680, { people: 650, titles: 700 })).toEqual([
      'persons: 680 titles asked, 650 new persons, 700 titles remembered',
    ])
    expect(describePersons(1, { people: 1, titles: 1 })).toEqual([
      'persons: 1 title asked, 1 new person, 1 title remembered',
    ])
    expect(describePersons(0, { people: 0, titles: 0 })).toEqual([])
  })
})

describe('similarPersons', () => {
  it('groups the persons whose titles are the same without accents, capitals, hyphens, spaces and apostrophes', async () => {
    await database.db
      .insert(persons)
      .values([
        { wikipediaPage: 'Daniël Jansen' },
        { wikipediaPage: "D'aniel Jan-sen" },
        { wikipediaPage: 'Johnny Jansen (1952)' },
        { wikipediaPage: 'Johnny Jansen (1975)' },
        { wikipediaPage: 'Luca Oyen' },
      ])

    expect(await similarPersons(database.db)).toEqual([['Daniël Jansen', "D'aniel Jan-sen"]])
  })

  it('warns with Persons: in front, and says nothing when no persons look alike', () => {
    expect(similarPersonsWarning([])).toBeUndefined()
    expect(similarPersonsWarning([['Daniël Jansen', 'Daniel Jansen']])).toBe(
      "Persons: 1 group of persons look alike and are not merged: 'Daniël Jansen' and 'Daniel Jansen'",
    )
    expect(similarPersonsWarning(Array.from({ length: 7 }, (_, index) => [`A${index}`, `a-${index}`]))).toMatch(
      /^Persons: 7 groups of persons look alike and are not merged: 'A0' and 'a-0', .*, …$/u,
    )
  })
})
