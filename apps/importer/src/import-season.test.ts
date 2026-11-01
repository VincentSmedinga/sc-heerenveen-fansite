import type { TestDatabase } from '@fansite/db/test-database'

import { lockNameFor, withLock } from '@fansite/db/lock'
import { listSeasonMatches, listSeasonStandings, listWikipediaPages } from '@fansite/db/queries'
import { matches, matchGoals, matchImports, players, standings, wikipediaPages } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { importMatches, importPastSeason } from './import-matches.ts'
import { parseSeason, runSeasonImport, seasonUsage } from './import-season.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { showStatus } from './status.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Fri, 29 May 2026 08:00:00 GMT' }

/** Sunday 25 October 2026: the current season is 2026/27 and 2025/26 is over. */
const now = new Date('2026-10-25T12:00:00Z')

type Pages = { cup: string; programme: string; standings: string }

/** The pages of the season that is over, as Wikipedia has them. */
const lastSeason: Pages = {
  cup: fixture('wikipedia-season-cup.wiki'),
  programme: fixture('wikipedia-season-programme.wiki'),
  standings: fixture('wikipedia-season-standings.wiki'),
}

/** The pages of the current season. */
const thisSeason: Pages = {
  cup: fixture('wikipedia-cup.wiki'),
  programme: fixture('wikipedia-programme.wiki'),
  standings: fixture('wikipedia-standings.wiki'),
}

const past = '2025/26'
const current = '2026/27'

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
  for (const table of ['matches', 'players', 'standings', 'wikipedia_pages', 'match_imports', 'squad_imports']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Runs the command at the moment `now` against this server, and collects what it prints. */
async function runCommand(server: TestServer, argument: string | undefined) {
  const lines: string[] = []
  const code = await runSeasonImport(database.url, argument, {
    clock: () => now,
    makeFetcher: (robots) => fetcherFor([server], { robots }),
    wikipediaOrigin: server.origin,
    write: (line) => lines.push(line),
  })

  return { code, lines }
}

/**
 * Starts a web server that serves the pages of both seasons the way Wikipedia does. The page of
 * the play-offs is served for the season that is over only when the test gives it: the season
 * that is going has none yet, and Wikipedia answers 404 for a page that is not there.
 */
async function serve({
  last = lastSeason,
  now: thisOne = thisSeason,
  playoffs,
}: { last?: Pages; now?: Pages; playoffs?: string } = {}) {
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }

  for (const [season, pages] of [
    [past, last],
    [current, thisOne],
  ] as const) {
    for (const kind of ['cup', 'programme', 'standings'] as const) {
      routes[pageUrl('', pageTitles(season)[kind])] = reply(200, pages[kind], wiki)
    }
  }
  if (playoffs !== undefined) {
    routes[pageUrl('', pageTitles(past).playoffs)] = reply(200, playoffs, wiki)
  }

  const server = await startServer(routes)

  servers.push(server)

  return server
}

const pageRequests = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

/** Every row the import writes for a season, to see that a run changed none of them. */
async function rowsOf(season: string) {
  return {
    goals: (
      await database.db
        .select({ goal: matchGoals })
        .from(matchGoals)
        .innerJoin(matches, eq(matchGoals.matchId, matches.id))
        .where(eq(matches.season, season))
        .orderBy(asc(matchGoals.id))
    ).map((row) => ({ ...row.goal, id: 0, matchId: 0 })),
    health: await database.db.select().from(matchImports).where(eq(matchImports.season, season)),
    matches: (await database.db.select().from(matches).where(eq(matches.season, season)).orderBy(asc(matches.id))).map(
      (row) => ({ ...row, id: 0 }),
    ),
    pages: await database.db.select().from(wikipediaPages).where(eq(wikipediaPages.season, season)),
    standings: await database.db.select().from(standings).where(eq(standings.season, season)),
  }
}

describe('the season of the command', () => {
  it.each(['2025/26', '2024/25', '1999/00', '2009/10'])('accepts %s, a season that is over', (argument) => {
    expect(parseSeason(argument, now)).toEqual({ kind: 'season', season: argument })
  })

  it.each([
    [undefined, 'No season given'],
    ['', 'No season given'],
    ['2025', 'is not a season'],
    ['2025-26', 'is not a season'],
    ['2025/2026', 'is not a season'],
    ['25/26', 'is not a season'],
    ['2025/26 ', 'is not a season'],
    [' 2025/26', 'is not a season'],
    ['2025/26\n2024/25', 'is not a season'],
    ['2025/27', 'second year must follow the first'],
    ['2025/25', 'second year must follow the first'],
    ['2026/26', 'second year must follow the first'],
    ['2026/27', 'is the current season'],
    ['2027/28', 'has not started yet'],
    ['2030/31', 'has not started yet'],
  ])('refuses %j with a sentence and the usage', (argument, reason) => {
    const parsed = parseSeason(argument, now)

    expect(parsed.kind).toBe('refused')
    expect(parsed.kind === 'refused' ? parsed.message : '').toContain(reason)
    expect(parsed.kind === 'refused' ? parsed.message : '').toContain(seasonUsage)
  })

  it('moves on with the clock: on 1 July the season that just ended is over', () => {
    expect(parseSeason('2026/27', new Date('2027-06-30T12:00:00Z')).kind).toBe('refused')
    expect(parseSeason('2026/27', new Date('2027-07-01T00:00:00Z'))).toEqual({ kind: 'season', season: '2026/27' })
  })
})

describe('the command', () => {
  it('reads 2025/26 into the tables: 34 league matches, the cup, the goals and the table', async () => {
    const server = await serve()

    const { code, lines } = await runCommand(server, past)

    expect(code).toBe(0)
    expect(lines.flatMap((line) => line.split('\n')).filter((line) => !/: new (club|name) /u.test(line))).toEqual([
      'Matches 2025/26: 38 new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-05-17',
    ])
    expect(pageRequests(server)).toHaveLength(4)

    const stored = await database.db.select().from(matches).orderBy(asc(matches.matchDate))
    const league = stored.filter((match) => match.competition === 'Eredivisie')

    expect(stored.every((match) => match.season === past)).toBe(true)
    expect(league).toHaveLength(34)
    expect(league.filter((match) => match.home)).toHaveLength(17)
    expect(stored.filter((match) => match.competition === 'KNVB Beker')).toHaveLength(4)
    expect(stored.every((match) => match.status === 'played')).toBe(true)
    expect(league.find((match) => match.round === 'Speelronde 33')).toMatchObject({
      goalsAgainst: 2,
      goalsFor: 0,
      home: false,
      kickoffAt: new Date('2026-05-11T12:30:00Z'),
      matchDate: '2026-05-11',
      opponent: 'NAC Breda',
    })

    const table = await database.db.select().from(standings).orderBy(asc(standings.position))

    expect(table).toHaveLength(18)
    expect(table.every((row) => row.season === past && row.validOn === '2026-05-17')).toBe(true)
    expect(table[7]).toMatchObject({ club: 'sc Heerenveen', played: 34, points: 51, position: 8 })

    expect(await database.db.select().from(wikipediaPages).orderBy(asc(wikipediaPages.kind))).toMatchObject([
      { kind: 'standings', season: past, title: 'Eredivisie 2025/26 (mannenvoetbal)' },
      { kind: 'programme', season: past, title: 'Eredivisie 2025/26 (mannenvoetbal)/Wedstrijden' },
      { kind: 'cup', season: past, title: 'KNVB Beker 2025/26 (mannen)' },
    ])
    expect(await database.db.select().from(matchImports)).toMatchObject([
      { failuresInARow: 0, lastOutcome: 'imported', season: past },
    ])
  })

  it('reads the play-offs for the Conference League of a season that is over: the page of the year it ended in', async () => {
    const server = await serve({ playoffs: fixture('wikipedia-playoffs-2026.wiki') })

    const { code, lines } = await runCommand(server, past)

    expect(code).toBe(0)
    expect(lines.flatMap((line) => line.split('\n')).filter((line) => !/: new (club|name) /u.test(line))).toEqual([
      'Matches 2025/26: 39 new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-05-17',
    ])
    expect(pageRequests(server)).toContain('/wiki/Play-offs_Nederlands_voetbal_2026?action=raw')
    expect(
      await database.db.select().from(matches).where(eq(matches.competition, 'Play-offs Conference League')),
    ).toMatchObject([{ goalsAgainst: 3, goalsFor: 2, opponent: 'FC Utrecht', round: 'Halve finale', season: past }])
    expect(await database.db.select().from(wikipediaPages).where(eq(wikipediaPages.kind, 'playoffs'))).toMatchObject([
      { season: past, title: 'Play-offs Nederlands voetbal 2026' },
    ])
  })

  it.each(['2022-23', '2024-25'])('reads a season whose cup page has the older layout (%s)', async (cupSeason) => {
    const cup = fixture(`wikipedia-cup-${cupSeason}.wiki`)
    const server = await serve({ last: { ...lastSeason, cup } })

    const { code, lines } = await runCommand(server, past)
    const stored = await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))

    expect(code).toBe(0)
    expect(lines.flatMap((line) => line.split('\n')).filter((line) => !/: new (club|name) /u.test(line))).toEqual([
      `Matches 2025/26: ${34 + stored.length} new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-05-17`,
    ])
    expect(stored).toHaveLength(cupSeason === '2022-23' ? 4 : 3)
    expect(stored.every((match) => match.status === 'played')).toBe(true)
    expect(stored.find((match) => match.round === 'Eerste ronde')).toMatchObject(
      cupSeason === '2022-23'
        ? { extraTime: true, goalsAgainst: 2, goalsFor: 4, home: false, opponent: 'HSV Hoek' }
        : { extraTime: false, goalsAgainst: 2, goalsFor: 3, home: false, opponent: 'IJsselmeervogels' },
    )
  })

  it('stops with the name of the match when a cup score is of a layout we do not know, and writes nothing', async () => {
    const cup = fixture('wikipedia-cup-2022-23.wiki').replace('2 – 0 (0 – 0)', '2 – 0 [0 – 0]')
    const server = await serve({ last: { ...lastSeason, cup } })

    const { code, lines } = await runCommand(server, past)

    expect(code).toBe(1)
    expect(lines.join('\n')).toContain("Tweede ronde (KNVB Beker) has a score we do not know: '2 – 0 [0 – 0]'")
    expect(await database.db.select().from(matches)).toEqual([])
  })

  it('stores no squad, and no goal has a player, without an error or a warning', async () => {
    const server = await serve()

    await runCommand(server, past)

    const goals = await database.db.select().from(matchGoals)

    expect(goals.length).toBeGreaterThan(50)
    expect(goals.every((goal) => goal.playerId === null)).toBe(true)
    expect(goals.some((goal) => goal.ours && goal.wikipediaPage !== null)).toBe(true)
    expect(await database.db.select().from(players)).toEqual([])
    expect((await database.db.select().from(matchImports))[0]).toMatchObject({ lastError: null, lastWarning: null })

    const kemper = await database.db
      .select()
      .from(matchGoals)
      .innerJoin(matches, eq(matchGoals.matchId, matches.id))
      .where(eq(matches.round, 'Speelronde 33'))
      .orderBy(asc(matchGoals.id))

    expect(kemper.map((row) => [row.match_goals.player, row.match_goals.minute, row.match_goals.penalty])).toEqual([
      ['Kemper', 36, false],
      ['Kemper', 74, true],
    ])
  })

  it('changes nothing the second time: everything is unchanged', async () => {
    const server = await serve()

    await runCommand(server, past)

    const before = await rowsOf(past)
    const second = await runCommand(server, past)

    expect(second).toEqual({
      code: 0,
      lines: ['Matches 2025/26: 0 new, 0 updated, 38 unchanged, 0 removed; table of 18 clubs for 2026-05-17'],
    })
    expect(pageRequests(server)).toHaveLength(8)
    expect((await rowsOf(past)).matches).toEqual(before.matches)
    expect((await rowsOf(past)).goals).toEqual(before.goals)
  })

  it('leaves the rows of the current season alone, and the hourly import leaves 2025/26 alone', async () => {
    const server = await serve()
    const hourly = () => importMatches(database.db, fetcherFor([server]), { clock: () => now, origin: server.origin })

    expect((await hourly()).kind).toBe('imported')

    const current26 = await rowsOf(current)

    expect(current26.matches).toHaveLength(35)

    await runCommand(server, past)

    expect(await rowsOf(current)).toEqual(current26)

    const last = await rowsOf(past)

    // Later the hourly import reads the current season again, and not the one that is over.
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const requests = pageRequests(server).length

    expect(
      (await importMatches(database.db, fetcherFor([server]), { clock: () => later, origin: server.origin })).kind,
    ).toBe('imported')
    expect(
      pageRequests(server)
        .slice(requests)
        .every((path) => path?.includes('2026/27') || path?.includes('voetbal_2027')),
    ).toBe(true)
    expect(await rowsOf(past)).toEqual(last)
    expect((await rowsOf(current)).matches).toEqual(current26.matches)
  })

  it('refuses a wrong season before it asks Wikipedia or writes anything', async () => {
    const server = await serve()

    for (const argument of [undefined, 'abc', '2025/27', current, '2027/28']) {
      const { code, lines } = await runCommand(server, argument)

      expect(code).toBe(1)
      expect(lines.join('\n')).toContain(seasonUsage)
    }

    expect(server.paths()).toEqual([])
    expect(await database.db.select().from(matches)).toEqual([])
    expect(await database.db.select().from(matchImports)).toEqual([])
    expect(await database.db.select().from(wikipediaPages)).toEqual([])
  })

  it.each([current, '2027/28', '2025/xyz', '2025/27', '2025', ''])(
    'refuses %j even when the function is called directly',
    async (season) => {
      const server = await serve()
      const report = await importPastSeason(database.db, fetcherFor([server]), season, {
        clock: () => now,
        origin: server.origin,
      })

      expect(report).toMatchObject({ kind: 'error', season })
      expect(server.paths()).toEqual([])
    },
  )

  it('writes no health for a season it refuses', async () => {
    const server = await serve()

    await importPastSeason(database.db, fetcherFor([server]), current, { clock: () => now, origin: server.origin })
    expect(await database.db.select().from(matchImports)).toEqual([])
  })

  it('stops with an error that names the match when a stopped match has no later block, and writes nothing', async () => {
    const server = await serve({
      last: {
        ...lastSeason,
        programme: lastSeason.programme.replace(/\|date = 11 mei 2026<ref>[\s\S]*?\n\}\}\n/u, ''),
      },
    })

    expect(lastSeason.programme).not.toBe(
      lastSeason.programme.replace(/\|date = 11 mei 2026<ref>[\s\S]*?\n\}\}\n/u, ''),
    )

    const { code, lines } = await runCommand(server, past)

    expect(code).toBe(1)
    expect(lines.join('\n')).toContain('Speelronde 33 (Eredivisie) was stopped')
    expect(await database.db.select().from(matches)).toEqual([])
    expect(await database.db.select().from(standings)).toEqual([])
    expect(await database.db.select().from(matchImports)).toMatchObject([
      { failuresInARow: 1, lastOutcome: 'error', season: past },
    ])
  })

  it('does nothing while an import holds the lock, and says so', async () => {
    const server = await serve()
    const held = await withLock(database.pool, lockNameFor(database.url, 'import'), 0, () => runCommand(server, past))

    expect(held.ran && held.result.code).toBe(1)
    expect(held.ran && held.result.lines.join('\n')).toContain('An import is still running')
    expect(server.paths()).toEqual([])
    expect(await database.db.select().from(matches)).toEqual([])
  })
})

describe('the site', () => {
  it('asks for one season: with both seasons in the database it gets the rows of that season only', async () => {
    const server = await serve()

    await importMatches(database.db, fetcherFor([server]), { clock: () => now, origin: server.origin })
    await runCommand(server, past)

    const thisYear = await listSeasonMatches(database.db, current)
    const lastYear = await listSeasonMatches(database.db, past)

    expect(thisYear).toHaveLength(35)
    expect(lastYear).toHaveLength(38)
    expect(thisYear.every((match) => match.matchDate >= '2026-07-01' && match.matchDate < '2027-07-01')).toBe(true)
    expect(lastYear.every((match) => match.matchDate >= '2025-07-01' && match.matchDate < '2026-07-01')).toBe(true)
    expect(lastYear.flatMap((match) => match.goals).length).toBeGreaterThan(50)
    expect(await listSeasonStandings(database.db, current)).toHaveLength(18)
    expect((await listSeasonStandings(database.db, current)).every((row) => row.validOn === '2026-10-24')).toBe(true)
    expect((await listSeasonStandings(database.db, past)).every((row) => row.validOn === '2026-05-17')).toBe(true)
    expect((await listWikipediaPages(database.db, current)).map((page) => page.title)).toEqual([
      'Eredivisie 2026/27 (mannenvoetbal)',
      'Eredivisie 2026/27 (mannenvoetbal)/Wedstrijden',
      'KNVB Beker 2026/27 (mannen)',
    ])
    expect(await listWikipediaPages(database.db, 'Geen')).toEqual([])
  })
})

describe('the health and the status', () => {
  /** Runs `pnpm run import:status` at a moment and returns the exit code and the lines. */
  async function status(at: Date = now) {
    const lines: string[] = []
    const code = await showStatus(database.url, { clock: () => at, write: (line) => lines.push(line) })

    return { code, lines: lines.join('\n') }
  }

  it('says nothing about a season that is over, and a failed read of it makes nothing unhealthy', async () => {
    const server = await serve()
    const broken = await serve({ last: { ...lastSeason, programme: 'Geen wedstrijden meer.' } })

    // The current season is healthy; the season that is over fails three times in a row.
    await importMatches(database.db, fetcherFor([server]), { clock: () => now, origin: server.origin })

    for (let run = 0; run < 3; run++) {
      expect((await runCommand(broken, past)).code).toBe(1)
    }

    expect(await database.db.select().from(matchImports).where(eq(matchImports.season, past))).toMatchObject([
      { failuresInARow: 3, lastOutcome: 'error' },
    ])

    const { code, lines } = await status()

    expect(lines).toContain('Matches 2026/27 (Wikipedia): healthy')
    expect(lines).not.toContain('2025/26')
    expect(code).toBe(0)
  })

  it('shows the same status for the current season before and after the season that is over was read', async () => {
    const server = await serve()

    await importMatches(database.db, fetcherFor([server]), { clock: () => now, origin: server.origin })

    const before = await status()

    await runCommand(server, past)

    // The status of the current season is the same, and says nothing of the goals without a
    // player or the pages of the season that is over.
    expect(await status()).toEqual(before)
    expect(before.code).toBe(0)
    expect(before.lines).toContain('goals of ours without a player')
  })
})

describe('the program that starts it', () => {
  const script = fileURLToPath(new URL('./import.ts', import.meta.url))

  async function start(args: string[]) {
    try {
      const { stderr, stdout } = await promisify(execFile)(process.execPath, [script, ...args], {
        env: { ...process.env, DATABASE_URL: database.url },
      })

      return { code: 0, stderr, stdout }
    } catch (error) {
      const { code, stderr, stdout } = error as { code: number; stderr: string; stdout: string }

      return { code, stderr, stdout }
    }
  }

  it('shows how to use it when it gets no season, a wrong one or something else, without a request', async () => {
    // Each start is a process that loads TypeScript, so they run together and the test may take
    // longer than the usual 5 seconds on a busy machine.
    const [noSeason, wrong, stray, both, two] = await Promise.all([
      start(['--season']),
      start(['--season', '2025/27']),
      start(['2025/26']),
      start(['--season', '--status', '2025/26']),
      start(['--season', '2025/26', '2024/25']),
    ])

    expect([noSeason.code, wrong.code]).toEqual([1, 1])
    expect(noSeason.stdout).toContain(seasonUsage)
    expect(wrong.stdout).toContain('second year must follow the first')
    expect([stray.code, both.code, two.code]).toEqual([2, 2, 2])
    expect(stray.stderr).toContain(seasonUsage)
    expect(await database.db.select().from(matchImports)).toEqual([])
  }, 30_000)
})
