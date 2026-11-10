import type { TestDatabase } from '@fansite/db/test-database'

import { createPersonBook, storePersonNames } from '@fansite/db/persons'
import { clubs, matches, matchGoals, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { personNameOf } from './person-name.ts'
import { aliasMap, chosenSpelling, personsWhoDiffer } from './person-names.ts'
import {
  describePersons,
  doublePlayers,
  lookUpPersonPages,
  mergeListedPersons,
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

    expect(found).toMatchObject({
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
    // The person has his name already, or the import would ask about his article once more.
    await storePersonNames(database.db, new Map([['Alfreð Finnbogason', personNameOf('Alfreð Finnbogason', null)]]))

    const server = await serve({ 'Alfred Finnbogason': '#REDIRECT [[Alfreð Finnbogason]]' })

    expect(await lookUp(server, ['Alfreð Finnbogason'])).toEqual({
      asked: 0,
      names: new Map(),
      redirects: new Map(),
      warnings: [],
    })
    expect(asked(server)).toEqual([])
    expect(await lookUp(server, ['Alfred Finnbogason'])).toMatchObject({
      asked: 1,
      redirects: new Map([['Alfred Finnbogason', 'Alfreð Finnbogason']]),
      warnings: [],
    })
    expect(asked(server)).toEqual(['/wiki/Alfred_Finnbogason?action=raw'])
  })

  it('takes a title without an article as it stands, with no warning', async () => {
    const server = await serve({ 'Luca Oyen': articleText, 'Rode Link': 404 })
    const found = await lookUp(server, ['Rode Link', 'Luca Oyen'])

    expect(found).toMatchObject({
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

  it('leaves out Jordy Bruijn and Jordy Buijs, and every group the owner said are different people', async () => {
    await database.db
      .insert(persons)
      .values([
        { wikipediaPage: 'Jordy Bruijn' },
        { wikipediaPage: 'Jordy Buijs' },
        { wikipediaPage: 'Daniël Jansen' },
        { wikipediaPage: 'Daniel Jansen' },
        { wikipediaPage: 'Luca Oyen' },
        { wikipediaPage: 'Luca Oÿen' },
      ])

    // The list of the import: the two Jordys are never a group.
    expect(personsWhoDiffer).toContainEqual(['Jordy Bruijn', 'Jordy Buijs'])
    expect(await similarPersons(database.db)).toEqual([
      ['Daniël Jansen', 'Daniel Jansen'],
      ['Luca Oyen', 'Luca Oÿen'],
    ])
    // A group whose titles are all in one group of the list is left out, in any order.
    expect(await similarPersons(database.db, [['Daniel Jansen', 'Daniël Jansen', 'Iemand Anders']])).toEqual([
      ['Luca Oyen', 'Luca Oÿen'],
    ])

    // A third person who looks like them is not in the list, so the whole group is back.
    await database.db.insert(persons).values({ wikipediaPage: 'Daniel Jan-sen' })
    expect(await similarPersons(database.db, [['Daniel Jansen', 'Daniël Jansen']])).toEqual([
      ['Daniël Jansen', 'Daniel Jansen', 'Daniel Jan-sen'],
      ['Luca Oyen', 'Luca Oÿen'],
    ])
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

describe('the names that lookUpPersonPages finds', () => {
  const key = (text: string) => `${articleText}\n{{DEFAULTSORT:${text}}}`

  it('reads the name from the sort key of the article it asks for, and guesses without one', async () => {
    const server = await serve({
      'Joost van Aken': key('Aken, Joost van'),
      'Ramon Zomer': articleText,
      'Rode Link': 404,
    })
    const found = await lookUp(server, ['Joost van Aken', 'Ramon Zomer', 'Rode Link'])

    expect(found.names.get('Joost van Aken')).toMatchObject({
      familyName: 'Aken',
      familyNamePrefix: 'van',
      givenName: 'Joost',
      source: 'sort_key',
    })
    expect(found.names.get('Ramon Zomer')).toMatchObject({ familyName: 'Zomer', givenName: 'Ramon', source: 'guess' })
    expect(found.names.get('Rode Link')).toMatchObject({ familyName: 'Link', source: 'guess' })
  })

  it('asks about a person without a name once more, and about nobody when every person has a name', async () => {
    const book = await createPersonBook(database.db, {
      redirects: new Map([['Joost van Aken', 'Joost van Aken']]),
    })

    await book.resolve('Joost van Aken')

    const server = await serve({ 'Joost van Aken': key('Aken, Joost van') })
    const first = await lookUp(server, ['Joost van Aken'])

    expect(first.asked).toBe(1)
    expect(asked(server)).toEqual(['/wiki/Joost_van_Aken?action=raw'])

    await storePersonNames(database.db, first.names)

    const second = await lookUp(server, ['Joost van Aken'])

    expect(second).toEqual({ asked: 0, names: new Map(), redirects: new Map(), warnings: [] })
    expect(asked(server)).toHaveLength(1)
    expect((await storePersonNames(database.db, second.names)).counts).toEqual({ guess: 0, manual: 0, sort_key: 0 })
  })
})

describe('mergeListedPersons', () => {
  it('merges the persons of the list, names a renamed person after the title that stays, and then says nothing', async () => {
    const [{ insertId: kept }] = await database.db.insert(persons).values({ wikipediaPage: 'Uğur Yıldırım' })

    await database.db
      .insert(persons)
      .values([
        { wikipediaPage: 'Ugur Yıldırım' },
        { name: 'Robert van der Berg', nameSource: 'guess', wikipediaPage: 'Robert van der Berg' },
        { wikipediaPage: 'Jordy Bruijn' },
        { wikipediaPage: 'Jordy Buijs' },
      ])

    expect(await mergeListedPersons(database.db)).toEqual([
      "Persons: 'Robert van der Berg' is now 'Robert van den Berg'",
      "Persons: 'Ugur Yıldırım' is merged into 'Uğur Yıldırım'",
    ])
    expect(await database.db.select().from(persons).orderBy(asc(persons.id))).toMatchObject([
      { id: kept, wikipediaPage: 'Uğur Yıldırım' },
      {
        familyName: 'Berg',
        familyNamePrefix: 'van den',
        givenName: 'Robert',
        name: 'Robert van den Berg',
        nameSource: 'guess',
        wikipediaPage: 'Robert van den Berg',
      },
      { wikipediaPage: 'Jordy Bruijn' },
      { wikipediaPage: 'Jordy Buijs' },
    ])
    expect(await mergeListedPersons(database.db)).toEqual([])
    expect(await similarPersons(database.db)).toEqual([])
  })
})

describe('mergeListedPersons for Filip Đuričić', () => {
  async function insertPerson(page: string) {
    const [{ id }] = (await database.db.insert(persons).values({ wikipediaPage: page }).$returningId()) as [
      { id: number },
    ]

    return id
  }

  async function insertGoal(personId: number, season: string, name: string) {
    const [{ id: clubId }] = (await database.db
      .insert(clubs)
      .values({ name: `Club ${season}`, slug: `club-${season.replace('/', '-')}` })
      .$returningId()) as [{ id: number }]
    const [{ id: matchId }] = (await database.db
      .insert(matches)
      .values({
        clubId,
        competition: 'Eredivisie',
        dateText: 'x',
        home: true,
        matchDate: `${season.slice(0, 4)}-09-01`,
        opponent: 'Club',
        round: `Speelronde ${season}`,
        season,
        status: 'scheduled',
      })
      .$returningId()) as [{ id: number }]

    await database.db.insert(players).values({ name, personId, searchTerm: 'Đuričić', season, wikipediaPage: name })
    await database.db.insert(matchGoals).values({ matchId, ours: true, personId, player: name })
  }

  afterEach(async () => {
    await database.pool.query('DELETE FROM match_goals')
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM players')
    await database.pool.query('DELETE FROM clubs')
  })

  it('points the goals, the players and the pages of both persons at the one that stays, and then says nothing', async () => {
    const kept = await insertPerson('Filip Đuričić')
    const gone = await insertPerson('Filip Djuričić')

    await insertGoal(kept, '2011/12', 'Filip Đuričić')
    await insertGoal(gone, '2010/11', 'Filip Djuričić')

    expect(await mergeListedPersons(database.db)).toContain("Persons: 'Filip Djuričić' is merged into 'Filip Đuričić'")
    expect(await database.db.select().from(persons)).toMatchObject([{ id: kept, wikipediaPage: 'Filip Đuričić' }])
    expect((await database.db.select().from(matchGoals)).map((goal) => goal.personId)).toEqual([kept, kept])
    expect((await database.db.select().from(players)).map((player) => player.personId)).toEqual([kept, kept])
    expect(await database.db.select().from(players).where(eq(players.season, '2010/11'))).toHaveLength(1)
    expect(await mergeListedPersons(database.db)).toEqual([])
  })

  it('gives the player of a scorer that Wikipedia links under the redirect the spelling that stays', async () => {
    // The person book follows the redirect, so there is one person already, and only the row of
    // the season in `players` still has the page and the name of the redirect.
    const kept = await insertPerson('Filip Đuričić')

    await insertGoal(kept, '2011/12', 'Filip Đuričić')
    await insertGoal(kept, '2010/11', 'Filip Djuričić')

    expect(await mergeListedPersons(database.db)).toEqual(['Players: Filip Djuričić (2010/11) is now Filip Đuričić'])
    expect(
      (await database.db.select().from(players).orderBy(asc(players.season))).map(
        (row) => `${row.season} ${row.name} ${row.wikipediaPage} ${row.personId === kept}`,
      ),
    ).toEqual(['2010/11 Filip Đuričić Filip Đuričić true', '2011/12 Filip Đuričić Filip Đuričić true'])
    expect((await database.db.select().from(matchGoals)).map((goal) => goal.personId)).toEqual([kept, kept])
    expect(await mergeListedPersons(database.db)).toEqual([])
  })

  it('merges the two rows of one season when the squad has the spelling that stays too', async () => {
    const kept = await insertPerson('Filip Đuričić')

    await insertGoal(kept, '2010/11', 'Filip Djuričić')

    const [old] = await database.db.select().from(players)

    await database.db.update(matchGoals).set({ playerId: old!.id })
    await database.db.insert(players).values({
      name: 'Filip Đuričić',
      personId: kept,
      searchTerm: 'Đuričić',
      season: '2010/11',
      wikipediaPage: 'Filip Đuričić',
    })

    expect(await mergeListedPersons(database.db)).toEqual([
      'Players: Filip Djuričić (2010/11) is merged into Filip Đuričić',
    ])
    expect(await database.db.select().from(players)).toHaveLength(1)
    expect((await database.db.select().from(matchGoals)).map((goal) => goal.playerId)).toEqual([
      (await database.db.select().from(players))[0]!.id,
    ])
  })

  it('renames a person who is alone under the old spelling, without a second person', async () => {
    const only = await insertPerson('Filip Djuričić')

    await insertGoal(only, '2010/11', 'Filip Djuričić')

    expect(await mergeListedPersons(database.db)).toContain("Persons: 'Filip Djuričić' is now 'Filip Đuričić'")
    expect(await database.db.select().from(persons)).toMatchObject([{ id: only, wikipediaPage: 'Filip Đuričić' }])
    expect(await mergeListedPersons(database.db)).toEqual([])
  })
})

describe('a player twice in a season', () => {
  afterEach(async () => {
    await database.pool.query('DELETE FROM match_goals')
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM players')
    await database.pool.query('DELETE FROM persons')
    await database.pool.query('DELETE FROM clubs')
  })

  async function person(page: string) {
    const [{ id }] = (await database.db.insert(persons).values({ wikipediaPage: page }).$returningId()) as [
      { id: number },
    ]

    return id
  }

  it('merges a row with a person into a row without one of the same name, keeps the goals and says nothing the second time', async () => {
    const id = await person('Youssef El Akchaoui')
    const [{ id: clubId }] = (await database.db
      .insert(clubs)
      .values({ name: 'Club', slug: 'club' })
      .$returningId()) as [{ id: number }]
    const [{ id: matchId }] = (await database.db
      .insert(matches)
      .values({
        clubId,
        competition: 'Eredivisie',
        dateText: 'x',
        home: true,
        matchDate: '2010-09-01',
        opponent: 'Club',
        round: 'Speelronde 1',
        season: '2010/11',
        status: 'scheduled',
      })
      .$returningId()) as [{ id: number }]

    await database.db.insert(players).values([
      { name: 'Youssef El Akchaoui', searchTerm: 'Akchaoui', season: '2010/11', source: 'selectie' },
      {
        name: 'Youssef El-Akchaoui',
        personId: id,
        searchTerm: 'Akchaoui',
        season: '2010/11',
        shirtNumber: 9,
        source: 'verslag',
        wikipediaPage: 'Youssef El-Akchaoui',
      },
    ])
    const [gone] = await database.db.select().from(players).where(eq(players.name, 'Youssef El-Akchaoui'))

    await database.db.insert(matchGoals).values({ matchId, ours: true, personId: id, player: 'x', playerId: gone!.id })

    expect(await mergeListedPersons(database.db)).toEqual([
      'Players: Youssef El-Akchaoui (2010/11) is merged into Youssef El Akchaoui',
    ])

    const rows = await database.db.select().from(players)

    expect(rows).toMatchObject([
      { name: 'Youssef El Akchaoui', personId: id, shirtNumber: 9, wikipediaPage: 'Youssef El-Akchaoui' },
    ])
    expect((await database.db.select().from(matchGoals))[0]!.playerId).toBe(rows[0]!.id)
    expect(await mergeListedPersons(database.db)).toEqual([])
  })

  it('merges two rows of one person with different names', async () => {
    const id = await person('Uğur Yıldırım')

    await database.db.insert(players).values([
      { name: 'Uğur Yıldırım', personId: id, searchTerm: 'Yıldırım', season: '2004/05', source: 'selectie' },
      { name: 'Ugur Yildirim', personId: id, searchTerm: 'Yildirim', season: '2004/05', source: 'verslag' },
    ])

    expect(await mergeListedPersons(database.db)).toEqual([
      'Players: Ugur Yildirim (2004/05) is merged into Uğur Yıldırım',
    ])
    expect(await database.db.select().from(players)).toHaveLength(1)
  })

  it('keeps two rows of one name that have two different persons, and the status names them', async () => {
    const a = await person('Uğur Yıldırım (a)')
    const b = await person('Uğur Yıldırım (b)')

    await database.db.insert(players).values([
      { name: 'Uğur Yıldırım', personId: a, searchTerm: 'Yıldırım', season: '2000/01' },
      { name: 'Ugur Yildirim', personId: b, searchTerm: 'Yildirim', season: '2000/01' },
    ])

    expect(await mergeListedPersons(database.db)).toEqual([])
    expect(await database.db.select().from(players)).toHaveLength(2)
    expect(await doublePlayers(database.db)).toMatchObject([{ name: 'Uğur Yıldırım', season: '2000/01' }])
  })

  it('lets what the editors set win over the row that goes', async () => {
    await database.db.insert(players).values([
      { name: 'Youssef El Akchaoui', searchTerm: 'Akchaoui', season: '2000/01', shirtNumber: 5, source: 'selectie' },
      {
        editorsFields: ['shirt_number'],
        name: 'Youssef El-Akchaoui',
        searchTerm: 'Akchaoui',
        season: '2000/01',
        shirtNumber: 7,
        source: 'verslag',
      },
    ])

    expect(await mergeListedPersons(database.db)).toHaveLength(1)
    expect(await database.db.select().from(players)).toMatchObject([{ shirtNumber: 7 }])
  })
})

describe('chosenSpelling', () => {
  it('gives a page and a name that the owner replaced the spelling that stays', () => {
    expect(chosenSpelling('Jan-Harm Schippers', 'Jan-Harm Schippers')).toEqual({
      name: 'Jan Harm Schippers',
      page: 'Jan Harm Schippers',
    })
    expect(chosenSpelling('Ugur Yıldırım', 'Uğur Yıldırım')).toEqual({ name: 'Uğur Yıldırım', page: 'Uğur Yıldırım' })
    expect(chosenSpelling('Filip Djuričić', null)).toEqual({ name: 'Filip Đuričić', page: null })
    expect(chosenSpelling('Radoslav Samardzic', null)).toEqual({ name: 'Radoslav Samardžić', page: null })
    // The page is replaced, and a name the table shows in its own way stays.
    expect(chosenSpelling('R. van der Berg', 'Robert van der Berg')).toEqual({
      name: 'R. van der Berg',
      page: 'Robert van den Berg',
    })
  })

  it('leaves every other player as he is, also a namesake with an article of his own', () => {
    expect(chosenSpelling('Luca Oyen', 'Luca Oyen')).toEqual({ name: 'Luca Oyen', page: 'Luca Oyen' })
    expect(chosenSpelling('Jordy Buijs', null)).toEqual({ name: 'Jordy Buijs', page: null })
    expect(chosenSpelling('Robert van der Berg', 'Robert van der Berg (hockeyer)')).toEqual({
      name: 'Robert van der Berg',
      page: 'Robert van der Berg (hockeyer)',
    })
    expect(chosenSpelling('Jan Jansen', 'Jan Jansen (a)', new Map([['Jan Jansen (a)', 'Jan Jansen (b)']]))).toEqual({
      name: 'Jan Jansen',
      page: 'Jan Jansen (b)',
    })
  })
})
