import type { NewMatch } from '@fansite/db/schema'
import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, clubs, matchEdits, matches } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Fetcher } from './fetcher.ts'

import { fillResultsFromCrossTables } from './fill-results-from-cross-tables.ts'

const eredivisie199091 = readFileSync(new URL('./fixtures/wikipedia-cross-table-1990-91.wiki', import.meta.url), 'utf8')
const origin = 'https://nl.wikipedia.org'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

/** A fetcher with the page of the season, or without one, that keeps what was asked. */
function fetcherOf(text?: string) {
  const asked: string[] = []
  const fetcher: Fetcher = {
    fetch: async (input) => {
      const url = String(input)

      asked.push(url)

      return text === undefined
        ? { kind: 'error', message: 'HTTP 404', reason: 'http-status', status: 404, url }
        : {
            body: new TextEncoder().encode(text),
            contentType: 'text/x-wiki',
            etag: null,
            kind: 'fetched',
            lastModified: null,
            url,
          }
    },
  }

  return { asked, fetcher }
}

describe('fillResultsFromCrossTables', () => {
  let adminId = 0
  let ajax = 0
  let feyenoord = 0
  let testdorp = 0

  const gap: Omit<NewMatch, 'clubId' | 'opponent' | 'round'> = {
    competition: 'Eredivisie',
    dataSource: 'oude-fansite',
    goalsAgainst: null,
    goalsFor: null,
    home: true,
    matchDate: '1990-09-01',
    season: '1990/91',
    status: 'scheduled',
  }
  const fill = (season = '1990/91', text: null | string = eredivisie199091) =>
    fillResultsFromCrossTables(database.db, fetcherOf(text ?? undefined).fetcher, season, { origin, pause: 0 })
  const rows = () => database.db.select().from(matches).orderBy(asc(matches.id))

  beforeEach(async () => {
    for (const table of ['match_edits', 'matches', 'club_names', 'clubs', 'admin_users']) {
      await database.pool.query(`DELETE FROM ${table}`)
    }
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'editor')")
    adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
    await database.db.insert(clubs).values([
      { name: 'Ajax', slug: 'ajax', wikipediaPage: 'AFC Ajax' },
      { name: 'Feyenoord', slug: 'feyenoord' },
      { name: 'Testdorp', slug: 'testdorp' },
    ])

    const found = await database.db.select().from(clubs)
    const id = (name: string) => found.find((row) => row.name === name)?.id ?? 0

    ;[ajax, feyenoord, testdorp] = [id('Ajax'), id('Feyenoord'), id('Testdorp')]
  })

  const insert = (values: Partial<NewMatch> & Pick<NewMatch, 'clubId' | 'opponent' | 'round'>) =>
    database.db.insert(matches).values({ ...gap, ...values })

  it('gives a match without a result the score of the table, at home and away, and nothing else', async () => {
    await insert({ clubId: ajax, opponent: 'Ajax', round: 'Speelronde 1' })
    await insert({
      clubId: ajax,
      home: false,
      matchDate: '1991-02-03',
      opponent: 'Ajax',
      round: 'Speelronde 2',
      status: 'result_unknown',
    })

    const report = await fill()

    expect(report.filled).toBe(2)
    expect(await rows()).toMatchObject([
      // The table has 1-4 for sc Heerenveen at home, and Ajax 4-0 at home: 0-4 for us away.
      { afterNinetyFor: null, goalsAgainst: 4, goalsFor: 1, resultSetAt: null, status: 'played' },
      { afterNinetyFor: null, goalsAgainst: 4, goalsFor: 0, resultSetAt: null, status: 'played' },
    ])
    expect((await rows()).every((row) => row.dataSource === 'oude-fansite' && row.goalsFor !== null)).toBe(true)
  })

  it('never overwrites a result that is there, from the old fansite, the editors or another source', async () => {
    // The table has 0-0 at home against Feyenoord, and 1-1 away.
    await insert({
      clubId: feyenoord,
      goalsAgainst: 1,
      goalsFor: 0,
      opponent: 'Feyenoord',
      round: 'Speelronde 1',
      status: 'played',
    })
    await insert({
      clubId: feyenoord,
      goalsAgainst: 3,
      goalsFor: 3,
      home: false,
      opponent: 'Feyenoord',
      round: 'Speelronde 2',
      status: 'played',
    })

    expect((await fill()).filled).toBe(0)
    expect(await rows()).toMatchObject([
      { goalsAgainst: 1, goalsFor: 0 },
      { goalsAgainst: 3, goalsFor: 3 },
    ])
  })

  it('leaves a match whose result the editors entered, a match of another source and a postponed one', async () => {
    await insert({ clubId: ajax, opponent: 'Ajax', round: 'Speelronde 1' })
    await insert({
      clubId: ajax,
      dataSource: 'wikipedia',
      dateText: '3 februari 1991',
      home: false,
      opponent: 'Ajax',
      round: 'Speelronde 2',
    })
    await insert({ clubId: feyenoord, opponent: 'Feyenoord', round: 'Speelronde 3', status: 'postponed' })

    const [edited] = await rows()

    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date('2026-11-09T10:00:00Z'),
      editedBy: adminId,
      matchId: edited!.id,
      resultEdited: true,
    })

    expect((await fill()).filled).toBe(0)
    expect(await rows()).toMatchObject([
      { goalsFor: null, status: 'scheduled' },
      { goalsFor: null, status: 'scheduled' },
      { goalsFor: null, status: 'postponed' },
    ])
  })

  it('changes nothing in a second run', async () => {
    await insert({ clubId: ajax, opponent: 'Ajax', round: 'Speelronde 1' })
    await fill()

    const before = await rows()
    const { asked, fetcher } = fetcherOf(eredivisie199091)
    const second = await fillResultsFromCrossTables(database.db, fetcher, '1990/91', { origin, pause: 0 })

    expect(second).toEqual({ filled: 0, lines: [] })
    expect(asked).toEqual([])
    expect(await rows()).toEqual(before)
  })

  it('names a match the table has nothing for, and one it could not read, and fills nothing', async () => {
    await insert({ clubId: testdorp, opponent: 'Testdorp', round: 'Speelronde 1' })
    // Against Ajax at home, but twice: the table cannot tell which.
    await insert({ clubId: ajax, opponent: 'Ajax', round: 'Speelronde 2' })
    await insert({ clubId: ajax, opponent: 'Ajax', round: 'Speelronde 3' })

    const report = await fill()

    expect(report.filled).toBe(0)
    const [first, second, third] = await rows()

    expect(report.lines).toEqual([
      `1990/91 Eredivisie Speelronde 1 against Testdorp (match ${first!.id}): left without a result, the cross table has no score for it`,
      `1990/91 Eredivisie Speelronde 2 against Ajax (match ${second!.id}): left without a result, a second match without one is against the same club`,
      `1990/91 Eredivisie Speelronde 3 against Ajax (match ${third!.id}): left without a result, a second match without one is against the same club`,
    ])
  })

  it('leaves the matches as they are when the page is not there, and asks nothing for another season', async () => {
    await insert({ clubId: ajax, opponent: 'Ajax', round: 'Speelronde 1' })

    const report = await fill('1990/91', null)

    expect(report.filled).toBe(0)
    expect(report.lines).toHaveLength(1)
    expect(report.lines[0]).toContain('the cross table could not be read')
    expect((await rows())[0]).toMatchObject({ goalsFor: null, status: 'scheduled' })

    const { asked, fetcher } = fetcherOf(eredivisie199091)

    expect(await fillResultsFromCrossTables(database.db, fetcher, '2007/08', { origin, pause: 0 })).toEqual({
      filled: 0,
      lines: [],
    })
    expect(asked).toEqual([])
  })
})
