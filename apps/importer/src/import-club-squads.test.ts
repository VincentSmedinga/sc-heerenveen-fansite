import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, clubSquadImports, clubSquadPlayers, matches, persons } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { describeClubSquads, importClubSquads, readClubSquadEvery } from './import-club-squads.ts'
import { pageUrl } from './read-wikipedia.ts'
import { showStatus } from './status.ts'
import { articleRoutes } from './test-articles.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8' }

/** Sunday 25 October 2026, in the season 2026/27. */
const first = new Date('2026-10-25T12:00:00Z')

const days = (count: number) => count * 24 * 60 * 60 * 1000

let database: TestDatabase
let rounds = 0
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of [
    'club_squad_players',
    'club_squad_imports',
    'matches',
    'club_pages',
    'club_names',
    'clubs',
    'person_pages',
    'persons',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** A club that we play this season, with the title of its article. */
async function meet(name: string, page: null | string, season = '2026/27') {
  const [{ insertId }] = await database.db
    .insert(clubs)
    .values({ name, slug: name.toLowerCase().replace(/\W+/gu, '-'), wikipediaPage: page })

  await database.db.insert(matches).values({
    clubId: insertId,
    competition: 'Eredivisie',
    goalsAgainst: 0,
    goalsFor: 1,
    home: true,
    kickoffAt: new Date('2026-10-24T18:45:00Z'),
    matchDate: '2026-10-24',
    opponent: name,
    round: `Speelronde ${++rounds}`,
    season,
    status: 'played',
  })

  return insertId
}

/** A web server with the article of each club, which a test can change between runs. */
async function serve(pages: Record<string, null | string>) {
  const routes: Record<string, Handler> = {
    '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }),
    ...articleRoutes([], { titles: ['Karel Doelman', 'Jonas Stopper (voetballer, 1998)', 'Aron Aanvaller'] }),
  }

  for (const title of Object.keys(pages)) {
    routes[pageUrl('', title)] = (_request, response) => {
      const text = pages[title]

      response.writeHead(text === null || text === undefined ? 404 : 200, wiki)
      response.end(text ?? 'Niet gevonden')
    }
  }

  const server = await startServer(routes)

  servers.push(server)

  return server
}

const pageRequests = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

const clubRequests = (server: TestServer) => pageRequests(server).filter((path) => path?.includes('FC_Voorbeeld'))

function importAt(server: TestServer, at: Date) {
  return importClubSquads(database.db, fetcherFor([server]), { clock: () => at, origin: server.origin })
}

describe('the squad of a club we meet', () => {
  it('stores the players, with a person for each one with an article', async () => {
    const clubId = await meet('FC Voorbeeld', 'FC Voorbeeld')
    const server = await serve({ 'FC Voorbeeld': fixture('wikipedia-club-squad.wiki') })

    const report = await importAt(server, first)

    expect(report).toEqual({ clubs: 1, players: { added: 4, removed: 0, updated: 0 }, warnings: [] })
    expect(describeClubSquads(report)).toEqual(['Club squads: 1 club read, 4 players new, 0 updated, 0 removed'])

    const rows = await database.db
      .select({
        name: clubSquadPlayers.sourceName,
        person: clubSquadPlayers.personId,
        position: clubSquadPlayers.position,
        readAt: clubSquadPlayers.readAt,
        shirtNumber: clubSquadPlayers.shirtNumber,
      })
      .from(clubSquadPlayers)
      .where(eq(clubSquadPlayers.clubId, clubId))
      .orderBy(asc(clubSquadPlayers.id))

    expect(rows.map((row) => [row.name, row.position, row.shirtNumber, row.person !== null])).toEqual([
      ['Karel Doelman', 'doelman', 1, true],
      ['Jonas Stopper', 'verdediger', 4, true],
      ['Max Zonderartikel', 'middenvelder', 8, false],
      ['Aron Aanvaller', 'aanvaller', null, true],
    ])
    expect(rows.every((row) => row.readAt.getTime() === first.getTime())).toBe(true)

    const made = await database.db.select({ page: persons.wikipediaPage }).from(persons).orderBy(asc(persons.id))

    expect(made.map((person) => person.page).sort()).toEqual([
      'Aron Aanvaller',
      'Jonas Stopper (voetballer, 1998)',
      'Karel Doelman',
    ])
    expect(clubRequests(server)).toHaveLength(1)
  })

  it('has a health row for the club, which waits seven days', async () => {
    const clubId = await meet('FC Voorbeeld', 'FC Voorbeeld')
    const server = await serve({ 'FC Voorbeeld': fixture('wikipedia-club-squad.wiki') })

    await importAt(server, first)

    const [health] = await database.db.select().from(clubSquadImports).where(eq(clubSquadImports.clubId, clubId))

    expect(health).toMatchObject({ failuresInARow: 0, lastError: null, lastOutcome: 'imported' })
    expect(health?.lastSuccessAt?.getTime()).toBe(first.getTime())
    expect(health?.retryAt?.getTime()).toBe(first.getTime() + readClubSquadEvery)
  })

  it('asks nothing for a club that was read within seven days', async () => {
    await meet('FC Voorbeeld', 'FC Voorbeeld')

    const server = await serve({ 'FC Voorbeeld': fixture('wikipedia-club-squad.wiki') })

    await importAt(server, first)

    const before = server.paths().length
    const again = await importAt(server, new Date(first.getTime() + days(7) - 1000))

    expect(again).toEqual({ clubs: 0, players: { added: 0, removed: 0, updated: 0 }, warnings: [] })
    expect(describeClubSquads(again)).toEqual([])
    expect(server.paths()).toHaveLength(before)
  })

  it('updates the rows after seven days, removes a player who left and makes no doubles', async () => {
    const clubId = await meet('FC Voorbeeld', 'FC Voorbeeld')
    const pages = { 'FC Voorbeeld': fixture('wikipedia-club-squad.wiki') as null | string }
    const server = await serve(pages)

    await importAt(server, first)

    pages['FC Voorbeeld'] = fixture('wikipedia-club-squad-changed.wiki')

    const later = new Date(first.getTime() + days(7))
    const report = await importAt(server, later)

    expect(report.players).toEqual({ added: 0, removed: 1, updated: 1 })

    const rows = await database.db
      .select()
      .from(clubSquadPlayers)
      .where(eq(clubSquadPlayers.clubId, clubId))
      .orderBy(asc(clubSquadPlayers.id))

    expect(rows.map((row) => [row.sourceName, row.shirtNumber])).toEqual([
      ['Karel Doelman', 1],
      ['Jonas Stopper', 5],
      ['Max Zonderartikel', 8],
    ])
    expect(rows.every((row) => row.readAt.getTime() === later.getTime())).toBe(true)
    expect(await database.db.select().from(persons)).toHaveLength(3)
  })

  it('finds the row of a renamed player by the name of his person (#1697)', async () => {
    const clubId = await meet('FC Voorbeeld', 'FC Voorbeeld')
    const server = await serve({ 'FC Voorbeeld': fixture('wikipedia-club-squad.wiki') })

    await importAt(server, first)

    const rows = () => database.db.select().from(clubSquadPlayers).where(eq(clubSquadPlayers.clubId, clubId))
    const before = (await rows()).find((row) => row.personId !== null)!

    // The row has an older spelling of the source, and the person the name the table writes.
    await database.db
      .update(persons)
      .set({ name: before.sourceName, nameSource: 'redactie' })
      .where(eq(persons.id, before.personId!))
    await database.db
      .update(clubSquadPlayers)
      .set({ sourceName: 'Oude Schrijfwijze' })
      .where(eq(clubSquadPlayers.id, before.id))

    expect((await importAt(server, new Date(first.getTime() + days(7)))).players).toMatchObject({
      added: 0,
      removed: 0,
    })
    expect((await rows()).find((row) => row.id === before.id)?.sourceName).toBe(before.sourceName)
  })

  it('leaves the rows of a club whose article has no readable selection, with one line', async () => {
    const clubId = await meet('FC Voorbeeld', 'FC Voorbeeld')
    const pages = { 'FC Voorbeeld': fixture('wikipedia-club-squad.wiki') as null | string }
    const server = await serve(pages)

    await importAt(server, first)

    pages['FC Voorbeeld'] = fixture('wikipedia-club-without-squad.wiki')

    const report = await importAt(server, new Date(first.getTime() + days(7)))

    expect(describeClubSquads(report)).toEqual([
      'Club squads: warning, FC Voorbeeld: the article has no section Selectie, the rows stay',
    ])
    expect(await database.db.select().from(clubSquadPlayers).where(eq(clubSquadPlayers.clubId, clubId))).toHaveLength(4)

    const [health] = await database.db.select().from(clubSquadImports).where(eq(clubSquadImports.clubId, clubId))

    expect(health).toMatchObject({ failuresInARow: 1, lastOutcome: 'error' })
  })

  it('gives a line for a club whose article is not there', async () => {
    await meet('FC Voorbeeld', 'FC Voorbeeld')

    const server = await serve({ 'FC Voorbeeld': null })

    expect(describeClubSquads(await importAt(server, first))).toEqual([
      'Club squads: warning, FC Voorbeeld: the article does not exist, the rows stay',
    ])
  })

  it('reads no club without an article, and no club of another season', async () => {
    await meet('Zonder Artikel', null)
    await meet('FC Voorbeeld', 'FC Voorbeeld', '2025/26')

    const server = await serve({ 'FC Voorbeeld': fixture('wikipedia-club-squad.wiki') })

    expect(await importAt(server, first)).toEqual({
      clubs: 0,
      players: { added: 0, removed: 0, updated: 0 },
      warnings: [],
    })
    expect(pageRequests(server)).toEqual([])
  })

  it('stops at robots.txt and writes one line', async () => {
    await meet('FC Voorbeeld', 'FC Voorbeeld')

    const server = await startServer({
      '/robots.txt': reply(200, 'User-agent: *\nDisallow: /wiki/', { 'Content-Type': 'text/plain' }),
    })

    servers.push(server)

    const report = await importAt(server, first)

    expect(report.warnings).toHaveLength(1)
    expect(report.warnings[0]).toContain('robots.txt does not allow')
    expect(await database.db.select().from(clubSquadPlayers)).toEqual([])
  })
})

describe('the status', () => {
  it('names a club that keeps failing, and no club that is healthy', async () => {
    await meet('FC Voorbeeld', 'FC Voorbeeld')
    await meet('Gezonde Club', 'Gezonde Club')

    const server = await serve({
      'FC Voorbeeld': fixture('wikipedia-club-without-squad.wiki'),
      'Gezonde Club': fixture('wikipedia-club-squad.wiki'),
    })

    for (const day of [0, 7, 14]) {
      await importAt(server, new Date(first.getTime() + days(day)))
    }

    const lines: string[] = []

    await showStatus(database.url, {
      clock: () => new Date(first.getTime() + days(14)),
      write: (line) => lines.push(line),
    })

    const text = lines.join('\n')

    expect(text).toContain('Club squads: 2 clubs read, 1 unhealthy')
    expect(text).toContain('Club squad FC Voorbeeld (Wikipedia): unhealthy')
    expect(text).not.toContain('Club squad Gezonde Club')
  })
})
