import type { TestDatabase } from '@fansite/db/test-database'

import { listGroupStandings } from '@fansite/db/queries'
import { clubs, groupStandings } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { groupStages, groupStagesOf, importGroupStages } from './import-group-standings.ts'
import { runSeasonImport } from './import-season.ts'
import { pageUrl } from './read-wikipedia.ts'
import { articleRoutes } from './test-articles.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8' }

const champions = fixture('wikipedia-group-stage-champions-league.wiki')

const first = new Date('2026-11-18T10:00:00Z')

const second = new Date('2026-11-19T10:00:00Z')

let database: TestDatabase
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['group_standings', 'matches', 'club_names', 'club_pages', 'clubs']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function run(server: TestServer, season: string, now = first) {
  return importGroupStages(database.db, fetcherFor([server]), season, server.origin, now)
}

async function serve(pages: Record<string, string>, redirects: Record<string, string> = {}) {
  const routes: Record<string, Handler> = {
    ...articleRoutes(Object.values(pages), { redirects, titles: Object.values(redirects) }),
    '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }),
  }

  for (const [title, text] of Object.entries(pages)) {
    routes[pageUrl('', title)] = reply(200, text, wiki)
  }

  const server = await startServer(routes)

  servers.push(server)

  return server
}

describe('the list of group stages', () => {
  it('has the group stages the issue names, each once, and none for another season', () => {
    expect(groupStages.map((stage) => `${stage.season} ${stage.competition}`)).toEqual([
      '1995/96 Intertoto Cup',
      '1996/97 Intertoto Cup',
      '1997/98 Intertoto Cup',
      '2000/01 Champions League',
      '2004/05 UEFA Cup',
      '2005/06 UEFA Cup',
      '2006/07 UEFA Cup',
      '2008/09 UEFA Cup',
      '2009/10 Europa League',
    ])
    expect(groupStagesOf('2010/11')).toEqual([])
  })
})

describe('importGroupStages', () => {
  it('stores the table of the group with its source, and the clubs of clubs', async () => {
    const server = await serve({ 'UEFA Champions League 2000/01': champions })
    const report = await run(server, '2000/01')

    expect(report.ok).toBe(true)
    expect(report.lines[0]).toBe('Group stage Champions League 2000/01: Groep C, 4 clubs, stored')

    const rows = await listGroupStandings(database.db, '2000/01')

    expect(rows.map((row) => `${row.position} ${row.club} ${row.points}`)).toEqual([
      '1 Valencia CF 13',
      '2 Olympique Lyonnais 9',
      '3 Olympiakos Piraeus 9',
      '4 sc Heerenveen 4',
    ])
    expect(rows[0]).toMatchObject({
      competition: 'Champions League',
      groupName: 'Groep C',
      language: 'nl',
      sourcePage: 'UEFA Champions League 2000/01',
    })
    // sc Heerenveen is no club of the clubs table, so its row has no club.
    const stored = await database.db.select().from(groupStandings).orderBy(asc(groupStandings.position))

    expect(stored.map((row) => row.clubId === null)).toEqual([false, false, false, true])
    expect(await database.db.select().from(clubs).where(eq(clubs.name, 'sc Heerenveen'))).toEqual([])
  })

  it('changes nothing in a second run but the day it was read', async () => {
    const server = await serve({ 'UEFA Champions League 2000/01': champions })

    await run(server, '2000/01')

    const before = await database.db.select().from(groupStandings).orderBy(asc(groupStandings.position))
    const again = await run(server, '2000/01', second)
    const after = await database.db.select().from(groupStandings).orderBy(asc(groupStandings.position))

    expect(again.lines[0]).toBe('Group stage Champions League 2000/01: Groep C, 4 clubs, unchanged')
    expect(after.map((row) => ({ ...row, readAt: 0 }))).toEqual(before.map((row) => ({ ...row, readAt: 0 })))
    expect(after.every((row) => row.readAt.getTime() === second.getTime())).toBe(true)
    expect(await database.db.select().from(clubs)).toHaveLength(3)
  })

  it('gives a club whose title redirects the club we have, and makes no second one', async () => {
    const [{ insertId }] = await database.db
      .insert(clubs)
      .values({ name: 'Valencia', slug: 'valencia', wikipediaPage: 'Valencia CF (voetbalclub)' })
    const server = await serve(
      { 'UEFA Champions League 2000/01': champions },
      { 'Valencia CF': 'Valencia CF (voetbalclub)' },
    )

    const report = await run(server, '2000/01')

    expect(report.ok, report.lines.join('\n')).toBe(true)

    const [row] = await database.db.select().from(groupStandings).where(eq(groupStandings.position, 1))

    expect(row?.clubId).toBe(insertId)
    expect(await database.db.select().from(clubs).where(eq(clubs.slug, 'valencia-cf'))).toEqual([])
    expect((await listGroupStandings(database.db, '2000/01'))[0]?.club).toBe('Valencia')
  })

  it('replaces the table when the page changes', async () => {
    await run(await serve({ 'UEFA Champions League 2000/01': champions }), '2000/01')

    const changed = champions.replace("|'''13'''||6||4||1||1||7||4||+3", "|'''13'''||6||4||1||1||8||5||+3")
    const report = await run(await serve({ 'UEFA Champions League 2000/01': changed }), '2000/01', second)

    expect(report.lines[0]).toContain('stored')
    expect((await listGroupStandings(database.db, '2000/01'))[0]).toMatchObject({ goalsAgainst: 5, goalsFor: 8 })
  })

  it('asks for no page in a season without a group stage', async () => {
    const server = await serve({})

    expect(await run(server, '2010/11')).toEqual({ lines: [], ok: true })
    expect(server.paths()).toEqual([])
  })

  it('writes a line in the log and no table when the page has none', async () => {
    const server = await serve({ 'UEFA Champions League 2000/01': '==Voorronde==\nNog geen groepen.' })
    const report = await run(server, '2000/01')

    expect(report.ok).toBe(false)
    expect(report.lines).toEqual([
      'Group stage Champions League 2000/01: no table stored, the page UEFA Champions League 2000/01 has no table of a group with sc Heerenveen',
    ])
    expect(await listGroupStandings(database.db, '2000/01')).toEqual([])
  })

  it('names the club when the numbers of the page do not add up, and keeps the table it has', async () => {
    await run(await serve({ 'UEFA Champions League 2000/01': champions }), '2000/01')

    const broken = champions.replace("|'''4'''||6||1||1||4||3||9||−6", "|'''5'''||6||1||1||4||3||9||−6")
    const report = await run(await serve({ 'UEFA Champions League 2000/01': broken }), '2000/01', second)

    expect(report.ok).toBe(false)
    expect(report.lines[0]).toContain('sc Heerenveen has 5 points, but 1 won and 1 drawn is 4')
    expect((await listGroupStandings(database.db, '2000/01')).map((row) => row.points)).toEqual([13, 9, 9, 4])
  })

  it('writes a line when the page cannot be fetched', async () => {
    const report = await run(await serve({}), '2000/01')

    expect(report.ok).toBe(false)
    expect(report.lines[0]).toMatch(
      /^Group stage Champions League 2000\/01: not read, UEFA Champions League 2000\/01: /u,
    )
  })
})

describe('the command for a season', () => {
  it('reads the group stage after the matches and says what it stored', async () => {
    const server = await serve({ 'UEFA Champions League 2000/01': champions })
    const lines: string[] = []

    await runSeasonImport(database.url, '2000/01', {
      clock: () => first,
      makeFetcher: (robots) => fetcherFor([server], { robots }),
      wikipediaOrigin: server.origin,
      write: (line) => lines.push(line),
    })

    expect(lines).toContain('Group stage Champions League 2000/01: Groep C, 4 clubs, stored')
    expect(await listGroupStandings(database.db, '2000/01')).toHaveLength(4)
  })
})
