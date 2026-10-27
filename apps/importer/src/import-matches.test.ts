import type { TestDatabase } from '@fansite/db/test-database'

import {
  feeds,
  items,
  matches,
  matchGoals,
  matchImports,
  players,
  sources,
  squadImports,
  standings,
  wikipediaPages,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { and, asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { LinkedGoal } from './import-matches.ts'
import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { formatMatchReport, importMatches, unlinkedWarning } from './import-matches.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { showStatus } from './status.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Wed, 21 Oct 2026 14:40:44 GMT' }

/** Sunday 25 October 2026, after the table was updated for the 10th round. */
const first = new Date('2026-10-25T12:00:00Z')

const hours = (count: number) => count * 60 * 60 * 1000

type Pages = { cup: string; programme: string; standings: string }

const original: Pages = {
  cup: fixture('wikipedia-cup.wiki'),
  programme: fixture('wikipedia-programme.wiki'),
  standings: fixture('wikipedia-standings.wiki'),
}

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
  for (const table of [
    'matches',
    'players',
    'standings',
    'wikipedia_pages',
    'match_imports',
    'squad_imports',
    'sources',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Runs the match import at this moment against this server. */
function importAt(server: TestServer, at: Date) {
  return importMatches(database.db, fetcherFor([server]), { clock: () => at, origin: server.origin })
}

/** The requests for the three pages so far; the robots.txt is not counted. */
function pageRequests(server: TestServer) {
  return server.paths().filter((path) => path !== '/robots.txt')
}

/** A page of the season, served the way Wikipedia serves the raw text. */
function route(season: string, kind: keyof Pages, handler: Handler) {
  const path = pageUrl('', pageTitles(season)[kind])

  return { [path]: handler }
}

/**
 * Starts a web server on this computer that serves the three pages of the seasons as Wikipedia
 * does, from `pages`, which a test can change between runs. The tests ask no real site.
 */
async function serve(pages: { [Kind in keyof Pages]?: null | string } = {}, { robots = '' } = {}) {
  const current = { ...original, ...pages } as Pages
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, robots, { 'Content-Type': 'text/plain' }) }

  for (const season of ['2026/27', '2027/28']) {
    for (const kind of ['cup', 'programme', 'standings'] as const) {
      Object.assign(
        routes,
        route(season, kind, (_request, response) => {
          const text: null | string = current[kind]

          response.writeHead(text === null ? 404 : 200, wiki)
          response.end(text ?? 'Niet gevonden')
        }),
      )
    }
  }

  const server = await startServer(routes)

  servers.push(server)

  return { pages: current, server }
}

/** Everything the import writes, to see that a failing run changed none of it. */
async function snapshot() {
  return {
    matches: await database.db.select().from(matches).orderBy(asc(matches.id)),
    pages: await database.db.select().from(wikipediaPages).orderBy(asc(wikipediaPages.title)),
    standings: await database.db.select().from(standings).orderBy(asc(standings.season), asc(standings.position)),
  }
}

const season = '2026/27'

describe('the first import, into an empty database', () => {
  it('stores the programme, the results, the cup tie and the table, and the pages it read', async () => {
    const { server } = await serve()

    const report = await importAt(server, first)

    expect(report).toEqual({
      kind: 'imported',
      matches: { added: 35, removed: 0, unchanged: 0, updated: 0 },
      season,
      standings: 18,
      validOn: '2026-10-24',
      warnings: [],
    })
    expect(formatMatchReport(report)).toBe(
      'Matches 2026/27: 35 new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-10-24',
    )

    const stored = await database.db.select().from(matches).orderBy(asc(matches.matchDate))

    expect(stored).toHaveLength(35)
    expect(stored.filter((match) => match.competition === 'Eredivisie')).toHaveLength(34)
    expect(stored.filter((match) => match.competition === 'Eredivisie' && match.home)).toHaveLength(17)
    expect(stored.every((match) => match.season === season)).toBe(true)

    expect((await database.db.select().from(standings)).map((row) => row.validOn)).toEqual(Array(18).fill('2026-10-24'))
    expect(await database.db.select().from(wikipediaPages).orderBy(asc(wikipediaPages.kind))).toEqual([
      {
        kind: 'standings',
        readAt: first,
        season,
        title: 'Eredivisie 2026/27 (mannenvoetbal)',
        version: wiki['Last-Modified'],
      },
      {
        kind: 'programme',
        readAt: first,
        season,
        title: 'Eredivisie 2026/27 (mannenvoetbal)/Wedstrijden',
        version: wiki['Last-Modified'],
      },
      { kind: 'cup', readAt: first, season, title: 'KNVB Beker 2026/27 (mannen)', version: wiki['Last-Modified'] },
    ])
  })

  it('keeps a played match, a match with a time, one without a time, a postponed one and a cup tie as they are', async () => {
    const programme = original.programme.replace(/(\|team2 = \[\[Feyenoord\]\]\n)/u, '$1')
    // The match against Feyenoord at home, called off.
    const postponed = programme.replace(
      /(\|date = 8 november 2026\n\|time = )12:15 uur(\n\|team1 = \[\[sc Heerenveen\]\]\n\|score = ) – /u,
      '$1$2Uitgesteld',
    )
    const { server } = await serve({ programme: postponed })

    await importAt(server, first)

    const stored = (status: string) =>
      database.db
        .select()
        .from(matches)
        .where(eq(matches.status, status as 'played'))
        .orderBy(asc(matches.matchDate))

    expect((await stored('played'))[0]).toMatchObject({
      competition: 'Eredivisie',
      dateText: null,
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      opponent: 'FC Twente',
      resultSetAt: first,
      round: 'Speelronde 1',
      stadium: 'Abe Lenstra Stadion',
    })
    expect(await stored('played')).toHaveLength(10)

    const scheduled = await stored('scheduled')
    const withTime = scheduled.find((match) => match.round === 'Speelronde 11')
    const withoutTime = scheduled.find((match) => match.round === 'Speelronde 22')
    const tie = scheduled.find((match) => match.competition === 'KNVB Beker')

    expect(withTime).toMatchObject({
      dateText: null,
      goalsFor: null,
      kickoffAt: new Date('2026-10-31T17:45:00Z'),
      resultSetAt: null,
    })
    expect(withoutTime).toMatchObject({ dateText: '12-14 februari 2027', kickoffAt: null, matchDate: '2027-02-12' })
    expect(tie).toMatchObject({
      home: false,
      kickoffAt: new Date('2026-10-28T20:00:00Z'),
      opponent: 'Excelsior Maassluis',
      round: 'Eerste ronde',
      stadium: 'Sportpark Dijkpolder',
    })
    expect(await stored('postponed')).toMatchObject([{ goalsFor: null, opponent: 'Feyenoord', round: 'Speelronde 12' }])
  })

  it('fetches only /wiki/<page>?action=raw, once for each page, with the user agent of the importer', async () => {
    const { server } = await serve()

    await importAt(server, first)

    expect(pageRequests(server)).toEqual([
      '/wiki/Eredivisie_2026/27_(mannenvoetbal)/Wedstrijden?action=raw',
      '/wiki/Eredivisie_2026/27_(mannenvoetbal)?action=raw',
      '/wiki/KNVB_Beker_2026/27_(mannen)?action=raw',
    ])
    expect(server.requests.every((request) => request.url?.startsWith('/w/') === false)).toBe(true)
    expect(String(server.requests[0]?.headers['user-agent'])).toMatch(
      /^scHeerenveenFansite\/.+ \(\+https:\/\/github\.com\//u,
    )
  })

  it('records the health of the import', async () => {
    const { server } = await serve()

    await importAt(server, first)

    expect(await database.db.select().from(matchImports)).toEqual([
      {
        failuresInARow: 0,
        lastError: null,
        lastErrorAt: null,
        lastOutcome: 'imported',
        lastSuccessAt: first,
        lastWarning: null,
        lastWarningAt: null,
        retryAt: new Date(first.getTime() + 59 * 60 * 1000),
        season,
      },
    ])
  })
})

describe('reading again', () => {
  it('reads at most once an hour, and then finds nothing changed', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const requests = pageRequests(server).length
    const early = await importAt(server, new Date(first.getTime() + 30 * 60 * 1000))

    expect(early).toMatchObject({ kind: 'postponed', retryAt: new Date(first.getTime() + 59 * 60 * 1000) })
    expect(pageRequests(server)).toHaveLength(requests)

    const later = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(later).toMatchObject({ kind: 'imported', matches: { added: 0, removed: 0, unchanged: 35, updated: 0 } })
    expect(pageRequests(server)).toHaveLength(requests * 2)
    expect(await database.db.select().from(matches)).toHaveLength(35)
  })

  it('takes over a new kick-off, a new score and a removed match, and keeps the rest', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)

    // The time of the match against N.E.C. changes, and the cup page forgets our tie.
    pages.programme = pages.programme.replace(
      '|time = 18:45 uur\n|team1 = [[sc Heerenveen]]\n|score =  – \n|team2 = [[N.E.C.]]',
      '|time = 20:00 uur\n|team1 = [[sc Heerenveen]]\n|score =  – \n|team2 = [[N.E.C.]]',
    )
    pages.cup = pages.cup.replace('[[sc Heerenveen]]', '[[FC Volendam]]')

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 0, removed: 1, unchanged: 33, updated: 1 } })
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 11'))).toMatchObject([
      { kickoffAt: new Date('2026-10-31T19:00:00Z') },
    ])
    expect(await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))).toEqual([])
  })

  it('takes over a new date for a postponed match', async () => {
    const postponed = original.programme.replace(
      /(\|date = 8 november 2026\n\|time = )12:15 uur(\n\|team1 = \[\[sc Heerenveen\]\]\n\|score = ) – /u,
      '$1$2Uitgesteld',
    )
    const { pages, server } = await serve({ programme: postponed })

    await importAt(server, first)
    pages.programme = original.programme.replace(
      '|date = 8 november 2026\n|time = 12:15 uur',
      '|date = 20 januari 2027\n|time = 20:00 uur',
    )
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 12'))).toMatchObject([
      { kickoffAt: new Date('2027-01-20T19:00:00Z'), status: 'scheduled' },
    ])
  })
})

describe('extra time and a shoot-out in the cup', () => {
  const extraTimeCup = fixture('wikipedia-cup-extra-time.wiki')
  /** The shoot-out of the second round as it was before it was on the page. */
  const withoutShootOut = (cup: string) => cup.replace('|penaltyscore = 4&nbsp;–&nbsp;3\n', '')

  it('stores the extra time and the shoot-out of the three cup ties, from our side', async () => {
    const { server } = await serve({ cup: extraTimeCup })

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported', matches: { added: 37 }, warnings: [] })

    const cup = await database.db
      .select()
      .from(matches)
      .where(eq(matches.competition, 'KNVB Beker'))
      .orderBy(asc(matches.matchDate))

    expect(
      cup.map((match) => [
        match.round,
        match.extraTime,
        match.goalsFor,
        match.goalsAgainst,
        match.penaltiesFor,
        match.penaltiesAgainst,
      ]),
    ).toEqual([
      ['Eerste ronde', true, 2, 1, null, null],
      ['Tweede ronde', true, 1, 1, 4, 3],
      ['Achtste finale', true, 2, 2, 4, 5],
    ])
  })

  it('takes the shoot-out over when it comes on the page later, without a warning, and changes nothing else', async () => {
    const { pages, server } = await serve({ cup: withoutShootOut(extraTimeCup) })

    await importAt(server, first)
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Tweede ronde'))).toMatchObject([
      { extraTime: true, penaltiesAgainst: null, penaltiesFor: null, resultSetAt: first },
    ])

    pages.cup = extraTimeCup

    const report = await importAt(server, new Date(first.getTime() + 5 * 24 * hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { unchanged: 36, updated: 1 }, warnings: [] })
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Tweede ronde'))).toMatchObject([
      { extraTime: true, penaltiesAgainst: 3, penaltiesFor: 4, resultSetAt: first },
    ])
  })

  it('warns, with the shoot-out in it, when a shoot-out that had stood for days changes', async () => {
    const { pages, server } = await serve({ cup: extraTimeCup })

    await importAt(server, first)
    pages.cup = extraTimeCup.replace('|penaltyscore = 4&nbsp;–&nbsp;3', '|penaltyscore = 3&nbsp;–&nbsp;4')

    const report = await importAt(server, new Date(first.getTime() + 4 * 24 * hours(1)))

    expect(report).toMatchObject({
      kind: 'imported',
      warnings: [
        'the result of Tweede ronde (KNVB Beker) changed after 4 days, from sc Heerenveen 1-1 Voorbeeld United (penalties 4-3) to sc Heerenveen 1-1 Voorbeeld United (penalties 3-4)',
      ],
    })
  })

  const failures: [string, (pages: Pages) => Partial<Pages>, string][] = [
    [
      'a score of the shoot-out that cannot be read',
      () => ({ cup: extraTimeCup.replace('|penaltyscore = 4&nbsp;–&nbsp;3', '|penaltyscore = vier – drie') }),
      'a shoot-out score we do not know',
    ],
    [
      'a shoot-out after a score that is not level',
      () => ({
        cup: extraTimeCup.replace(
          '|score = 1&nbsp;–&nbsp;1\n|half time score = 0&nbsp;–&nbsp;0, 0',
          '|score = 2&nbsp;–&nbsp;1\n|half time score = 0&nbsp;–&nbsp;0, 0',
        ),
      }),
      'a shoot-out but no level score',
    ],
    [
      'extra time in a league match',
      (pages) => ({ programme: pages.programme.replace('|score = 1 – 0', '|score = 1 – 0\n|aet = J') }),
      'which only the cup has',
    ],
  ]

  it.each(failures)('leaves the last good copy and says why: %s', async (_name, change, reason) => {
    const { pages, server } = await serve({ cup: extraTimeCup })

    await importAt(server, first)

    const before = await snapshot()

    Object.assign(pages, change(pages))

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report.kind).toBe('error')
    expect(formatMatchReport(report)).toContain(reason)
    expect(await snapshot()).toEqual(before)
  })
})

describe('the goal scorers', () => {
  const goalsCup = fixture('wikipedia-cup-goals.wiki')
  const scorersOf = async (round: string) =>
    (
      await database.db
        .select({ goal: matchGoals })
        .from(matchGoals)
        .innerJoin(matches, eq(matchGoals.matchId, matches.id))
        .where(eq(matches.round, round))
        .orderBy(asc(matchGoals.id))
    ).map(({ goal }) => [goal.minute, goal.stoppageMinutes, goal.player, goal.ours, goal.ownGoal, goal.penalty])
  const goalIds = async () =>
    (await database.db.select({ id: matchGoals.id }).from(matchGoals).orderBy(asc(matchGoals.id))).map((row) => row.id)
  /** The scorers of the match against Ajax, as the page has them. */
  const ajaxHome = '[[Bernt Klaverboer|Klaverboer]] {{goal|7|e.d.}}<br />[[Abdellah Ouazane|Ouazane]] {{goal|33}}'
  const ajaxAway = '{{goal|45}} [[Jacob Trenskow|Trenskow]]<br />{{goal|82}} [[Maxence Rivera|Rivera]]'

  it('stores the scorers of the played matches in the order of the clock, with the club, an own goal and a penalty', async () => {
    const { server } = await serve()

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported', warnings: [] })
    expect(await scorersOf('Speelronde 2')).toEqual([
      [7, null, 'Klaverboer', false, true, false],
      [33, null, 'Ouazane', false, false, false],
      [45, null, 'Trenskow', true, false, false],
      [82, null, 'Rivera', true, false, false],
    ])
    expect(await scorersOf('Speelronde 9')).toEqual([
      [11, null, 'Vente', true, false, true],
      [54, null, 'Braude', true, false, false],
      [84, null, 'Oyen', true, false, false],
      [88, null, 'Trenskow', true, false, false],
    ])
    expect(await scorersOf('Speelronde 6')).toEqual([])
    expect(await scorersOf('Speelronde 11')).toEqual([])
  })

  it('stores the scorers of the cup, with the minute of added time and two goals of one player', async () => {
    const { server } = await serve({ cup: goalsCup })

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported', warnings: [] })
    expect(await scorersOf('Achtste finales')).toEqual([
      [20, null, 'Trenskow', true, false, false],
      [65, null, 'Uneken', false, false, false],
      [75, null, 'Braude', true, false, false],
      [90, 1, 'Trenskow', true, false, false],
    ])
    expect(await scorersOf('Eerste ronde')).toEqual([
      [21, null, 'Sejk', true, false, false],
      [47, null, 'Meerveld', true, false, false],
      [73, null, 'Verheij', true, true, false],
    ])
  })

  it('stores no scorers for a match whose scorers do not fit the result, keeps the match, and warns', async () => {
    const { pages, server } = await serve()

    // The goal of Trenskow in minute 45 falls off the page.
    pages.programme = pages.programme.replace('{{goal|45}} [[Jacob Trenskow|Trenskow]]<br />', '')

    const report = await importAt(server, first)

    expect(report).toMatchObject({
      kind: 'imported',
      matches: { added: 35 },
      warnings: ['no scorers: Speelronde 2 (Eredivisie): the scorers are 1-2, the result is 2-2'],
    })
    expect(formatMatchReport(report)).toContain(
      'Matches 2026/27: warning, no scorers: Speelronde 2 (Eredivisie): the scorers are 1-2, the result is 2-2',
    )
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 2'))).toMatchObject([
      { goalsAgainst: 2, goalsFor: 2, status: 'played' },
    ])
    expect(await scorersOf('Speelronde 2')).toEqual([])
    // The other matches keep theirs.
    expect(await scorersOf('Speelronde 1')).toHaveLength(1)
    expect((await database.db.select().from(matchImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'imported',
      lastWarning: expect.stringContaining('no scorers: Speelronde 2'),
    })
  })

  it('stores no scorers for a line it cannot read, keeps the match, and warns with the reason', async () => {
    const { pages, server } = await serve()

    pages.programme = pages.programme.replace('[[Jacob Trenskow|Trenskow]]', '{{vreemd|Trenskow}}')

    expect(await importAt(server, first)).toMatchObject({
      kind: 'imported',
      matches: { added: 35 },
      warnings: [
        expect.stringMatching(
          /^no scorers: Speelronde 2 \(Eredivisie\): a goal has no usable name: '\{\{goal\|45\}\}/u,
        ),
      ],
    })
    expect(await scorersOf('Speelronde 2')).toEqual([])
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 2'))).toHaveLength(1)
  })

  it('does not warn about a played match whose scorers are not on the page yet', async () => {
    const { pages, server } = await serve()

    pages.programme = pages.programme.replace(ajaxAway, '').replace(ajaxHome, '')

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported', matches: { added: 35 }, warnings: [] })
    expect(await scorersOf('Speelronde 2')).toEqual([])
  })

  it('takes the scorers over when they come on the page later, and a correction of a name, and writes nothing when nothing changed', async () => {
    const { pages, server } = await serve()
    const late = pages.programme

    pages.programme = late.replace(ajaxAway, '').replace(ajaxHome, '')
    await importAt(server, first)
    expect(await scorersOf('Speelronde 2')).toEqual([])

    pages.programme = late
    expect(await importAt(server, new Date(first.getTime() + hours(1)))).toMatchObject({
      matches: { added: 0, unchanged: 34, updated: 1 },
      warnings: [],
    })
    expect(await scorersOf('Speelronde 2')).toHaveLength(4)

    const ids = await goalIds()

    expect(await importAt(server, new Date(first.getTime() + hours(2)))).toMatchObject({
      matches: { added: 0, unchanged: 35, updated: 0 },
    })
    expect(await goalIds()).toEqual(ids)

    pages.programme = late.replace('Trenskow]]', 'Trenskov]]')
    expect(await importAt(server, new Date(first.getTime() + hours(3)))).toMatchObject({
      matches: { unchanged: 34, updated: 1 },
      warnings: [],
    })
    expect((await scorersOf('Speelronde 2')).map((goal) => goal[2])).toEqual([
      'Klaverboer',
      'Ouazane',
      'Trenskov',
      'Rivera',
    ])
  })

  it('takes the scorers away with a match that leaves the page', async () => {
    const { pages, server } = await serve({ cup: goalsCup })

    await importAt(server, first)
    expect(await scorersOf('Eerste ronde')).toHaveLength(3)

    pages.cup = goalsCup.replaceAll('sc Heerenveen', 'FC Volendam')
    await importAt(server, new Date(first.getTime() + hours(1)))
    expect(await scorersOf('Eerste ronde')).toEqual([])
    expect(await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))).toEqual([])
  })
})

describe('the lines of a report', () => {
  it('cleans text from Wikipedia of control characters, in a warning as in an error', () => {
    const counts = { added: 0, removed: 0, unchanged: 1, updated: 1 }
    const warning = 'the result of Speelronde 1 (Eredivisie) changed\u001b[31m from x\nto y'
    const imported = formatMatchReport({
      kind: 'imported',
      matches: counts,
      season,
      standings: 18,
      validOn: '2026-10-24',
      warnings: [warning],
    })
    const failed = formatMatchReport({ kind: 'error', message: 'a\u001bb\nc', season })

    expect(imported.split('\n')).toHaveLength(2)
    expect(imported).not.toContain('\u001b')
    expect(failed.split('\n')).toHaveLength(1)
    expect(failed).not.toContain('\u001b')
  })
})

describe('a result that changes', () => {
  /** The match of round 1 ends 1-1 instead of 1-0, and the scorers and the table agree. */
  function drawn(pages: Pages) {
    return {
      programme: pages.programme
        .replace('|score = 1 – 0', '|score = 1 – 1')
        .replace('{{goal|52}}\n|goals2 =', '{{goal|52}}\n|goals2 = {{goal|88}} [[Test Speler|Speler]]'),
      standings: pages.standings
        .replace(
          '|win_HEE=4 |draw_HEE=3 |loss_HEE=3 |gf_HEE=18 |ga_HEE=13',
          '|win_HEE=3 |draw_HEE=4 |loss_HEE=3 |gf_HEE=18 |ga_HEE=14',
        )
        .replace(
          '|win_TWE=6 |draw_TWE=2 |loss_TWE=2 |gf_TWE=19 |ga_TWE=10',
          '|win_TWE=6 |draw_TWE=3 |loss_TWE=1 |gf_TWE=20 |ga_TWE=10',
        ),
    }
  }

  it('warns, with the old and the new result, when it had stood for three days or more, and takes the new one over', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    Object.assign(pages, drawn(pages))

    const report = await importAt(server, new Date(first.getTime() + 4 * 24 * hours(1)))

    expect(report).toMatchObject({
      kind: 'imported',
      matches: { updated: 1 },
      warnings: [
        'the result of Speelronde 1 (Eredivisie) changed after 4 days, from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente',
      ],
    })
    expect(formatMatchReport(report)).toContain('Matches 2026/27: warning, the result of Speelronde 1')
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 1'))).toMatchObject([
      { goalsAgainst: 1, goalsFor: 1, resultSetAt: new Date(first.getTime() + 4 * 24 * hours(1)) },
    ])
    expect((await database.db.select().from(matchImports))[0]).toMatchObject({
      lastWarning: expect.stringContaining('from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente'),
    })
  })

  it('takes a correction over without a warning when the result had stood for less than three days', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    Object.assign(pages, drawn(pages))

    const report = await importAt(server, new Date(first.getTime() + 2 * 24 * hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { updated: 1 }, warnings: [] })
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 1'))).toMatchObject([
      { goalsAgainst: 1, goalsFor: 1 },
    ])
  })

  it('does not move the day a result was first seen when only the time changes', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    pages.programme = pages.programme.replace(
      '|time = 16:45 uur\n|team1 = [[sc Heerenveen]]\n|score = 1 – 0',
      '|time = 17:00 uur\n|team1 = [[sc Heerenveen]]\n|score = 1 – 0',
    )
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 1'))).toMatchObject([
      { kickoffAt: new Date('2026-08-09T15:00:00Z'), resultSetAt: first },
    ])
  })
})

describe('a read that fails a check or a page that has changed', () => {
  const failures: [string, (pages: Pages) => Partial<Pages>, string][] = [
    [
      'a result the table does not know',
      (pages) => ({ programme: pages.programme.replace('|score = 1 – 0', '|score = 2 – 0') }),
      'the row of sc Heerenveen',
    ],
    [
      'a match of ours missing from the programme',
      (pages) => ({ programme: pages.programme.replace('[[sc Heerenveen]]', '[[FC Volendam]]') }),
      'the league has 33 matches for sc Heerenveen, not 34',
    ],
    [
      'a number in the table that unbalances it',
      (pages) => ({ standings: pages.standings.replace('|gf_AJA=29', '|gf_AJA=30') }),
      'over the table the goals for are not the goals against',
    ],
    [
      'a win in the table without a loss',
      (pages) => ({ standings: pages.standings.replace('|win_AJA=6', '|win_AJA=7') }),
      'over the table the wins are not the losses',
    ],
    [
      'a table with one club less',
      (pages) => ({ standings: pages.standings.replace('WIL', 'WIL2').replace(', WIL2', '') }),
      'the table has 17 clubs, not 18',
    ],
    [
      'a template that is gone from the table',
      (pages) => ({ standings: pages.standings.replace('Sports table', 'Stand') }),
      'the league table has no Sports table template',
    ],
    [
      'a template that is gone from the programme',
      (pages) => ({ programme: pages.programme.replaceAll('Footballbox2', 'Wedstrijd') }),
      'the programme has no Footballbox2 templates',
    ],
    [
      'a template that is gone from the cup page',
      (pages) => ({ cup: pages.cup.replaceAll('Footballbox2', 'Wedstrijd') }),
      'the cup page has no Footballbox2 templates, and we have cup matches from it',
    ],
    [
      'a date we do not know',
      (pages) => ({ programme: pages.programme.replace('|date = 31 oktober 2026', '|date = eind oktober') }),
      'has a date we do not know',
    ],
  ]

  it.each(failures)(
    'leaves the last good copy, writes a warning with the reason and counts the failure: %s',
    async (_name, change, reason) => {
      const { pages, server } = await serve()

      await importAt(server, first)

      const before = await snapshot()

      Object.assign(pages, change(pages))

      const report = await importAt(server, new Date(first.getTime() + hours(1)))

      expect(report.kind).toBe('error')
      expect(formatMatchReport(report)).toContain(
        `Matches 2026/27: warning, nothing changed and the last good copy stays: `,
      )
      expect(formatMatchReport(report)).toContain(reason)
      expect(await snapshot()).toEqual(before)
      expect((await database.db.select().from(matchImports))[0]).toMatchObject({
        failuresInARow: 1,
        lastOutcome: 'error',
        lastSuccessAt: first,
      })
    },
  )

  it('reads a cup page without templates as no cup matches, and replaces a made-up cup tie of the seed', async () => {
    const { server } = await serve({ cup: 'Het schema volgt na de loting.' })

    await database.db.insert(matches).values({
      competition: 'KNVB Beker',
      home: false,
      kickoffAt: first,
      matchDate: '2026-10-25',
      opponent: 'SV Proefdorp',
      round: 'Tweede ronde',
      season,
      status: 'scheduled',
    })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 34, removed: 1 } })
    expect(await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))).toEqual([])
    // Still no template an hour later: that is the page we know, and the import carries on.
    expect(await importAt(server, new Date(first.getTime() + hours(1)))).toMatchObject({ kind: 'imported' })
  })

  it('leaves the last good copy when a page cannot be read', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const before = await snapshot()
    const gone = await startServer({ '/robots.txt': reply(200, '') })

    servers.push(gone)

    const report = await importAt(gone, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'error', message: expect.stringContaining('Wedstrijden: HTTP 404') })
    expect(await snapshot()).toEqual(before)
  })

  it('does not read a page that robots.txt closes, and counts no failure', async () => {
    const { server } = await serve({}, { robots: 'User-agent: *\nDisallow: /wiki/' })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'blocked-by-robots' })
    expect(pageRequests(server)).toEqual([])
    expect(await database.db.select().from(matches)).toEqual([])
    expect((await database.db.select().from(matchImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'blocked-by-robots',
    })
  })

  it('writes nothing of the first page when the last one fails: all or nothing', async () => {
    const { server } = await serve({ cup: null })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'error', message: expect.stringContaining('HTTP 404') })
    expect(await snapshot()).toEqual({ matches: [], pages: [], standings: [] })
  })

  it('waits as long as Wikipedia asks, and counts it as no failure', async () => {
    const { server: ok } = await serve()
    const busy = await startServer({
      '/robots.txt': reply(200, ''),
      ...route(season, 'programme', reply(429, 'Te druk', { 'Retry-After': '120' })),
    })

    servers.push(busy)

    const report = await importAt(busy, first)

    expect(report).toMatchObject({ kind: 'wait', retryAfterSeconds: 120 })
    expect(formatMatchReport(report)).toBe('Matches 2026/27: not read, Wikipedia asks us to wait 120 seconds')
    expect((await database.db.select().from(matchImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'wait',
      retryAt: new Date(first.getTime() + 120 * 1000),
    })
    expect(await importAt(busy, new Date(first.getTime() + 60 * 1000))).toMatchObject({ kind: 'postponed' })
    expect(await importAt(ok, new Date(first.getTime() + 180 * 1000))).toMatchObject({ kind: 'imported' })
  })
})

describe('seasons', () => {
  const oldMatch = {
    competition: 'Eredivisie',
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    kickoffAt: new Date('2026-05-10T14:30:00Z'),
    matchDate: '2026-05-10',
    opponent: 'FC Groningen',
    resultSetAt: new Date('2026-05-10T16:30:00Z'),
    round: 'Speelronde 34',
    season: '2025/26',
    stadium: 'Abe Lenstra Stadion',
    status: 'played',
  } as const

  it('leaves the rows of an earlier season as they are when a new season starts', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await database.db.insert(matches).values(oldMatch)
    await database.db.insert(standings).values({
      club: 'sc Heerenveen',
      drawn: 5,
      goalDifference: 9,
      goalsAgainst: 40,
      goalsFor: 49,
      lost: 10,
      played: 34,
      points: 56,
      position: 7,
      season: '2025/26',
      validOn: '2026-05-10',
      won: 19,
    })

    const before = await snapshot()
    const kept = (rows: Awaited<ReturnType<typeof snapshot>>) => ({
      matches: rows.matches.filter((match) => match.season === '2026/27'),
      standings: rows.standings.filter((row) => row.season === '2026/27'),
    })
    // The next season starts on 1 July 2027. The pages of 2027/28 hold the same text here.
    const report = await importAt(server, new Date('2027-07-02T12:00:00Z'))

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 35 }, season: '2027/28' })

    const after = await snapshot()

    expect(after.matches.filter((match) => match.season !== '2027/28')).toEqual(before.matches)
    expect(after.standings.filter((row) => row.season !== '2027/28')).toEqual(before.standings)
    expect(kept(after)).toEqual(kept(before))
    expect(after.matches.filter((match) => match.season === '2027/28')).toHaveLength(35)
    expect(after.standings.filter((row) => row.season === '2027/28')).toHaveLength(18)
  })

  it('reads and replaces only the current season, also when an earlier season has a round with the same name', async () => {
    await database.db.insert(matches).values(oldMatch)

    const { server } = await serve()

    await importAt(server, first)
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(matches).where(eq(matches.season, '2025/26'))).toHaveLength(1)
    expect(
      await database.db
        .select()
        .from(matches)
        .where(and(eq(matches.season, '2025/26'), eq(matches.round, 'Speelronde 34'))),
    ).toMatchObject([{ goalsFor: 2, opponent: 'FC Groningen' }])
  })

  it('refuses a match with a result that is not played, or a played match without a result', async () => {
    const values = { ...oldMatch }

    await expect(database.db.insert(matches).values({ ...values, goalsFor: null })).rejects.toThrow()
    await expect(database.db.insert(matches).values({ ...values, status: 'scheduled' })).rejects.toThrow()
    await expect(database.db.insert(matches).values({ ...values, dateText: null, kickoffAt: null })).rejects.toThrow()
  })
})

describe('the import command', () => {
  /** Puts a source with a feed in the register. */
  async function addFeed(handler: Handler) {
    const server = await startServer({ '/rss/': handler })

    servers.push(server)

    const [source] = await database.db
      .insert(sources)
      .values({ domain: 'krant.test', kind: 'news', name: 'Krant' })
      .$returningId()

    await database.db.insert(feeds).values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })

    return server
  }

  const rss =
    '<?xml version="1.0"?><rss version="2.0"><channel><title>T</title><item><title>Kop</title><link>https://krant.test/1</link><guid>g1</guid></item></channel></rss>'

  async function run(wikipedia: TestServer, feed: TestServer) {
    const lines: string[] = []

    // These tests are about the matches: the squad waits for its hour and says nothing.
    await database.db
      .insert(squadImports)
      .values({ lastOutcome: 'imported', retryAt: new Date('2099-01-01T00:00:00Z'), season })
      .onDuplicateKeyUpdate({ set: { retryAt: new Date('2099-01-01T00:00:00Z') } })
    const code = await runImport(database.url, {
      clock: () => first,
      makeFetcher: (robots) => fetcherFor([feed, wikipedia], { robots }),
      wikipediaOrigin: wikipedia.origin,
      write: (line) => lines.push(line),
    })

    return { code, lines }
  }

  it('imports the matches after the feeds, in the same run', async () => {
    const feed = await addFeed(reply(200, rss, { 'Content-Type': 'text/xml' }))
    const { server } = await serve()

    const { code, lines } = await run(server, feed)

    expect(code).toBe(0)
    expect(lines).toEqual([
      expect.stringContaining('1 new, 0 updated, 0 unchanged, 0 skipped'),
      'Matches 2026/27: 35 new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-10-24',
    ])
    expect(await database.db.select().from(items)).toHaveLength(1)
  })

  it('still reads the feeds when the matches fail, and does not fail the run for it', async () => {
    const feed = await addFeed(reply(200, rss, { 'Content-Type': 'text/xml' }))
    const { server } = await serve({ programme: 'Een kale pagina' })

    const { code, lines } = await run(server, feed)

    expect(code).toBe(0)
    expect(lines[1]).toContain('Matches 2026/27: warning, nothing changed and the last good copy stays')
    expect(await database.db.select().from(items)).toHaveLength(1)
    expect(await database.db.select().from(matches)).toEqual([])
  })

  it('still reads the matches when a feed fails, and exits with 1 for the feed', async () => {
    const feed = await addFeed(reply(500, 'Kapot'))
    const { server } = await serve()

    const { code } = await run(server, feed)

    expect(code).toBe(1)
    expect(await database.db.select().from(matches)).toHaveLength(35)
  })

  it('does not print a line when the hour is not over yet', async () => {
    const feed = await addFeed(reply(200, rss, { 'Content-Type': 'text/xml' }))
    const { server } = await serve()

    await run(server, feed)

    const { lines } = await run(server, feed)

    expect(lines).toHaveLength(1)
  })
})

describe('the status', () => {
  async function status(at: Date) {
    const lines: string[] = []
    const code = await showStatus(database.url, { clock: () => at, write: (line) => lines.push(line) })

    return { code, text: lines.join('\n') }
  }

  it('says that the matches have not been read yet', async () => {
    const { code, text } = await status(first)

    expect(code).toBe(0)
    expect(text).toContain('Matches 2026/27 (Wikipedia): not read yet')
  })

  it('shows how many goals of ours have no player, and whose they are, and no more once they are linked', async () => {
    const { server } = await serve()

    await importAt(server, first)
    expect((await status(first)).text.split('\n').filter((line) => line.includes('goals of ours'))).toEqual([
      '  goals of ours without a player: 20 of 20 (Braude, Courtens, Farji, Klaverboer, Linday, Meerveld, Oyen, Rivera, Trenskow, Vente)',
    ])

    await database.db.insert(players).values(
      [
        'Luciano Valente',
        'Bernt Klaverboer',
        'Jacob Trenskow',
        'Maxence Rivera',
        'Oliver Braude',
        'Nolhan Courtens',
        'Marko Farji',
        'Dylan Vente',
        'Luca Oyen',
        'Ringo Meerveld',
        'Marcus Linday',
        'Esmir Bajraktarevic',
        'Jesper Uneken',
      ].map((name) => ({
        name,
        position: 'aanvaller' as const,
        searchTerm: name,
        season: '2026/27',
        wikipediaPage: name,
      })),
    )
    await importAt(server, new Date(first.getTime() + hours(1)))

    const { text } = await status(new Date(first.getTime() + hours(1)))

    expect(text.split('\n').filter((line) => line.includes('goals of ours'))).toEqual([
      '  goals of ours without a player: 0 of 20',
    ])
  })

  it('shows the last good read, the last outcome, the failed runs and the pages', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    pages.programme = 'Een kale pagina'
    await importAt(server, new Date(first.getTime() + hours(1)))

    const { code, text } = await status(new Date(first.getTime() + hours(1) + 60_000))

    expect(code).toBe(0)
    expect(text).toContain('Matches 2026/27 (Wikipedia): healthy')
    expect(text).toContain('last success: 2026-10-25 12:00:00 UTC')
    expect(text).toContain('last outcome: error')
    expect(text).toContain('failed runs in a row: 1')
    expect(text).toContain('last error: 2026-10-25 13:00:00 UTC, the programme has no Footballbox2 templates')
    expect(text).toContain('next try from: 2026-10-25 13:59:00 UTC')
    expect(text).toContain(
      'page: KNVB Beker 2026/27 (mannen), version Wed, 21 Oct 2026 14:40:44 GMT, read 2026-10-25 12:00:00 UTC',
    )
  })

  it('exits with 1 when the import has failed three runs in a row', async () => {
    const { server } = await serve({ programme: 'Een kale pagina' })

    for (const hour of [0, 1, 2]) {
      await importAt(server, new Date(first.getTime() + hours(hour)))
    }

    const { code, text } = await status(new Date(first.getTime() + hours(2) + 60_000))

    expect(code).toBe(1)
    expect(text).toContain('Matches 2026/27 (Wikipedia): unhealthy')
    expect(text).toContain('failed runs in a row: 3')
  })
})

describe('linking the goals to the players of the squad', () => {
  /** The players of the season, as `[name, page]`; the page is the link in the squad table. */
  async function addPlayers(rows: [string, null | string][], { inSquad = true } = {}) {
    await database.db.insert(players).values(
      rows.map(([name, wikipediaPage]) => ({
        inSquad,
        leftSquadAt: inSquad ? null : first,
        name,
        position: 'aanvaller' as const,
        searchTerm: name.split(' ').slice(1).join(' '),
        season: '2026/27',
        wikipediaPage,
      })),
    )
  }

  /** The goals of a round as `[name in the goal, name of the player or null, page]`. */
  const linksOf = async (round: string) =>
    (
      await database.db
        .select({ goal: matchGoals, player: players.name })
        .from(matchGoals)
        .innerJoin(matches, eq(matchGoals.matchId, matches.id))
        .leftJoin(players, eq(matchGoals.playerId, players.id))
        .where(eq(matches.round, round))
        .orderBy(asc(matchGoals.id))
    ).map(({ goal, player }) => [goal.player, player, goal.wikipediaPage])

  it('links a goal by the page, by the full name and by a surname only one player has, and no other', async () => {
    await addPlayers([
      ['Bernt Klaverboer', 'Bernt Klaverboer'],
      ['Jacob Trenskow', 'Jacob Trenskow'],
      // The page of the goal is not his; the name is.
      ['Maxence Rivera', 'Maxence Rivera (voetballer)'],
    ])

    const { server } = await serve()

    await importAt(server, first)

    // Klaverboer scored an own goal, listed under the opponent. Ouazane is the opponent's.
    expect(await linksOf('Speelronde 2')).toEqual([
      ['Klaverboer', 'Bernt Klaverboer', 'Bernt Klaverboer'],
      ['Ouazane', null, 'Abdellah Ouazane'],
      ['Trenskow', 'Jacob Trenskow', 'Jacob Trenskow'],
      ['Rivera', 'Maxence Rivera', 'Maxence Rivera'],
    ])
  })

  it('links the goals of a player who left the squad, and writes nothing when they are read again', async () => {
    await addPlayers([['Jacob Trenskow', 'Jacob Trenskow']], { inSquad: false })

    const { server } = await serve()

    await importAt(server, first)

    const [trenskow] = await database.db.select().from(players)
    const goalRows = () => database.db.select().from(matchGoals).orderBy(asc(matchGoals.id))
    const before = await goalRows()
    const ofTrenskow = before.filter((goal) => goal.player === 'Trenskow')

    expect(ofTrenskow.length).toBeGreaterThan(1)
    expect(ofTrenskow.every((goal) => goal.playerId === trenskow?.id)).toBe(true)
    expect(await importAt(server, new Date(first.getTime() + hours(1)))).toMatchObject({
      matches: { added: 0, unchanged: 35, updated: 0 },
    })
    expect(await goalRows()).toEqual(before)
  })

  it('does not link a surname that two players have, but does link them by their pages', async () => {
    await addPlayers([
      ['Jacob Trenskow', 'Jacob Trenskow'],
      ['Jan Trenskow', 'Jan Trenskow'],
    ])

    const { pages, server } = await serve()

    // One goal of Trenskow in minute 45 loses its link, the one in minute 82 keeps it.
    pages.programme = pages.programme.replace(
      '[[Jacob Trenskow|Trenskow]]<br />{{goal|82}}',
      'Trenskow<br />{{goal|82}}',
    )

    await importAt(server, first)

    const goals = await linksOf('Speelronde 2')

    expect(goals).toContainEqual(['Trenskow', null, null])
    expect(await linksOf('Speelronde 9')).toContainEqual(['Trenskow', 'Jacob Trenskow', 'Jacob Trenskow'])
  })

  it('links the goals when the player comes into the table later, and writes only the match that changed', async () => {
    const { server } = await serve()

    await importAt(server, first)
    expect((await linksOf('Speelronde 2')).map(([, player]) => player)).toEqual([null, null, null, null])

    await addPlayers([['Maxence Rivera', 'Maxence Rivera']])

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported' })
    expect(report.kind === 'imported' && report.matches.updated).toBeGreaterThan(0)
    expect(await linksOf('Speelronde 2')).toContainEqual(['Rivera', 'Maxence Rivera', 'Maxence Rivera'])
  })

  it('warns, once the squad is read, how many goals of ours have no player and whose they are', async () => {
    await addPlayers([['Jacob Trenskow', 'Jacob Trenskow']])

    const { server } = await serve()
    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 35 } })

    const [warning] = report.kind === 'imported' ? report.warnings : []

    // Every goal of ours but those of Trenskow, from A to Z, and not Ouazane (the opponent's).
    expect(warning).toMatch(/^\d+ goals of ours have no player in the squad table: Braude, Courtens, /u)
    expect(warning).not.toContain('Ouazane')
    expect(warning).not.toContain('Trenskow')
    expect(formatMatchReport(report)).toContain('Matches 2026/27: warning, ')
    expect((await database.db.select().from(matchImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'imported',
      lastWarning: expect.stringContaining('goals of ours have no player'),
    })
  })

  it('does not warn before the squad has been read, and keeps the match all the same', async () => {
    const { server } = await serve()

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported', matches: { added: 35 }, warnings: [] })
    expect(await database.db.select().from(matchGoals)).not.toHaveLength(0)
  })
})

describe('the warning about goals without a player', () => {
  const goal = (player: string, rest: Partial<LinkedGoal> = {}): LinkedGoal => ({
    minute: 10,
    ours: true,
    ownGoal: false,
    penalty: false,
    player,
    playerId: null,
    playerPage: null,
    stoppageMinutes: null,
    ...rest,
  })

  it('is nothing when every goal of ours has a player, or is not of a player of ours', () => {
    expect(unlinkedWarning([goal('Oyen', { playerId: 1 }), goal('Ouazane', { ours: false })])).toBeUndefined()
    expect(unlinkedWarning([goal('Verheij', { ownGoal: true })])).toBeUndefined()
    expect(unlinkedWarning([])).toBeUndefined()
  })

  it('says one goal in the singular', () => {
    expect(unlinkedWarning([goal('Oyen')])).toBe('1 goal of ours has no player in the squad table: Oyen')
  })

  it('counts every goal and names every player once, from A to Z', () => {
    expect(
      unlinkedWarning([goal('Vente'), goal('Oyen'), goal('Vente'), goal('Klaverboer', { ours: false, ownGoal: true })]),
    ).toBe('4 goals of ours have no player in the squad table: Klaverboer, Oyen, Vente')
  })

  it('names the first eight players and says there are more', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

    expect(unlinkedWarning(names.map((name) => goal(name)))).toBe(
      '9 goals of ours have no player in the squad table: A, B, C, D, E, F, G, H, …',
    )
  })
})
