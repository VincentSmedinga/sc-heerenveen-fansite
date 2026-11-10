import type { SeasonCoverage } from '@fansite/db/season-coverage'
import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, persons, playerListTitles, players, sources, squadCompleteness } from '@fansite/db/schema'
import { seasonCoverageColumns } from '@fansite/db/season-coverage'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { coverageTable, showStatus } from './status.ts'
import { fetcherFor, reply, startServer, writeWithoutCoverage } from './test-server.ts'

const start = new Date('2026-10-22T10:07:00Z')

const feed =
  '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Een feed</title>' +
  '<item><title>Kop</title><link>https://krant.test/g1</link><guid>g1</guid></item></channel></rss>'

let database: TestDatabase
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
  await database.pool.query('DELETE FROM import_runs')
  await database.pool.query('DELETE FROM player_list_titles')
  await database.pool.query('DELETE FROM persons')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM wikidata_items')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/**
 * Starts a web server with a feed at `/rss/`, and puts it in the register under a source with
 * this name.
 */
async function addFeed(name: string, handler: Handler, { enabled = true } = {}) {
  const server = await startServer({ '/rss/': handler })

  servers.push(server)

  const [source] = await database.db
    .insert(sources)
    .values({ domain: `${name.toLowerCase()}.test`, enabled, kind: 'news', name })
    .$returningId()

  await database.db.insert(feeds).values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })

  return `${server.origin}/rss/`
}

function after(minutes: number) {
  return new Date(start.getTime() + minutes * 60 * 1000)
}

async function importAt(now: Date) {
  await runImport(database.url, {
    clock: () => now,
    makeFetcher: (robots) => fetcherFor(servers, { robots }),
    wikipediaOrigin: null,
    write: () => undefined,
  })
}

async function statusAt(now: Date) {
  const lines: string[] = []
  const code = await showStatus(database.url, { clock: () => now, write: writeWithoutCoverage(lines) })

  return { code, lines }
}

describe('the overview', () => {
  it('shows a broken feed as unhealthy after three runs, next to a feed that works, and exits with 1', async () => {
    const good = await addFeed('Krant', reply(200, feed, { 'Content-Type': 'text/xml' }))
    const broken = await addFeed('Kapot', reply(500, 'Kapot'))

    for (const minutes of [0, 15, 30]) {
      await importAt(after(minutes))
    }

    expect(await statusAt(after(31))).toEqual({
      code: 1,
      lines: [
        'Last run: started 2026-10-22 10:37:00 UTC, finished 2026-10-22 10:37:00 UTC',
        '',
        'Krant: healthy',
        `  feed: ${good}`,
        '  last success: 2026-10-22 10:37:00 UTC',
        '  failed runs in a row: 0',
        '  last error: none',
        '',
        'Kapot: unhealthy',
        `  feed: ${broken}`,
        '  last success: never',
        '  failed runs in a row: 3',
        '  last error: 2026-10-22 10:37:00 UTC, HTTP 500',
        '  next try from: 2026-10-22 11:36:00 UTC',
        '',
        'Unhealthy feeds: 1 of 2',
        '',
        'Matches 2026/27 (Wikipedia): not read yet',
        '',
        'Squad 2026/27 (Wikipedia): not read yet',
        '',
        'Completeness of the squad 2026/27: not calculated yet',
        '',
        'Person names: 0 from a sort key, 0 guessed, 0 from the list, 0 without a name',
        'Persons that look alike: 0',
        'Player list: not read yet',
        'Persons from Wikidata: 0 of 0 read, 0 to go',
        '  with a Q-number: 0, with a birth date: 0, with a nationality: 0',
        '  line: 0 from Wikidata, 0 from the squad, 0 set by hand, 0 without',
        '  persons per line: 0 doelman, 0 verdediger, 0 middenvelder, 0 aanvaller',
        '  country: 0 from Wikidata, 0 set by hand, 0 from the list of players, 0 from the squad, 0 from the old fansite, 0 without',
        'Formations of match reports: no report has a line-up yet',
      ],
    })
  })

  it('shows the chance that the squad of the current season is whole, and warns when the table of the selection says less than almost', async () => {
    const row = {
      bestSource: 'selectie' as const,
      calculatedAt: start,
      checks: [
        {
          detail: 'the list has 12 players, a squad has 20 or more',
          name: 'size' as const,
          outcome: 'failed' as const,
        },
      ],
      level: 'weinig' as const,
      playerCount: 12,
      probability: 20,
      season: '2026/27',
    }

    await database.db
      .insert(squadCompleteness)
      .values([row, { ...row, level: 'compleet', probability: 95, season: '2025/26' }])

    const { code, lines } = await statusAt(start)

    expect(code).toBe(0)
    expect(lines).toContain(
      'Completeness of the squad 2026/27: 20% weinig, 12 players, best source selectie, calculated 2026-10-22 10:07:00 UTC',
    )
    expect(lines).toContain(
      '  warning: the table of the selection should hold the whole squad, but the chance is weinig: the list has 12 players, a squad has 20 or more',
    )
    expect(lines.filter((line) => line.startsWith('Completeness'))).toHaveLength(1)

    await database.db.update(squadCompleteness).set({ level: 'bijna', probability: 60 })

    expect((await statusAt(start)).lines.some((line) => line.includes('warning: the table'))).toBe(false)
    await database.db.delete(squadCompleteness)
  })

  it('exits with 0 when every feed is healthy, also after a failure or two', async () => {
    await addFeed('Kapot', reply(500, 'Kapot'))

    await importAt(start)
    await importAt(after(15))

    const { code, lines } = await statusAt(after(16))

    expect(code).toBe(0)
    expect(lines).toContain('Kapot: healthy')
    expect(lines).toContain('  failed runs in a row: 2')
  })

  it('leaves out the feeds of a source that is switched off', async () => {
    await addFeed('Uit', reply(500, 'Kapot'), { enabled: false })

    expect(await statusAt(start)).toEqual({
      code: 0,
      lines: [
        'Last run: none yet',
        'There are no feeds: no source that is switched on has a feed. See `pnpm db:seed`.',
        '',
        'Matches 2026/27 (Wikipedia): not read yet',
        '',
        'Squad 2026/27 (Wikipedia): not read yet',
        '',
        'Completeness of the squad 2026/27: not calculated yet',
        '',
        'Person names: 0 from a sort key, 0 guessed, 0 from the list, 0 without a name',
        'Persons that look alike: 0',
        'Player list: not read yet',
        'Persons from Wikidata: 0 of 0 read, 0 to go',
        '  with a Q-number: 0, with a birth date: 0, with a nationality: 0',
        '  line: 0 from Wikidata, 0 from the squad, 0 set by hand, 0 without',
        '  persons per line: 0 doelman, 0 verdediger, 0 middenvelder, 0 aanvaller',
        '  country: 0 from Wikidata, 0 set by hand, 0 from the list of players, 0 from the squad, 0 from the old fansite, 0 without',
        'Formations of match reports: no report has a line-up yet',
      ],
    })
  })

  it('says which persons are not on the list of players and which titles of the list are no person of ours', async () => {
    await database.db.insert(persons).values([{ wikipediaPage: 'Gerrit Abma' }, { wikipediaPage: 'Iemand Anders' }])
    await database.db
      .insert(playerListTitles)
      .values(['Gerrit Abma', 'Luca Oyen'].map((title) => ({ readAt: new Date('2026-10-22T10:00:00Z'), title })))

    const lines = (await statusAt(start)).lines

    expect(lines).toContain('Player list: 2 titles, read 2026-10-22 10:00:00 UTC')
    expect(lines).toContain('  persons not on the list: 1 (Iemand Anders)')
    expect(lines).toContain('  titles on the list that are no person of ours: 1 (Luca Oyen)')
    expect(lines).toContain('  titles that differ in a sign: 0')
  })

  it('names a player twice in a season that was not merged, and says nothing without one', async () => {
    expect((await statusAt(start)).lines.join('\n')).not.toContain('Player twice')

    const [a, b] = (await database.db
      .insert(persons)
      .values([{ wikipediaPage: 'Uğur Yıldırım (a)' }, { wikipediaPage: 'Uğur Yıldırım (b)' }])
      .$returningId()) as [{ id: number }, { id: number }]

    await database.db.insert(players).values([
      { name: 'Uğur Yıldırım', personId: a.id, searchTerm: 'Yıldırım', season: '2004/05' },
      { name: 'Ugur Yildirim', personId: b.id, searchTerm: 'Yildirim', season: '2004/05' },
    ])

    try {
      expect((await statusAt(start)).lines).toContain(
        'Player twice: Uğur Yıldırım (2004/05), not merged because the rows are of different persons, or one has no person and could be either',
      )
    } finally {
      await database.pool.query('DELETE FROM players')
    }
  })

  it('says per season how many rows of the squad have no person, and nothing when all have one', async () => {
    expect((await statusAt(start)).lines.join('\n')).not.toContain('Players without a person')

    const [{ id }] = (await database.db.insert(persons).values({ wikipediaPage: 'Een Speler' }).$returningId()) as [
      { id: number },
    ]

    await database.db.insert(players).values([
      { name: 'Een Speler', personId: id, searchTerm: 'Speler', season: '2018/19' },
      { name: 'Zonder Een', searchTerm: 'Een', season: '2018/19' },
      { name: 'Zonder Twee', searchTerm: 'Twee', season: '2018/19' },
      { name: 'Met Persoon', personId: id, searchTerm: 'Persoon', season: '2020/21' },
    ])

    try {
      const lines = (await statusAt(start)).lines

      expect(lines).toContain('Players without a person 2018/19: 2 of 3: Zonder Een, Zonder Twee')
      expect(lines.join('\n')).not.toContain('Players without a person 2020/21')
    } finally {
      await database.pool.query('DELETE FROM players')
    }
  })

  it('shows how many persons are read from Wikidata and what they have', async () => {
    await database.pool.query("INSERT INTO wikidata_items (id, label) VALUES ('Q29999', 'Nederland')")
    await database.pool.query(
      `INSERT INTO persons (wikipedia_page, wikidata_id, birth_date, birth_date_precision, line, line_source, wikidata_read_at)
       VALUES ('A', 'Q1', '1990-01-01', 'year', 'doelman', 'wikidata', ?),
              ('B', NULL, NULL, NULL, NULL, NULL, ?),
              ('C', NULL, NULL, NULL, NULL, NULL, NULL)`,
      [start, start],
    )
    await database.pool.query(
      "INSERT INTO person_nationalities (person_id, position, item_id) SELECT id, 0, 'Q29999' FROM persons WHERE wikipedia_page = 'A'",
    )
    await database.pool.query(
      "UPDATE persons SET country = 'NL', country_source = 'wikidata' WHERE wikipedia_page = 'A'",
    )
    await database.pool.query("UPDATE persons SET country = 'BE', country_source = 'manual' WHERE wikipedia_page = 'B'")

    expect((await statusAt(start)).lines.slice(-6, -1)).toEqual([
      'Persons from Wikidata: 2 of 3 read, 1 to go',
      '  with a Q-number: 1, with a birth date: 1, with a nationality: 1',
      '  line: 1 from Wikidata, 0 from the squad, 0 set by hand, 2 without',
      '  persons per line: 1 doelman, 0 verdediger, 0 middenvelder, 0 aanvaller',
      '  country: 1 from Wikidata, 1 set by hand, 0 from the list of players, 0 from the squad, 0 from the old fansite, 1 without',
    ])
  })

  it('shows per season how many match reports have a line-up and a formation', async () => {
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")

    // Two matches of 2004/05: one with a formation for both teams, one with a formation for us.
    // One of 2003/04 without a formation. One of 2004/05 with a bench only, and one without a
    // report at all: neither counts.
    for (const [index, season] of ['2004/05', '2004/05', '2003/04', '2004/05', '2004/05'].entries()) {
      await database.pool.query(
        "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, match_date, date_text) VALUES (?, 'Eredivisie', ?, 'Testdorp FC', 1, 1, 'played', 1, 1, '2005-01-01', 'x')",
        [season, `Speelronde ${index + 1}`],
      )
    }
    await database.pool.query(
      `INSERT INTO match_reports (match_id, status, formation_ours, formation_opponent)
       VALUES (1, 'klaar', '4-3-3', '4-4-2'), (2, 'klaar', '4-3-3', NULL), (3, 'klaar', NULL, NULL), (4, 'bezig', '4-3-3', NULL)`,
    )
    await database.pool.query(
      `INSERT INTO match_appearances (match_id, ours, name, shirt_number, starter)
       VALUES (1, 1, 'Eigen', NULL, 1), (2, 1, 'Eigen', NULL, 1), (3, 1, 'Eigen', NULL, 1), (3, 0, 'Andere', NULL, 1),
              (4, 1, 'Eigen', NULL, 0)`,
    )

    expect((await statusAt(start)).lines.slice(-4)).toEqual([
      '  country: 0 from Wikidata, 0 set by hand, 0 from the list of players, 0 from the squad, 0 from the old fansite, 0 without',
      'Formations of match reports, by season, of the reports with a line-up:',
      '  2004/05: 2 with a line-up, 2 with a formation for us, 1 for the opponent',
      '  2003/04: 1 with a line-up, 0 with a formation for us, 0 for the opponent',
    ])
  })

  it('says when the last run has not finished', async () => {
    await database.pool.query('INSERT INTO import_runs (started_at) VALUES (?)', [start])

    expect((await statusAt(start)).lines[0]).toBe('Last run: started 2026-10-22 10:07:00 UTC, not finished')
  })

  it('ends with a line for each season since 1990/91, also for one without matches', async () => {
    const lines: string[] = []

    await showStatus(database.url, { clock: () => start, write: (line) => lines.push(line) })

    const table = lines.slice(lines.indexOf('Coverage per season:'))

    // The title, a line of the legend for each column, the headers and the 37 seasons.
    expect(table).toHaveLength(1 + 14 + 1 + 37)
    expect(table.slice(15, 17)).toEqual([
      '  season   wiki  old  edit  played  nolist  reports  att  ref  players  best  level  noscorer  table',
      '  1990/91     0    0     0       0       0      0/0    0    0        0  -     -             0  no   ',
    ])
    expect(table.at(-1)).toBe(
      '  2026/27     0    0     0       0       0      0/0    0    0        0  -     -             0  no   ',
    )
  })

  describe('the coverage table', () => {
    const season = (values: Partial<SeasonCoverage> & { season: string }): SeasonCoverage => ({
      goalsWithoutPlayer: 0,
      hasStanding: false,
      matchesBySource: { 'oude-fansite': 0, redactie: 0, wikipedia: 0 },
      matchesTotal: 0,
      played: 0,
      playedWithoutGoalList: 0,
      playerCount: 0,
      reports: 0,
      reportsDone: 0,
      squad: null,
      withAttendance: 0,
      withReferee: 0,
      ...values,
    })
    const lines = coverageTable([
      season({ season: '1990/91' }),
      season({
        goalsWithoutPlayer: 120,
        hasStanding: true,
        matchesBySource: { 'oude-fansite': 12345, redactie: 3, wikipedia: 38 },
        played: 38,
        reports: 38,
        reportsDone: 38,
        season: '2004/05',
        squad: { bestSource: 'selectie', level: 'compleet' },
      }),
    ])
    const legend = lines.slice(0, seasonCoverageColumns.length)
    const table = lines.slice(seasonCoverageColumns.length)

    it('gives each column a short header of its own', () => {
      const headers = seasonCoverageColumns.map((column) => column.header)

      expect(new Set(headers).size).toBe(headers.length)
      expect(headers.every((header) => /^[a-z]{1,8}$/.test(header))).toBe(true)
      expect(table[0]?.trim().split(/ +/)).toEqual(headers)
    })

    it('has a legend with a line for each column, the header padded to the longest one', () => {
      expect(legend).toHaveLength(14)
      expect(legend).toContain('edit      matches added by the editors')
      expect(legend).toContain('reports   match reports: done / all')
      expect(legend).toContain('noscorer  goals of ours without a player')
    })

    it('pads each column to its widest value, with two spaces between the columns', () => {
      expect(table).toEqual([
        'season   wiki    old  edit  played  nolist  reports  att  ref  players  best      level     noscorer  table',
        '1990/91     0      0     0       0       0      0/0    0    0        0  -         -                0  no   ',
        '2004/05    38  12345     3      38       0    38/38    0    0        0  selectie  compleet       120  yes  ',
      ])
      expect(new Set(table.map((line) => line.length)).size).toBe(1)
    })

    it('starts and ends each column at the same place in every line', () => {
      // A column of spaces in every line is a gap between two columns of the table.
      const gaps = (line: string) => [...line].map((character) => character === ' ')
      const shared = table.map(gaps).reduce((all, line) => all.map((gap, index) => gap && line[index] === true))
      const starts = shared.filter((gap, index) => !gap && (index === 0 || shared[index - 1] === true))

      expect(starts).toHaveLength(seasonCoverageColumns.length)
    })
  })

  it('changes nothing in the database', async () => {
    await addFeed('Kapot', reply(500, 'Kapot'))
    for (const minutes of [0, 15, 30]) {
      await importAt(after(minutes))
    }

    const everything = async () =>
      Promise.all(
        [
          'feeds',
          'import_runs',
          'import_results',
          'items',
          'match_changes',
          'match_imports',
          'matches',
          'players',
          'robots_txt',
          'sources',
          'squad_imports',
          'standings',
          'wikipedia_pages',
        ].map(async (table) => (await database.pool.query(`SELECT * FROM ${table}`))[0]),
      )
    const before = await everything()

    // Long after the last run, when a run would have removed old runs and tried the feed again.
    await statusAt(after(60 * 24 * 40))

    expect(await everything()).toEqual(before)
  })
})
