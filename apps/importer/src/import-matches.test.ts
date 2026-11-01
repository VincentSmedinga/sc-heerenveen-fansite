import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import {
  clubNames,
  clubs,
  feeds,
  items,
  matchChanges,
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
import { formatMatchReport, importMatches, repairKnownClubs, unlinkedWarning } from './import-matches.ts'
import { acceptChanges, rejectChanges } from './match-changes.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { showStatus } from './status.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Wed, 21 Oct 2026 14:40:44 GMT' }

/** Sunday 25 October 2026, after the table was updated for the 10th round. */
const first = new Date('2026-10-25T12:00:00Z')

const hours = (count: number) => count * 60 * 60 * 1000

type Pages = { cup: string; programme: string; standings: string }

/**
 * The page of the play-offs is not always there, and it is served as a text, as a status
 * Wikipedia answers with (500, say), or as nothing: 404, the answer for a page that does not
 * exist.
 */
type ServedPages = Pages & { playoffs: null | number | string }

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
    'match_changes',
    'matches',
    'club_names',
    'clubs',
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
function route(season: string, kind: keyof ServedPages, handler: Handler) {
  const path = pageUrl('', pageTitles(season)[kind])

  return { [path]: handler }
}

/**
 * Starts a web server on this computer that serves the three pages of the seasons as Wikipedia
 * does, from `pages`, which a test can change between runs. The tests ask no real site.
 */
async function serve(pages: { [Kind in keyof ServedPages]?: null | ServedPages[Kind] } = {}, { robots = '' } = {}) {
  const current = { ...original, playoffs: null, ...pages } as ServedPages
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, robots, { 'Content-Type': 'text/plain' }) }

  for (const season of ['2026/27', '2027/28']) {
    for (const kind of ['cup', 'playoffs', 'programme', 'standings'] as const) {
      Object.assign(
        routes,
        route(season, kind, (_request, response) => {
          const served: null | number | string = current[kind]
          const text = typeof served === 'string' ? served : null

          response.writeHead(text === null ? (typeof served === 'number' ? served : 404) : 200, wiki)
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

const goalsCup = fixture('wikipedia-cup-goals.wiki')

/** The scorers of the match of a round, in the order they are shown. */
const scorersOf = async (round: string) =>
  (
    await database.db
      .select({ goal: matchGoals })
      .from(matchGoals)
      .innerJoin(matches, eq(matchGoals.matchId, matches.id))
      .where(eq(matches.round, round))
      .orderBy(asc(matchGoals.id))
  ).map(({ goal }) => [goal.minute, goal.stoppageMinutes, goal.player, goal.ours, goal.ownGoal, goal.penalty])

const health = async () => (await database.db.select().from(matchImports))[0]

const season = '2026/27'

describe('the first import, into an empty database', () => {
  it('stores the programme, the results, the cup tie and the table, and the pages it read', async () => {
    const { server } = await serve()

    const report = await importAt(server, first)

    expect(report).toEqual({
      clubs: expect.any(Array),
      kind: 'imported',
      matches: { added: 35, held: 0, removed: 0, unchanged: 0, updated: 0 },
      season,
      standings: 18,
      validOn: '2026-10-24',
      warnings: [],
    })
    expect(formatMatchReport(report).split('\n')[0]).toBe(
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
      '/wiki/Play-offs_Nederlands_voetbal_2027?action=raw',
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

  it('takes over a new kick-off, and holds a match that leaves the page', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)

    // The time of the match against N.E.C. changes, and the cup page forgets our tie.
    pages.programme = pages.programme.replace(
      '|time = 18:45 uur\n|team1 = [[sc Heerenveen]]\n|score =  – \n|team2 = [[N.E.C.]]',
      '|time = 20:00 uur\n|team1 = [[sc Heerenveen]]\n|score =  – \n|team2 = [[N.E.C.]]',
    )
    pages.cup = pages.cup.replace('[[sc Heerenveen]]', '[[FC Volendam]]')

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({
      kind: 'imported',
      matches: { added: 0, held: 1, removed: 0, unchanged: 33, updated: 1 },
    })
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 11'))).toMatchObject([
      { kickoffAt: new Date('2026-10-31T19:00:00Z') },
    ])
    expect(await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))).toHaveLength(1)
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

describe('a cup round with days instead of a day', () => {
  /** The cup page of the 25th, with the second round as Wikipedia has it on 1 November. */
  const withSecondRound = `${original.cup}\n${fixture('wikipedia-cup-second-round.wiki')}`

  it('stores the match of the second round with its first day, and the days as Wikipedia writes them', async () => {
    const { server } = await serve({ cup: withSecondRound })
    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 36, updated: 0 } })
    expect(
      await database.db
        .select({
          dateText: matches.dateText,
          kickoffAt: matches.kickoffAt,
          matchDate: matches.matchDate,
          opponent: matches.opponent,
          status: matches.status,
        })
        .from(matches)
        .where(eq(matches.round, 'Tweede ronde')),
    ).toEqual([
      {
        dateText: '1–3 december 2026',
        kickoffAt: null,
        matchDate: '2026-12-01',
        opponent: 'De Treffers',
        status: 'scheduled',
      },
    ])
    expect(await importAt(server, new Date(first.getTime() + hours(1)))).toMatchObject({
      matches: { added: 0, unchanged: 36, updated: 0 },
    })
  })

  it('still stops on a date it does not know, and keeps the last good copy', async () => {
    const { server } = await serve({ cup: withSecondRound.replaceAll('1–3 december 2026', 'begin december') })
    const report = await importAt(server, first)

    expect(formatMatchReport(report)).toContain(
      "Matches 2026/27: warning, nothing changed and the last good copy stays: Tweede ronde (KNVB Beker) has a date we do not know: 'begin december'",
    )
    expect(await database.db.select().from(matches)).toEqual([])
  })
})

describe('the score after 90 minutes of a cup tie', () => {
  const afterNinetyCup = fixture('wikipedia-cup-after-ninety.wiki')
  const afterNinetyOf = async () =>
    (
      await database.db
        .select()
        .from(matches)
        .where(eq(matches.competition, 'KNVB Beker'))
        .orderBy(asc(matches.matchDate))
    ).map((match) => [match.round, match.afterNinetyFor, match.afterNinetyAgainst])

  it('stores it from our side, or nothing when the page does not give it', async () => {
    const { server } = await serve({ cup: afterNinetyCup })

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported', matches: { added: 39 }, warnings: [] })
    expect(await afterNinetyOf()).toEqual([
      ['Eerste ronde', 1, 1],
      ['Tweede ronde', 2, 2],
      ['Derde ronde', null, null],
      ['Achtste finale', null, null],
      ['Kwartfinale', null, null],
    ])
  })

  it('takes it over when it comes on the page later, and changes nothing else', async () => {
    const withoutField = afterNinetyCup.replace('|half time score = 1&nbsp;–&nbsp;1, 0&nbsp;–&nbsp;0\n', '')
    const { pages, server } = await serve({ cup: withoutField })

    await importAt(server, first)
    expect((await afterNinetyOf())[0]).toEqual(['Eerste ronde', null, null])

    pages.cup = afterNinetyCup

    const report = await importAt(server, new Date(first.getTime() + 5 * 24 * hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { unchanged: 38, updated: 1 }, warnings: [] })
    expect((await afterNinetyOf())[0]).toEqual(['Eerste ronde', 1, 1])
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Eerste ronde'))).toMatchObject([
      { goalsAgainst: 1, goalsFor: 2, resultSetAt: first },
    ])
  })

  it('stores nothing for a match without extra time, whatever its half time score says', async () => {
    const { server } = await serve({
      cup: afterNinetyCup
        .replace('|half time score = 1&nbsp;–&nbsp;0\n|aet = J', '|half time score = 1&nbsp;–&nbsp;1, 0&nbsp;–&nbsp;0')
        .replace('|aet = J\n|team2 = [[Maquette FC]]', '|team2 = [[Maquette FC]]'),
    })

    await importAt(server, first)
    expect((await afterNinetyOf())[4]).toEqual(['Kwartfinale', null, null])
  })
})

describe('a match that was stopped and finished later', () => {
  // The rest has no result here: the table of the page would stop agreeing with the matches.
  const block = (fields: string) =>
    `{{Footballbox2\n${fields}\n|goals1 =\n|goals2 =\n|location = [[Heerenveen (plaats)|Heerenveen]]\n|attendance =\n|referee =\n}}`
  const began = block(
    "|date = 31 oktober 2026\n|time = 18:45 uur\n|team1 = [[sc Heerenveen]]\n|score = Gestaakt 82' (1 – 0)\n|team2 = [[N.E.C.]]\n|stadium = [[Abe Lenstra Stadion]]",
  )
  const rest = block(
    '|date = 3 november 2026\n|time = 14:30 uur\n|team1 = [[sc Heerenveen]]\n|score =  – \n|team2 = [[N.E.C.]]\n|stadium = [[Goffertstadion]]',
  )
  const plain = original.programme
  const undone =
    '|date = 31 oktober 2026\n|time = 18:45 uur\n|team1 = [[sc Heerenveen]]\n|score =  – \n|team2 = [[N.E.C.]]'
  /** The programme with these blocks in place of the match of round 11. */
  const withBlocks = (blocks: string) =>
    plain.replace(/\{\{Footballbox2\n\|date = 31 oktober 2026[\s\S]*?\n\}\}/u, blocks)
  const roundEleven = () => database.db.select().from(matches).where(eq(matches.round, 'Speelronde 11'))

  it('stores the match as it began, with the line about the rest, and writes no note for the others', async () => {
    const { server } = await serve({ programme: withBlocks(`${began}\n${rest}`) })

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported', warnings: [] })
    expect(await roundEleven()).toMatchObject([
      {
        goalsAgainst: null,
        goalsFor: null,
        matchDate: '2026-10-31',
        note: 'Gestaakt in minuut 82. Het restant wordt op 3 november gespeeld in het Goffertstadion.',
        stadium: 'Abe Lenstra Stadion',
        status: 'scheduled',
      },
    ])
    expect((await database.db.select().from(matches)).filter((match) => match.note !== null)).toHaveLength(1)
  })

  it('fills a match stored before, from the next import, and then finds nothing changed', async () => {
    const withRestOnly = withBlocks(rest)
    const { pages, server } = await serve({ programme: withRestOnly })

    await importAt(server, first)
    expect(await roundEleven()).toMatchObject([{ matchDate: '2026-11-03', note: null, stadium: 'Goffertstadion' }])

    pages.programme = withBlocks(`${began}\n${rest}`)

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 0, removed: 0, updated: 1 }, warnings: [] })
    expect(await roundEleven()).toMatchObject([
      {
        matchDate: '2026-10-31',
        note: expect.stringContaining('Gestaakt in minuut 82.'),
        stadium: 'Abe Lenstra Stadion',
      },
    ])
    expect(await importAt(server, new Date(first.getTime() + 2 * hours(1)))).toMatchObject({
      matches: { unchanged: 35, updated: 0 },
    })
  })

  it('keeps the last good copy when the page has the stopped block and nothing that finishes it', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    expect(plain).toContain(undone)

    pages.programme = withBlocks(began)

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report.kind).toBe('error')
    expect(await roundEleven()).toMatchObject([{ note: null, status: 'scheduled' }])
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

  it('holds, with the shoot-out in the warning, a shoot-out that had stood for days and changes', async () => {
    const { pages, server } = await serve({ cup: extraTimeCup })

    await importAt(server, first)
    pages.cup = extraTimeCup.replace('|penaltyscore = 4&nbsp;–&nbsp;3', '|penaltyscore = 3&nbsp;–&nbsp;4')

    const report = await importAt(server, new Date(first.getTime() + 4 * 24 * hours(1)))

    expect(report).toMatchObject({
      kind: 'imported',
      matches: { held: 1, updated: 0 },
      warnings: [
        'held, Tweede ronde (KNVB Beker): the result changed after 4 days, from sc Heerenveen 1-1 Voorbeeld United (penalties 4-3) to sc Heerenveen 1-1 Voorbeeld United (penalties 3-4)',
      ],
    })
    expect(await database.db.select().from(matches).where(eq(matches.round, 'Tweede ronde'))).toMatchObject([
      { penaltiesAgainst: 3, penaltiesFor: 4 },
    ])
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
      'which only the cup and the play-offs have',
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
    // The match was played in August, so a correction of a scorer's name waits.
    expect(await importAt(server, new Date(first.getTime() + hours(3)))).toMatchObject({
      matches: { held: 1, unchanged: 34, updated: 0 },
      warnings: [expect.stringContaining('held, Speelronde 2 (Eredivisie): the goals changed')],
    })
    expect((await scorersOf('Speelronde 2')).map((goal) => goal[2])).toEqual([
      'Klaverboer',
      'Ouazane',
      'Trenskow',
      'Rivera',
    ])
  })

  it('keeps the scorers of a match that leaves the page, while the removal waits', async () => {
    const { pages, server } = await serve({ cup: goalsCup })

    await importAt(server, first)
    expect(await scorersOf('Eerste ronde')).toHaveLength(3)

    pages.cup = goalsCup.replaceAll('sc Heerenveen', 'FC Volendam')
    await importAt(server, new Date(first.getTime() + hours(1)))
    expect(await scorersOf('Eerste ronde')).toHaveLength(3)
    expect(await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))).toHaveLength(4)

    await importAt(server, new Date(first.getTime() + 8 * 24 * hours(1)))
    expect(await scorersOf('Eerste ronde')).toEqual([])
    expect(await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))).toEqual([])
  })
})

describe('the clubs of the opponents', () => {
  const clubLines = (report: Awaited<ReturnType<typeof importAt>>) =>
    formatMatchReport(report)
      .split('\n')
      .filter((line) => line.includes(': new club '))

  /** The club of each match, by the round and the competition. */
  async function clubsByRound() {
    const rows = await database.db
      .select({
        club: clubs.name,
        competition: matches.competition,
        page: clubs.wikipediaPage,
        round: matches.round,
        slug: clubs.slug,
      })
      .from(matches)
      .innerJoin(clubs, eq(matches.clubId, clubs.id))

    return new Map(rows.map((row) => [`${row.competition}|${row.round}`, row]))
  }

  it('makes a club of each opponent, with the article the match links to, and logs each one', async () => {
    const { server } = await serve()
    const report = await importAt(server, first)
    const byRound = await clubsByRound()

    expect(byRound.size).toBe(35)
    expect(byRound.get('Eredivisie|Speelronde 6')).toMatchObject({
      club: 'Telstar',
      page: 'Telstar (voetbalclub)',
      slug: 'telstar',
    })
    expect(byRound.get('Eredivisie|Speelronde 1')).toMatchObject({
      club: 'FC Twente',
      page: 'FC Twente',
      slug: 'fc-twente',
    })
    expect(byRound.get('KNVB Beker|Eerste ronde')).toMatchObject({
      club: 'Excelsior Maassluis',
      slug: 'excelsior-maassluis',
    })
    expect(await database.db.select().from(clubs)).toHaveLength(18)
    expect(clubLines(report)).toContain("Matches 2026/27: new club 'Telstar' (article 'Telstar (voetbalclub)')")
    expect(clubLines(report)).toHaveLength(18)
  })

  it('makes no club twice in a second run, and logs nothing about clubs', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const before = await database.db.select().from(clubs)
    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ clubs: [], kind: 'imported', matches: { added: 0, unchanged: 35, updated: 0 } })
    expect(await database.db.select().from(clubs)).toEqual(before)
    // The only other names are the spellings of Excelsior Rotterdam, from the list.
    expect((await database.db.select().from(clubNames)).map((row) => row.name).sort()).toEqual([
      'Excelsior',
      'SBV Excelsior',
    ])
  })

  it('makes a club without an article from the name, and gives it the article when the page links it later', async () => {
    const unlinked = original.programme.replaceAll('[[PEC Zwolle]]', 'PEC Zwolle')

    expect(unlinked).not.toBe(original.programme)

    const { server } = await serve({ programme: unlinked })
    const report = await importAt(server, first)

    expect(clubLines(report)).toContain("Matches 2026/27: new club 'PEC Zwolle', with no article")
    expect(await database.db.select().from(clubs).where(eq(clubs.name, 'PEC Zwolle'))).toMatchObject([
      { slug: 'pec-zwolle', wikipediaPage: null },
    ])

    const { server: linked } = await serve()
    const later = await importAt(linked, new Date(first.getTime() + hours(1)))

    expect(later).toMatchObject({ clubs: ["article 'PEC Zwolle' for club 'PEC Zwolle'"], matches: { unchanged: 35 } })
    expect(await database.db.select().from(clubs).where(eq(clubs.name, 'PEC Zwolle'))).toMatchObject([
      { slug: 'pec-zwolle', wikipediaPage: 'PEC Zwolle' },
    ])
    expect(await database.db.select().from(clubs)).toHaveLength(18)
  })

  it('finds a club under another spelling that is among its other names, and makes no second club', async () => {
    const [club] = await database.db.insert(clubs).values({ name: 'NEC Nijmegen', slug: 'nec' }).$returningId()

    await database.db.insert(clubNames).values({ clubId: club!.id, name: 'N.E.C.' })

    const { server } = await serve()
    const report = await importAt(server, first)
    const byRound = await clubsByRound()

    expect(byRound.get('Eredivisie|Speelronde 11')).toMatchObject({ club: 'NEC Nijmegen', page: 'N.E.C.', slug: 'nec' })
    expect(clubLines(report)).toHaveLength(17)
    expect(await database.db.select().from(clubs)).toHaveLength(18)
    expect(await database.db.select().from(clubNames).where(eq(clubNames.clubId, club!.id))).toHaveLength(1)
  })

  it('adds a new spelling of a club with the same article to its other names, and logs it', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const renamed = original.programme.replace(
      '[[Telstar (voetbalclub)|Telstar]]',
      '[[Telstar (voetbalclub)|Telstar 1963]]',
    )

    expect(renamed).not.toBe(original.programme)

    const { server: later } = await serve({ programme: renamed })
    const report = await importAt(later, new Date(first.getTime() + hours(1)))

    // The club is renamed at once; the name on the old match is a change that waits.
    expect(report).toMatchObject({
      clubs: ["club 'Telstar' is now called 'Telstar 1963'"],
      matches: { held: 1, updated: 0 },
    })
    expect(await database.db.select().from(clubs).where(eq(clubs.slug, 'telstar'))).toMatchObject([
      { name: 'Telstar 1963', wikipediaPage: 'Telstar (voetbalclub)' },
    ])
    expect(await database.db.select().from(clubNames).where(eq(clubNames.name, 'Telstar'))).toHaveLength(1)
    expect(await database.db.select().from(clubs)).toHaveLength(18)
  })

  it('gives a new club the next free slug when another club has the slug', async () => {
    await database.db
      .insert(clubs)
      .values({ name: 'FC Twente (oud)', slug: 'fc-twente', wikipediaPage: 'FC Twente (oud)' })

    const { server } = await serve()
    const report = await importAt(server, first)

    expect((await clubsByRound()).get('Eredivisie|Speelronde 1')).toMatchObject({
      club: 'FC Twente',
      slug: 'fc-twente-2',
    })
    expect(clubLines(report)).toHaveLength(18)
  })

  describe('a club the list of full names knows', () => {
    /** The clubs with Excelsior in the name, and the club of each match against them. */
    async function excelsior() {
      const rows = await database.db
        .select({ club: clubs.name, opponent: matches.opponent, slug: clubs.slug })
        .from(matches)
        .innerJoin(clubs, eq(matches.clubId, clubs.id))
      const names = await database.db
        .select({ club: clubs.name, name: clubNames.name })
        .from(clubNames)
        .innerJoin(clubs, eq(clubNames.clubId, clubs.id))

      return {
        clubs: await database.db.select({ name: clubs.name, slug: clubs.slug }).from(clubs).orderBy(clubs.slug),
        matches: rows.filter((row) => row.opponent.includes('Excelsior') && row.club !== 'Excelsior Maassluis'),
        names,
      }
    }

    it.each([
      ['an article with the short name', '[[Excelsior Rotterdam|Excelsior]]'],
      ['an article with the name of the old club', '[[Excelsior Rotterdam|SBV Excelsior]]'],
      ['the short name with no article', 'Excelsior'],
      ['the old name with no article', 'SBV Excelsior'],
    ])('makes one club of Excelsior Rotterdam from %s, with the full name and the slug of it', async (_name, text) => {
      const spelled = original.programme.replace('[[Excelsior Rotterdam]]', text)

      expect(spelled).not.toBe(original.programme)

      const { server } = await serve({ programme: spelled })
      const report = await importAt(server, first)
      const found = await excelsior()

      // The programme has two matches against the club: the second one keeps its own spelling.
      expect(found.matches).toHaveLength(2)
      expect(found.matches.every((row) => row.club === 'Excelsior Rotterdam')).toBe(true)
      expect(found.matches.every((row) => row.slug === 'excelsior-rotterdam')).toBe(true)
      expect(found.clubs.filter((club) => club.name.startsWith('Excelsior'))).toEqual([
        { name: 'Excelsior Maassluis', slug: 'excelsior-maassluis' },
        { name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
      ])
      expect(found.names).toEqual(
        expect.arrayContaining([
          { club: 'Excelsior Rotterdam', name: 'Excelsior' },
          { club: 'Excelsior Rotterdam', name: 'SBV Excelsior' },
        ]),
      )
      expect(found.names).toHaveLength(2)
      expect(clubLines(report)).toHaveLength(18)
      expect(formatMatchReport(report)).toContain("new name 'SBV Excelsior' for club 'Excelsior Rotterdam'")
    })

    it('keeps Excelsior Maassluis apart from Excelsior Rotterdam', async () => {
      const { server } = await serve({
        programme: original.programme.replace('[[Excelsior Rotterdam]]', 'Excelsior'),
      })

      await importAt(server, first)

      const byRound = await clubsByRound()

      expect(byRound.get('KNVB Beker|Eerste ronde')).toMatchObject({
        club: 'Excelsior Maassluis',
        slug: 'excelsior-maassluis',
      })
      expect(await database.db.select().from(clubs).where(eq(clubs.slug, 'excelsior'))).toEqual([])
    })

    /** Excelsior as an earlier import made it: two clubs, each with older matches. */
    async function excelsiorTwice() {
      const older = (opponent: string, round: string, matchDate: string) => ({
        competition: 'Eredivisie' as const,
        home: true,
        kickoffAt: new Date(`${matchDate}T18:45:00Z`),
        matchDate,
        opponent,
        round,
        season: '2025/26',
        status: 'scheduled' as const,
      })

      await database.db
        .insert(matches)
        .values(
          await withClubs(database.db, [
            older('Excelsior', 'Speelronde 3', '2025-08-24'),
            older('Excelsior', 'Speelronde 20', '2026-01-18'),
            older('Excelsior Rotterdam', 'Speelronde 9', '2025-10-05'),
          ]),
        )
    }

    const mergeLines = [
      "Clubs: merged club 'Excelsior Rotterdam' into club 'Excelsior'",
      "Clubs: club 'Excelsior' is now called 'Excelsior Rotterdam'",
      "Clubs: slug of club 'Excelsior Rotterdam' is now 'excelsior-rotterdam'",
      "Clubs: new name 'SBV Excelsior' for club 'Excelsior Rotterdam'",
    ]

    it('merges the two clubs of an earlier import before the season is read, and logs it', async () => {
      await excelsiorTwice()

      expect((await excelsior()).clubs.filter((club) => club.name.startsWith('Excelsior'))).toEqual([
        { name: 'Excelsior', slug: 'excelsior' },
        { name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
      ])

      const lines = await repairKnownClubs(database.db)
      const found = await excelsior()

      expect(lines).toEqual(mergeLines)
      expect(found.clubs.filter((club) => club.name.startsWith('Excelsior'))).toEqual([
        { name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
      ])
      expect(found.matches).toHaveLength(3)
      expect(found.matches.every((row) => row.club === 'Excelsior Rotterdam')).toBe(true)
      expect(found.names).toEqual(expect.arrayContaining([{ club: 'Excelsior Rotterdam', name: 'Excelsior' }]))

      // The read after it finds the clubs right: no match of the season counts as updated.
      const { server } = await serve()

      expect(await importAt(server, first)).toMatchObject({
        clubs: expect.not.arrayContaining([expect.stringContaining('merged')]),
        matches: { added: 35, updated: 0 },
      })
    })

    it('merges the two clubs when the season cannot be read, and the run goes on', async () => {
      await excelsiorTwice()

      const { server } = await serve({ programme: 'Een kale pagina' })
      const lines: string[] = []
      const code = await runImport(database.url, {
        clock: () => first,
        makeFetcher: () => fetcherFor([server]),
        wikipediaOrigin: server.origin,
        write: (line) => lines.push(line),
      })
      const found = await excelsior()

      expect(code).toBe(0)
      expect(lines.filter((line) => /^(Clubs|Matches)/u.test(line))).toEqual([
        ...mergeLines,
        expect.stringContaining('Matches 2026/27: warning, nothing changed and the last good copy stays'),
      ])
      expect(found.clubs.filter((club) => club.name.startsWith('Excelsior'))).toEqual([
        { name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
      ])
      expect(found.matches).toHaveLength(3)
      expect(found.matches.every((row) => row.club === 'Excelsior Rotterdam')).toBe(true)
    })

    it('makes a warning of a repair that fails, on the health of the season, and does not throw', async () => {
      await excelsiorTwice()

      const failing = Object.create(database.db, {
        transaction: { value: () => Promise.reject(new Error('Deadlock found when trying to get lock')) },
      }) as typeof database.db
      const warning = 'clubs not repaired: Deadlock found when trying to get lock'

      expect(await repairKnownClubs(failing, () => first)).toEqual([`Clubs: warning, ${warning}`])
      expect(await database.db.select().from(matchImports)).toEqual([
        expect.objectContaining({ lastWarning: warning, lastWarningAt: first, season: '2026/27' }),
      ])
      // Nothing was merged, and the next run tries again.
      expect((await excelsior()).clubs.filter((club) => club.name.startsWith('Excelsior'))).toHaveLength(2)

      // The health of a season that was read stays, and the warning is added to it.
      const { server } = await serve()

      await importAt(server, first)

      const later = new Date(first.getTime() + hours(2))

      expect(await repairKnownClubs(failing, () => later)).toEqual([`Clubs: warning, ${warning}`])

      const [health] = await database.db.select().from(matchImports)

      expect(health).toMatchObject({ lastOutcome: 'imported', lastSuccessAt: first, lastWarningAt: later })
    })

    it('changes nothing when it reads again', async () => {
      await excelsiorTwice()

      const { server } = await serve()

      await importAt(server, first)

      const before = await excelsior()
      const again = await importAt(server, new Date(first.getTime() + hours(1)))

      expect(again).toMatchObject({ clubs: [], matches: { added: 0, unchanged: 35, updated: 0 } })
      expect(await excelsior()).toEqual(before)
    })
  })

  it('writes nothing about a club in the log when the read fails, and makes no club', async () => {
    const { server } = await serve({ programme: 'Een kale pagina' })

    expect(await importAt(server, first)).toMatchObject({ kind: 'error' })
    expect(await database.db.select().from(clubs)).toEqual([])
  })

  it('moves a match to another club when the page links another article, and counts it as updated', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const relinked = original.programme.replace('[[AZ (voetbalclub)|AZ]]', '[[AZ (2)|AZ]]')

    expect(relinked).not.toBe(original.programme)

    const { server: later } = await serve({ programme: relinked })
    const report = await importAt(later, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ matches: { unchanged: 34, updated: 1 } })
    expect((await clubsByRound()).get('Eredivisie|Speelronde 5')).toMatchObject({
      page: 'AZ (2)',
      slug: 'az-2',
    })
  })
})

describe('the lines of a report', () => {
  it('cleans text from Wikipedia of control characters, in a warning as in an error', () => {
    const counts = { added: 0, held: 0, removed: 0, unchanged: 1, updated: 1 }
    const warning = 'the result of Speelronde 1 (Eredivisie) changed\u001b[31m from x\nto y'
    const imported = formatMatchReport({
      clubs: [],
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
  function drawn(pages: Pages, minute = 88) {
    return {
      programme: pages.programme
        .replace('|score = 1 – 0', '|score = 1 – 1')
        .replace('{{goal|52}}\n|goals2 =', `{{goal|52}}\n|goals2 = {{goal|${minute}}} [[Test Speler|Speler]]`),
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

  /** Round 1 was played on 9 August 2026, and this is half an hour after it ended. */
  const roundOne = new Date('2026-08-09T17:30:00Z')
  const after = (at: Date, ...spans: number[]) => new Date(at.getTime() + spans.reduce((sum, span) => sum + span, 0))
  const days = (count: number) => count * 24 * hours(1)
  const roundOneRow = async () => (await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 1')))[0]
  const changes = () => database.db.select().from(matchChanges).orderBy(asc(matchChanges.id))

  it('takes a correction of a few hours old over, with a warning, and keeps it in match_changes', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)
    Object.assign(pages, drawn(pages))

    const at = after(roundOne, hours(3))
    const report = await importAt(server, at)

    expect(report).toMatchObject({
      kind: 'imported',
      matches: { held: 0, updated: 1 },
      warnings: [
        'Speelronde 1 (Eredivisie): the result changed after 3 hours, from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente',
      ],
    })
    expect(formatMatchReport(report)).toContain('Matches 2026/27: warning, Speelronde 1 (Eredivisie): the result')
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 1, goalsFor: 1, resultSetAt: at })
    expect(await changes()).toMatchObject([
      {
        changed: 'result, goals',
        class: 'improvement',
        decidedAt: at,
        firstSeenAt: at,
        newValue: expect.stringContaining('1-1'),
        oldValue: expect.stringContaining('1-0'),
        resolution: 'applied',
        round: 'Speelronde 1',
        status: 'accepted',
      },
    ])
    expect((await database.db.select().from(matchImports))[0]).toMatchObject({
      lastWarning: expect.stringContaining('from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente'),
    })
  })

  it('does not move the day a result was first seen when only the time changes', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)
    pages.programme = pages.programme.replace(
      '|time = 16:45 uur\n|team1 = [[sc Heerenveen]]\n|score = 1 – 0',
      '|time = 17:00 uur\n|team1 = [[sc Heerenveen]]\n|score = 1 – 0',
    )
    await importAt(server, after(roundOne, hours(1)))

    expect(await roundOneRow()).toMatchObject({ kickoffAt: new Date('2026-08-09T15:00:00Z'), resultSetAt: roundOne })
  })

  it('holds a change that comes more than a day after the result was first seen', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)
    Object.assign(pages, drawn(pages))

    const report = await importAt(server, after(roundOne, hours(30)))

    expect(report).toMatchObject({ matches: { held: 1, unchanged: 34, updated: 0 } })
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 0, goalsFor: 1, resultSetAt: roundOne })
    expect(await changes()).toMatchObject([
      { class: 'suspicious', reason: 'the result changed after 30 hours', status: 'pending', timesSeen: 1 },
    ])
  })

  it('holds a result that changes after four days, keeps the old one, and says so', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)
    Object.assign(pages, drawn(pages))

    const at = after(roundOne, days(4))
    const report = await importAt(server, at)

    expect(report).toMatchObject({
      kind: 'imported',
      matches: { held: 1, updated: 0 },
      warnings: [
        'held, Speelronde 1 (Eredivisie): the result changed after 4 days, from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente',
      ],
    })
    expect(formatMatchReport(report)).toContain('1 held;')
    expect(formatMatchReport(report)).toContain('warning, held, Speelronde 1 (Eredivisie)')
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 0, goalsFor: 1, resultSetAt: roundOne })
    expect(await scorersOf('Speelronde 1')).toHaveLength(1)
    expect(await changes()).toMatchObject([
      {
        changed: 'result, goals',
        class: 'suspicious',
        decidedAt: null,
        firstSeenAt: at,
        lastSeenAt: at,
        newValue: expect.stringContaining('1-1'),
        oldValue: expect.stringContaining('1-0'),
        reason: 'the result changed after 4 days',
        resolution: null,
        status: 'pending',
        timesSeen: 1,
      },
    ])
  })

  it('takes a held change over when the page keeps it for seven days, and not before', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)
    Object.assign(pages, drawn(pages))

    const heldAt = after(roundOne, days(4))

    await importAt(server, heldAt)
    expect(await importAt(server, after(heldAt, days(7), -hours(1)))).toMatchObject({
      matches: { held: 1, updated: 0 },
    })
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 0, goalsFor: 1 })
    expect(await changes()).toMatchObject([{ status: 'pending', timesSeen: 2 }])

    const takenAt = after(heldAt, days(7))
    const report = await importAt(server, takenAt)

    expect(report).toMatchObject({ matches: { held: 0, unchanged: 34, updated: 1 }, warnings: [] })
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 1, goalsFor: 1, resultSetAt: takenAt })
    expect(await scorersOf('Speelronde 1')).toHaveLength(2)
    expect(await changes()).toMatchObject([{ decidedAt: takenAt, resolution: 'stood', status: 'accepted' }])
  })

  it('drops a held change when Wikipedia puts the old result back', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)

    const edited = { ...pages }

    Object.assign(pages, drawn(pages))
    await importAt(server, after(roundOne, days(4)))
    Object.assign(pages, edited)

    const at = after(roundOne, days(5))

    expect(await importAt(server, at)).toMatchObject({ matches: { held: 0, unchanged: 35, updated: 0 } })
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 0, goalsFor: 1 })
    expect(await changes()).toMatchObject([{ decidedAt: at, resolution: 'reverted', status: 'rejected' }])
  })

  it('starts again when Wikipedia changes the held result into something else', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)
    Object.assign(pages, drawn(pages))
    await importAt(server, after(roundOne, days(4)))
    Object.assign(pages, drawn(pages, 87))

    const at = after(roundOne, days(5))

    await importAt(server, at)
    expect(await changes()).toMatchObject([
      { resolution: 'replaced', status: 'rejected' },
      { firstSeenAt: at, status: 'pending', timesSeen: 1 },
    ])
  })

  it('holds a match that flips back to an earlier value, as a sign of an edit war', async () => {
    const { pages, server } = await serve()
    const original = { ...pages }

    await importAt(server, roundOne)
    Object.assign(pages, drawn(pages))
    await importAt(server, after(roundOne, hours(3)))
    Object.assign(pages, original)

    const report = await importAt(server, after(roundOne, hours(6)))

    expect(report).toMatchObject({
      matches: { held: 1, updated: 0 },
      warnings: [
        expect.stringContaining('held, Speelronde 1 (Eredivisie): the match is back at a value it had before'),
      ],
    })
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 1, goalsFor: 1 })
  })

  it('takes everything over the first time a season is read, since nothing stored comes from Wikipedia', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)
    // The made-up matches of the seed are in the database, and no page has been read.
    await database.pool.query('DELETE FROM wikipedia_pages')
    Object.assign(pages, drawn(pages))

    expect(await importAt(server, after(roundOne, days(4)))).toMatchObject({ matches: { held: 0, updated: 1 } })
    expect(await roundOneRow()).toMatchObject({ goalsAgainst: 1, goalsFor: 1 })
    expect(await changes()).toEqual([])
  })

  describe('more matches than six that overwrite what we have', () => {
    /** Moves the kick-off of the first `count` rounds, played long ago, by an hour. */
    function later(programme: string, count: number) {
      let result = programme

      for (let round = 1; round <= count; round++) {
        const block = new RegExp(
          `(== Speelronde ${round} ==\\n\\{\\{Footballbox2\\n\\|date = [^\\n]+\\n\\|time = )(\\d\\d):(\\d\\d)`,
          'u',
        )

        result = result.replace(
          block,
          (_, head: string, hour: string, minute: string) =>
            `${head}${String(Number(hour) + 1).padStart(2, '0')}:${minute}`,
        )
      }

      return result
    }

    it('holds six of them one by one, and the page goes through', async () => {
      const { pages, server } = await serve()

      await importAt(server, first)
      pages.programme = later(pages.programme, 6)

      const report = await importAt(server, after(first, hours(1)))

      expect(report).toMatchObject({ kind: 'imported', matches: { held: 6, unchanged: 29, updated: 0 } })
      expect(await changes()).toHaveLength(6)
    })

    it('counts the changes that wait for the limit, and says the same number everywhere', async () => {
      const { pages, server } = await serve()

      await importAt(server, first)
      pages.programme = later(pages.programme, 3)
      expect(await importAt(server, after(first, hours(1)))).toMatchObject({ matches: { held: 3 } })

      // Three still wait and four more come: seven in all.
      pages.programme = later(original.programme, 7)

      const report = await importAt(server, after(first, hours(2)))

      expect(report).toMatchObject({ kind: 'error', message: expect.stringContaining('7 matches changed at once') })
      expect((await changes()).filter((change) => change.reason.includes('7 matches changed at once'))).toHaveLength(4)
    })

    it('holds the seventh too, and the whole page with them: the last good copy stays', async () => {
      const { pages, server } = await serve()

      await importAt(server, first)

      const stored = await snapshot()

      pages.programme = later(pages.programme, 7)

      const at = after(first, hours(1))
      const report = await importAt(server, at)

      expect(report).toEqual({
        kind: 'error',
        message: expect.stringContaining('7 matches changed at once'),
        season,
      })
      expect(await snapshot()).toEqual(stored)
      expect(await changes()).toMatchObject(
        Array.from({ length: 7 }, () => ({ class: 'suspicious', status: 'pending' })),
      )
      expect((await changes())[0]?.reason).toContain('7 matches changed at once')
      expect(await health()).toMatchObject({ failuresInARow: 1, lastOutcome: 'error' })

      // The changes that wait count: the page stays held while they are on it.
      expect(await importAt(server, after(first, hours(2)))).toMatchObject({
        kind: 'error',
        message: expect.stringContaining('7 matches changed at once'),
      })
      expect(await snapshot()).toEqual(stored)
      expect(await changes()).toMatchObject(Array.from({ length: 7 }, () => ({ status: 'pending', timesSeen: 2 })))

      // After seven days of the same page they are taken over, and the page goes through.
      const taken = await importAt(server, after(at, days(7)))

      expect(taken).toMatchObject({ kind: 'imported', matches: { held: 0, unchanged: 28, updated: 7 } })
      expect(await changes()).toMatchObject(
        Array.from({ length: 7 }, () => ({ resolution: 'stood', status: 'accepted' })),
      )
    })
  })

  it('leaves the last good copy alone when the judgement fails', async () => {
    const { pages, server } = await serve()

    await importAt(server, roundOne)

    const stored = await snapshot()

    Object.assign(pages, drawn(pages))
    await database.pool.query('RENAME TABLE match_changes TO match_changes_away')

    try {
      expect(await importAt(server, after(roundOne, days(4)))).toMatchObject({
        kind: 'error',
        message: expect.stringContaining('database error'),
      })
    } finally {
      await database.pool.query('RENAME TABLE match_changes_away TO match_changes')
    }

    expect(await snapshot()).toEqual(stored)
  })

  describe('a person decides', () => {
    async function held() {
      const { pages, server } = await serve()

      await importAt(server, roundOne)
      Object.assign(pages, drawn(pages))
      await importAt(server, after(roundOne, days(4)))

      return { pages, server }
    }

    it('accepts a change: the match and its scorers become the proposal', async () => {
      await held()

      const at = after(roundOne, days(5))
      const [change] = await changes()
      const decisions = await acceptChanges(database.db, [change?.id ?? 0], at)

      expect(decisions).toMatchObject([{ message: 'accepted', ok: true }])
      expect(await roundOneRow()).toMatchObject({ goalsAgainst: 1, goalsFor: 1, resultSetAt: at })
      expect(await scorersOf('Speelronde 1')).toHaveLength(2)
      expect(await changes()).toMatchObject([{ decidedAt: at, resolution: 'person', status: 'accepted' }])
    })

    it('says so when a change waits no more', async () => {
      await held()

      const [change] = await changes()

      await acceptChanges(database.db, 'all', roundOne)
      expect(await acceptChanges(database.db, [change?.id ?? 0], roundOne)).toEqual([])
      expect(await rejectChanges(database.db, 'all', roundOne)).toEqual([])
    })

    it('rejects a change: the match stays, and the import stays quiet while the page shows the same', async () => {
      const { server } = await held()

      const at = after(roundOne, days(5))

      expect(await rejectChanges(database.db, 'all', at)).toMatchObject([{ message: 'rejected', ok: true }])
      expect(await importAt(server, after(roundOne, days(6)))).toMatchObject({
        matches: { held: 0, unchanged: 35, updated: 0 },
        warnings: [],
      })
      expect(await roundOneRow()).toMatchObject({ goalsAgainst: 0, goalsFor: 1 })
      expect(await changes()).toMatchObject([{ decidedAt: at, resolution: 'person', status: 'rejected' }])
    })

    it('accepts the removal of a match: the match goes with its scorers', async () => {
      const { pages, server } = await serve({ cup: goalsCup })

      await importAt(server, first)
      pages.cup = goalsCup.replaceAll('sc Heerenveen', 'FC Volendam')
      await importAt(server, after(first, hours(1)))
      expect(await acceptChanges(database.db, 'all', after(first, hours(2)))).toHaveLength(4)
      expect(await database.db.select().from(matches).where(eq(matches.competition, 'KNVB Beker'))).toEqual([])
      expect(await scorersOf('Eerste ronde')).toEqual([])
    })
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

    await database.db.insert(matches).values(
      await withClubs(database.db, [
        {
          competition: 'KNVB Beker',
          home: false,
          kickoffAt: first,
          matchDate: '2026-10-25',
          opponent: 'SV Proefdorp',
          round: 'Tweede ronde',
          season,
          status: 'scheduled',
        },
      ]),
    )

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
    await database.db.insert(matches).values(await withClubs(database.db, [oldMatch]))
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
    await database.db.insert(matches).values(await withClubs(database.db, [oldMatch]))

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
    const values = (await withClubs(database.db, [oldMatch]))[0]!

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
    expect(lines.flatMap((line) => line.split('\n')).filter((line) => !/: new (club|name) /u.test(line))).toEqual([
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

  it('shows the names of goals without a player on one line, without control characters', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await database.pool.query("UPDATE match_goals SET player = 'Oy\nen\u0007' WHERE player = 'Oyen'")

    const line = (await status(first)).text.split('\n').find((item) => item.includes('goals of ours'))

    expect(line).toContain('Oy en')
    expect(line).not.toContain('\u0007')
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

describe('the play-offs for the Conference League', () => {
  const playoffs = fixture('wikipedia-playoffs-2026.wiki')
  const withoutUs = fixture('wikipedia-playoffs-2024.wiki')
  const playoffPage = 'Play-offs Nederlands voetbal 2027'
  const stored = () => database.db.select().from(matches).where(eq(matches.competition, 'Play-offs Conference League'))
  const playoffPages = () => database.db.select().from(wikipediaPages).where(eq(wikipediaPages.kind, 'playoffs'))

  it('stores the match of sc Heerenveen with its goals, and the page it came from', async () => {
    const { server } = await serve({ playoffs })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 36, removed: 0, unchanged: 0, updated: 0 } })
    expect(await stored()).toMatchObject([
      {
        competition: 'Play-offs Conference League',
        goalsAgainst: 3,
        goalsFor: 2,
        home: false,
        matchDate: '2026-05-21',
        opponent: 'FC Utrecht',
        round: 'Halve finale',
        season,
        stadium: 'Stadion Galgenwaard',
        status: 'played',
      },
    ])

    const goals = await database.db
      .select({ minute: matchGoals.minute, ours: matchGoals.ours, player: matchGoals.player })
      .from(matchGoals)
      .innerJoin(matches, eq(matchGoals.matchId, matches.id))
      .where(eq(matches.competition, 'Play-offs Conference League'))
      .orderBy(asc(matchGoals.id))

    expect(goals).toEqual([
      { minute: 46, ours: false, player: 'Stepanov' },
      { minute: 54, ours: true, player: 'Vente' },
      { minute: 56, ours: false, player: 'Van der Hoorn' },
      { minute: 58, ours: false, player: 'El Karouani' },
      { minute: 77, ours: true, player: 'Trenskow' },
    ])
    expect(await playoffPages()).toMatchObject([{ season, title: playoffPage }])
  })

  it('does not change the table or the numbers of the league', async () => {
    const { server } = await serve({ playoffs })

    await importAt(server, first)

    const [ours] = await database.db.select().from(standings).where(eq(standings.club, 'sc Heerenveen'))
    const league = await database.db.select().from(matches).where(eq(matches.competition, 'Eredivisie'))

    expect(league).toHaveLength(34)
    expect(ours).toMatchObject({ played: league.filter((match) => match.status === 'played').length })
  })

  it('does not call a page that is not there a failure: no match, no page, and no failed run', async () => {
    const { server } = await serve({ playoffs: null })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 35 } })
    expect(pageRequests(server)).toContain('/wiki/Play-offs_Nederlands_voetbal_2027?action=raw')
    expect(await stored()).toEqual([])
    expect(await playoffPages()).toEqual([])
    expect(await health()).toMatchObject({ failuresInARow: 0, lastError: null, lastOutcome: 'imported' })
  })

  it('does not call a year without sc Heerenveen a failure, and credits no page', async () => {
    const { server } = await serve({ playoffs: withoutUs })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 35 } })
    expect(await stored()).toEqual([])
    expect(await playoffPages()).toEqual([])
    expect(await health()).toMatchObject({ failuresInARow: 0, lastOutcome: 'imported' })
  })

  it('keeps the play-off match it has when the page is gone, since a page that is not there says nothing', async () => {
    const { pages, server } = await serve({ playoffs })

    await importAt(server, first)
    Object.assign(pages, { playoffs: null })

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 0, removed: 0, unchanged: 35 } })
    expect(await stored()).toHaveLength(1)
    expect(await playoffPages()).toHaveLength(1)
    expect(await health()).toMatchObject({ failuresInARow: 0 })
  })

  it('removes the play-off match and the credit when the page has not had sc Heerenveen for seven days', async () => {
    const { pages, server } = await serve({ playoffs })

    await importAt(server, first)
    Object.assign(pages, { playoffs: withoutUs })

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 0, held: 1, removed: 0, unchanged: 35 } })
    expect(await stored()).toHaveLength(1)
    expect(await playoffPages()).toHaveLength(1)

    // After seven days of the same page the removal is taken over, and the credit goes with it.
    await importAt(server, new Date(first.getTime() + 8 * 24 * hours(1)))
    expect(await stored()).toEqual([])
    expect(await playoffPages()).toEqual([])
  })

  it('holds a changed result, like the other matches', async () => {
    const { pages, server } = await serve({ playoffs })

    await importAt(server, first)
    Object.assign(pages, {
      playoffs: playoffs
        .replace('|score = 3 – 2', '|score = 4 – 2')
        .replace('{{goal|58}}', '{{goal|58}}<br />[[Test|Tester]] {{goal|88}}'),
    })

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 0, held: 1, unchanged: 35, updated: 0 } })
    expect(await stored()).toMatchObject([{ goalsAgainst: 3, goalsFor: 2 }])
  })

  describe('an error that is a failure', () => {
    const failures: [string, Partial<ServedPages>, string][] = [
      ['an answer of 500 for the page', { playoffs: 500 }, 'HTTP 500'],
      [
        'a page whose heading for the Conference League has changed',
        { playoffs: playoffs.replace('== Play-offs voor de UEFA Conference League ==', '== Play-offs voor Europa ==') },
        "the play-offs page has no section 'Play-offs voor de UEFA Conference League'",
      ],
      [
        'a match of ours with a date we do not know',
        {
          playoffs: playoffs.replace(
            '|date = 21 mei 2026\n|time = 21:00 uur',
            '|date = laat in mei\n|time = 21:00 uur',
          ),
        },
        'has a date we do not know',
      ],
    ]

    it.each(failures)(
      'leaves the last good copy, says why and counts the failure: %s',
      async (_name, change, reason) => {
        const { pages, server } = await serve({ playoffs })

        await importAt(server, first)

        const before = await snapshot()

        Object.assign(pages, change)

        const report = await importAt(server, new Date(first.getTime() + hours(1)))

        expect(report.kind).toBe('error')
        expect(formatMatchReport(report)).toContain(reason)
        expect(await snapshot()).toEqual(before)
        expect(await health()).toMatchObject({ failuresInARow: 1, lastOutcome: 'error' })
      },
    )
  })
})
