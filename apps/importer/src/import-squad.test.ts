import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { mergeChosenPersons } from '@fansite/db/person-merge'
import {
  auditLog,
  feeds,
  matchAppearances,
  matches,
  matchGoals,
  matchReports,
  personPages,
  persons,
  playerFieldDifferences,
  playerListTitles,
  players,
  playerSeasonStats,
  playerStatDifferences,
  sources,
  squadImports,
  wikipediaPages,
} from '@fansite/db/schema'
import { madeUpSquad } from '@fansite/db/seed'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { formatSquadReport, importSquad, storeChosenSpellings } from './import-squad.ts'
import { squadPageTitle } from './read-squad.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { showStatus } from './status.ts'
import { articleRoutes } from './test-articles.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Sat, 17 Oct 2026 07:23:24 GMT' }

/** Sunday 25 October 2026. */
const first = new Date('2026-10-25T12:00:00Z')

const hours = (count: number) => count * 60 * 60 * 1000

const season = '2026/27'

const original = fixture('wikipedia-squad.wiki')

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
    'audit_log',
    'player_season_stats',
    'players',
    'squad_imports',
    'squad_completeness',
    'wikipedia_pages',
    'match_changes',
    'matches',
    'persons',
    'league_results',
    'standings',
    'match_imports',
    'sources',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Runs the squad import at this moment against this server. */
function importAt(server: TestServer, at: Date) {
  return importSquad(database.db, fetcherFor([server]), { clock: () => at, origin: server.origin })
}

/** The requests for pages so far; the robots.txt is not counted. */
function pageRequests(server: TestServer) {
  return server.paths().filter((path) => path !== '/robots.txt')
}

/**
 * Starts a web server on this computer that serves the squad page of the seasons as Wikipedia
 * does, from `squad`, which a test can change between runs. With `matchPages` it serves the
 * pages of the matches too. The tests ask no real site.
 */
async function serve(squad: null | string = original, { matchPages = false, robots = '' } = {}) {
  const current = { squad }
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, robots, { 'Content-Type': 'text/plain' }) }

  for (const year of ['2026/27', '2027/28']) {
    routes[pageUrl('', squadPageTitle(year))] = (_request, response) => {
      response.writeHead(current.squad === null ? 404 : 200, wiki)
      response.end(current.squad ?? 'Niet gevonden')
    }
  }
  if (matchPages) {
    const pages = pageTitles(season)

    routes[pageUrl('', pages.cup)] = reply(200, fixture('wikipedia-cup.wiki'), wiki)
    routes[pageUrl('', pages.programme)] = reply(200, fixture('wikipedia-programme.wiki'), wiki)
    routes[pageUrl('', pages.standings)] = reply(200, fixture('wikipedia-standings.wiki'), wiki)
  }

  const server = await startServer({
    ...articleRoutes(
      matchPages
        ? [
            original,
            fixture('wikipedia-cup.wiki'),
            fixture('wikipedia-programme.wiki'),
            fixture('wikipedia-standings.wiki'),
          ]
        : [original],
    ),
    ...articleRoutes([], { titles: ['Pim Verbeek', 'Anderen Pagina'] }),
    ...routes,
  })

  servers.push(server)

  return { page: current, server }
}

/** Everything the import writes, to see that a failing run changed none of it. */
async function snapshot() {
  return {
    pages: await database.db.select().from(wikipediaPages).orderBy(asc(wikipediaPages.title)),
    players: await database.db.select().from(players).orderBy(asc(players.id)),
  }
}

/** The page without the rows of these players, by name. A row starts at its `|-` line. */
function without(text: string, ...names: string[]) {
  return text
    .split(/(?=^\|-)/mu)
    .filter((row) => !names.some((name) => row.includes(`[[${name}]]`)))
    .join('')
}

describe('the first import, into an empty database', () => {
  it('stores the players of the table with a search term, and the page it read', async () => {
    const { server } = await serve()

    const report = await importAt(server, first)

    expect(report).toEqual({
      completeness: 'Completeness 2026/27: 95% compleet, 25 players, new',
      countries: { known: 25, total: 25 },
      kind: 'imported',
      persons: [
        'persons: 25 titles asked, 25 new persons, 25 titles remembered, 25 names stored (25 from a sort key, 0 guessed, 0 from the list)',
      ],
      players: { added: 25, left: 0, unchanged: 0, updated: 0 },
      season,
      stats: { added: 50, unchanged: 0, updated: 0 },
      warnings: [],
    })
    expect(formatSquadReport(report)).toBe(
      [
        'Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad',
        'Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged',
        'Squad 2026/27: countries of the players: 25 of 25 have one',
        'Squad 2026/27: persons: 25 titles asked, 25 new persons, 25 titles remembered, 25 names stored (25 from a sort key, 0 guessed, 0 from the list)',
        'Completeness 2026/27: 95% compleet, 25 players, new',
      ].join('\n'),
    )

    const stored = await database.db.select().from(players).orderBy(asc(players.id))

    expect(stored).toHaveLength(25)
    expect(stored.every((player) => player.season === season)).toBe(true)
    expect(stored[0]).toMatchObject({
      name: 'Bernt Klaverboer',
      position: 'doelman',
      searchTerm: 'Klaverboer',
      shirtNumber: 22,
      wikipediaPage: 'Bernt Klaverboer',
    })
    expect(stored.every((player) => player.inSquad && player.leftSquadAt === null)).toBe(true)
    expect(stored.every((player) => player.source === 'selectie')).toBe(true)
    expect(stored.find((player) => player.name === 'Sten Kremers')).toMatchObject({
      position: 'doelman',
      searchTerm: 'Kremers',
      shirtNumber: null,
    })
    expect(new Set(stored.map((player) => player.position))).toEqual(
      new Set(['aanvaller', 'doelman', 'middenvelder', 'verdediger']),
    )
    expect(await database.db.select().from(wikipediaPages)).toEqual([
      {
        kind: 'squad',
        language: 'nl',
        readAt: first,
        season,
        title: 'Sc Heerenveen in het seizoen 2026/27 (mannen)',
        version: wiki['Last-Modified'],
      },
    ])
  })

  it('fetches only /wiki/<page>?action=raw, once for the squad and once for each player, with the user agent of the importer', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const titles = (await database.db.select().from(players).orderBy(asc(players.id))).map(
      (player) => `/wiki/${encodeURI(player.wikipediaPage?.replaceAll(' ', '_') ?? '')}?action=raw`,
    )

    expect(titles).toHaveLength(25)
    expect(pageRequests(server)).toEqual(['/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)?action=raw', ...titles])
    expect(String(server.requests[0]?.headers['user-agent'])).toMatch(
      /^scHeerenveenFansite\/.+ \(\+https:\/\/github\.com\//u,
    )
  })

  it('records the health of the import', async () => {
    const { server } = await serve()

    await importAt(server, first)

    expect(await database.db.select().from(squadImports)).toEqual([
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

  it('stores a name that Wikipedia writes with a disambiguation without it', async () => {
    const { server } = await serve(original.replace('[[Dylan Vente]]', '[[Dylan Vente (voetballer)]]'))

    await importAt(server, first)

    expect(await database.db.select().from(players).where(eq(players.name, 'Dylan Vente'))).toMatchObject([
      { searchTerm: 'Vente', wikipediaPage: 'Dylan Vente (voetballer)' },
    ])
  })
})

describe('reading again', () => {
  it('reads at most once an hour, and then finds nothing changed', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const early = await importAt(server, new Date(first.getTime() + 30 * 60 * 1000))

    expect(early).toMatchObject({ kind: 'postponed', retryAt: new Date(first.getTime() + 59 * 60 * 1000) })
    // The squad page and the 25 players. A postponed read asks nothing.
    expect(pageRequests(server)).toHaveLength(26)

    const later = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(later).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 25, updated: 0 } })
    // Only the squad page: every player is known, so he costs no request.
    expect(pageRequests(server)).toHaveLength(27)
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  /** The page after Marko Farji left, Pim Verbeek came and Dirk Proper changed his number. */
  const changed = () =>
    without(original, 'Marko Farji')
      .replace(
        '\n|}',
        "\n|-\n|'''30'''||{{NL-VLAG}}|| align=\"left\" |[[Pim Verbeek]]||2028||0||0||0||0||0||0||'''0'''||'''0'''||'''0'''\n|}",
      )
      .replace(
        "|'''6'''\n|{{NL-VLAG}}\n| align=\"left\" |[[Dirk Proper]]",
        "|'''8'''\n|{{NL-VLAG}}\n| align=\"left\" |[[Dirk Proper]]",
      )

  it('updates the squad: a player who left stays, marked as gone, a new one comes, a new number is taken over', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const before = await database.db.select().from(players).orderBy(asc(players.id))

    page.squad = changed()

    const later = new Date(first.getTime() + hours(1))
    const report = await importAt(server, later)

    expect(report).toMatchObject({ kind: 'imported', players: { added: 1, left: 1, unchanged: 23, updated: 1 } })
    expect(formatSquadReport(report)).toBe(
      [
        'Squad 2026/27: 1 new, 1 updated, 23 unchanged, 1 left the squad',
        'Squad 2026/27: numbers of the players: 2 new, 0 updated, 48 unchanged',
        'Squad 2026/27: countries of the players: 25 of 25 have one',
        'Squad 2026/27: persons: 1 title asked, 1 new person, 1 title remembered, 1 name stored (1 from a sort key, 0 guessed, 0 from the list)',
        'Completeness 2026/27: 95% compleet, 26 players, was 95% compleet with 25 players',
      ].join('\n'),
    )

    const after = await database.db.select().from(players).orderBy(asc(players.id))
    const named = (name: string) => after.find((player) => player.name === name)

    expect(after).toHaveLength(26)
    expect(named('Marko Farji')).toMatchObject({ inSquad: false, leftSquadAt: later, wikipediaPage: 'Marko Farji' })
    expect(named('Pim Verbeek')).toMatchObject({ inSquad: true, leftSquadAt: null })
    expect(named('Dirk Proper')).toMatchObject({ shirtNumber: 8 })
    // Nobody who is in the table or was in it before gets a new id.
    expect(after.slice(0, 25).map((player) => [player.id, player.name])).toEqual(
      before.map((player) => [player.id, player.name]),
    )
  })

  it('stores the country of the flag, and takes over a flag that changes or goes', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const country = async (name: string) =>
      (await database.db.select().from(players).where(eq(players.name, name)))[0]?.country

    expect(await country('Dirk Proper')).toBe('NL')
    expect(await country('Marko Farji')).toBe('IQ')
    expect(new Set((await database.db.select().from(players)).map((player) => player.country))).toEqual(
      new Set(['BE', 'BG', 'CD', 'DK', 'FR', 'GR', 'ID', 'IQ', 'LV', 'NL', 'NO', 'SE', 'SR']),
    )

    page.squad = original.replace(
      '|{{NL-VLAG}}\n| align="left" |[[Dirk Proper]]',
      '|{{BE-VLAG}}\n| align="left" |[[Dirk Proper]]',
    )

    const changed = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(changed).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 24, updated: 1 } })
    expect(await country('Dirk Proper')).toBe('BE')

    page.squad = original.replace('|{{NL-VLAG}}\n| align="left" |[[Dirk Proper]]', '|\n| align="left" |[[Dirk Proper]]')

    const gone = await importAt(server, new Date(first.getTime() + hours(2)))

    expect(gone).toMatchObject({ countries: { known: 24, total: 25 }, kind: 'imported', players: { updated: 1 } })
    expect(await country('Dirk Proper')).toBeNull()
  })

  it('leaves the country empty and warns when the flag is not a country of two letters', async () => {
    const { page, server } = await serve()

    page.squad = original.replace(
      '|{{NL-VLAG}}\n| align="left" |[[Dirk Proper]]',
      '|{{ENG-VLAG}}\n| align="left" |[[Dirk Proper]]',
    )

    const report = await importAt(server, first)

    expect(report).toMatchObject({
      countries: { known: 24, total: 25 },
      kind: 'imported',
      warnings: ["Dirk Proper: the country '{{ENG-VLAG}}' is not one we know, so it is left empty"],
    })
    expect((await database.db.select().from(players).where(eq(players.name, 'Dirk Proper')))[0]?.country).toBeNull()
  })

  it('keeps the id of a player when his number, position, name or page change', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const [klaverboer] = await database.db.select().from(players).where(eq(players.name, 'Bernt Klaverboer'))

    // A new spelling of the name, on the same page.
    page.squad = original.replace('[[Bernt Klaverboer]]', '[[Bernt Klaverboer|Bernt Klaverboer-Jansen]]')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(players).where(eq(players.id, klaverboer!.id))).toMatchObject([
      { name: 'Bernt Klaverboer-Jansen', wikipediaPage: 'Bernt Klaverboer' },
    ])
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('does not mark a player who is gone again, and does not move the moment he left', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = changed()

    const left = new Date(first.getTime() + hours(1))

    await importAt(server, left)

    const report = await importAt(server, new Date(first.getTime() + hours(2)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 25, updated: 0 } })
    expect(await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))).toMatchObject([
      { inSquad: false, leftSquadAt: left },
    ])
  })

  it('puts a player who comes back in the squad again, with his old id', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const [farji] = await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))

    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))
    page.squad = original

    const report = await importAt(server, new Date(first.getTime() + hours(2)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 24, updated: 1 } })
    expect(await database.db.select().from(players)).toHaveLength(25)
    expect(await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))).toMatchObject([
      { id: farji!.id, inSquad: true, leftSquadAt: null },
    ])
  })

  it('fills the page of a player from before the pages were kept, and keeps his id', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await database.db.update(players).set({ wikipediaPage: null })

    const before = await database.db.select().from(players).orderBy(asc(players.id))
    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 0, updated: 25 } })

    const after = await database.db.select().from(players).orderBy(asc(players.id))

    expect(after.map((player) => [player.id, player.inSquad])).toEqual(before.map((player) => [player.id, true]))
    expect(after.every((player) => player.wikipediaPage !== null)).toBe(true)
    expect(after.find((player) => player.name === 'Roberts Uldrikis')?.wikipediaPage).toBe('Roberts Uldriķis')
  })

  it('replaces the made-up squad of the seed with the first good read, and nothing after it', async () => {
    await database.db.insert(players).values(madeUpSquad(first))

    const { page, server } = await serve()

    expect(await database.db.select().from(players)).toHaveLength(madeUpSquad(first).length)
    await importAt(server, first)

    const read = await database.db.select().from(players).orderBy(asc(players.id))

    expect(read).toHaveLength(25)
    expect(read.map((player) => player.name)).not.toContain('Tjerk Brandsma')

    // After that a player who is gone stays.
    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('does not replace anything after a failed first read', async () => {
    await database.db.insert(players).values(madeUpSquad(first))

    const { server } = await serve(original.replace('=== Spelers ===', '=== Selectie ==='))

    expect(await importAt(server, first)).toMatchObject({ kind: 'error' })
    expect(await database.db.select().from(players)).toHaveLength(madeUpSquad(first).length)
  })

  it('keeps the goals of a player who left, and of every player in the squad, linked to the same id', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const [farji] = await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))
    const [match] = await database.db
      .insert(matches)
      .values(
        await withClubs(database.db, [
          {
            competition: 'Eredivisie',
            goalsAgainst: 0,
            goalsFor: 1,
            home: true,
            kickoffAt: first,
            matchDate: '2026-10-25',
            opponent: 'Testdorp FC',
            round: 'Speelronde 1',
            season,
            status: 'played',
          },
        ]),
      )
      .$returningId()

    await database.db.insert(matchGoals).values({
      matchId: match!.id,
      minute: 10,
      ours: true,
      player: 'Farji',
      playerId: farji!.id,
      wikipediaPage: 'Marko Farji',
    })
    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(matchGoals)).toMatchObject([{ playerId: farji!.id }])
  })

  it('keeps the search term of a player that is known, so a correction survives', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await database.db.update(players).set({ searchTerm: 'Vente (Dylan)' }).where(eq(players.name, 'Dylan Vente'))
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect((await database.db.select().from(players).where(eq(players.name, 'Dylan Vente')))[0]?.searchTerm).toBe(
      'Vente (Dylan)',
    )
  })

  it('treats a name that differs only in an accent as the same player', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = original.replace('[[Luca Oyen]]', '[[Luca Öyen]]')

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 24, updated: 1 } })
    expect(await database.db.select().from(players)).toHaveLength(25)
    expect(await database.db.select().from(players).where(eq(players.shirtNumber, 11))).toMatchObject([
      { name: 'Luca Öyen', searchTerm: 'Oyen' },
    ])
  })

  it('merges the persons the owner said are one person at the start of a run, and says so once', async () => {
    const { server } = await serve()
    const [{ insertId: kept }] = await database.db.insert(persons).values({ wikipediaPage: 'Uğur Yıldırım' })

    await database.db.insert(persons).values({ wikipediaPage: 'Ugur Yıldırım' })

    const report = await importAt(server, first)
    const titles = async () => (await database.db.select().from(persons)).map((row) => row.wikipediaPage)

    expect(report.kind === 'imported' ? report.warnings : []).toContain(
      "Persons: 'Ugur Yıldırım' is merged into 'Uğur Yıldırım'",
    )
    expect(await titles()).toContain('Uğur Yıldırım')
    expect(await titles()).not.toContain('Ugur Yıldırım')
    expect(await database.db.select().from(personPages).where(eq(personPages.page, 'Ugur Yıldırım'))).toEqual([
      { page: 'Ugur Yıldırım', personId: kept },
    ])

    const again = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(again.kind).toBe('imported')
    expect((again.kind === 'imported' ? again.warnings : []).filter((line) => line.includes('merged'))).toEqual([])
  })

  it('merges Filip Djuričić into Filip Đuričić, and a second run changes nothing', async () => {
    const { server } = await serve()
    const [{ insertId: kept }] = await database.db.insert(persons).values({ wikipediaPage: 'Filip Đuričić' })
    const [{ insertId: gone }] = await database.db.insert(persons).values({ wikipediaPage: 'Filip Djuričić' })

    const report = await importAt(server, first)
    const rows = await database.db.select().from(persons)

    expect(report.kind === 'imported' ? report.warnings : []).toContain(
      "Persons: 'Filip Djuričić' is merged into 'Filip Đuričić'",
    )
    expect(rows.map((row) => row.id)).toContain(kept)
    expect(rows.map((row) => row.id)).not.toContain(gone)
    expect(await database.db.select().from(personPages).where(eq(personPages.page, 'Filip Djuričić'))).toEqual([
      { page: 'Filip Djuričić', personId: kept },
    ])

    const again = await importAt(server, new Date(first.getTime() + hours(1)))

    expect((again.kind === 'imported' ? again.warnings : []).filter((line) => line.includes('merged'))).toEqual([])
  })

  it('keeps one row and the spelling that stays when the table writes the other title again', async () => {
    const { page, server } = await serve(original.replace('[[Luca Oyen]]', '[[Jan Harm Schippers]]'))

    await importAt(server, first)

    const [before] = await database.db.select().from(players).where(eq(players.name, 'Jan Harm Schippers'))

    expect(before).toMatchObject({ wikipediaPage: 'Jan Harm Schippers' })
    page.squad = original.replace('[[Luca Oyen]]', '[[Jan-Harm Schippers]]')

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 25, updated: 0 } })
    expect(await database.db.select().from(players)).toHaveLength(25)
    expect(await database.db.select().from(players).where(eq(players.id, before!.id))).toMatchObject([
      { name: 'Jan Harm Schippers', personId: before!.personId, wikipediaPage: 'Jan Harm Schippers' },
    ])
    expect(
      (await database.db.select().from(persons)).filter((row) => row.wikipediaPage?.includes('Schippers')),
    ).toMatchObject([{ id: before!.personId, wikipediaPage: 'Jan Harm Schippers' }])
  })

  it.each([
    ['Igor Kornejev', 'Igor Korneev'],
    ['Arkadiusz Radomski', 'Arek Radomski'],
    ['Mugur Radu Gușatu', 'Radu Gușatu'],
  ])(
    'stores %s under the name the owner chose, %s, also when the table writes the title again',
    async (title, name) => {
      const { page, server } = await serve(original.replace('[[Luca Oyen]]', `[[${title}]]`))

      await importAt(server, first)

      const [before] = await database.db.select().from(players).where(eq(players.wikipediaPage, title))

      expect(before).toMatchObject({ name, wikipediaPage: title })
      page.squad = original.replace('[[Luca Oyen]]', `[[${title}|${title}]]`)

      const report = await importAt(server, new Date(first.getTime() + hours(1)))

      expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 25, updated: 0 } })
      expect(await database.db.select().from(players).where(eq(players.wikipediaPage, title))).toMatchObject([
        { id: before!.id, name, personId: before!.personId },
      ])
    },
  )

  it.each([
    ['Jan-Harm Schippers', 'Schippers', 'Jan Harm Schippers', 'Schippers'],
    ['Robert van der Berg', 'van der Berg', 'Robert van den Berg', 'van den Berg'],
  ])(
    'renames the row of %s when the row and the table both have the other spelling still',
    async (other, otherTerm, stays, term) => {
      const { page, server } = await serve()

      await importAt(server, first)

      // A row of before the owner chose: the name and the page are the other spelling.
      const [oyen] = await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))

      await database.db
        .update(players)
        .set({ name: other, searchTerm: otherTerm, wikipediaPage: other })
        .where(eq(players.id, oyen!.id))
      page.squad = original.replace('[[Luca Oyen]]', `[[${other}]]`)

      const report = await importAt(server, new Date(first.getTime() + hours(1)))

      expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0 } })
      // The season ends with one row for him: the same row, in the spelling that stays.
      expect(await database.db.select().from(players)).toHaveLength(25)
      expect(
        (await database.db.select().from(players)).filter((row) => [other, stays].includes(row.name)),
      ).toMatchObject([{ id: oyen!.id, inSquad: true, name: stays, searchTerm: term, wikipediaPage: stays }])
    },
  )

  describe('a player the import of the matches made of a scorer (#1024)', () => {
    const scorer = { searchTerm: 'Klaverboer', season, source: 'doelpunten' as const }

    it('gets the row of the table when the table has him: the same id, the source selectie, no second row', async () => {
      await database.db
        .insert(players)
        .values({ ...scorer, name: 'Bernt Klaverboer', wikipediaPage: 'Bernt Klaverboer' })

      const [before] = await database.db.select().from(players)
      const { server } = await serve()
      const report = await importAt(server, first)

      expect(report).toMatchObject({ kind: 'imported', players: { added: 24, left: 0, updated: 1 } })
      expect(await database.db.select().from(players)).toHaveLength(25)
      expect(await database.db.select().from(players).where(eq(players.id, before!.id))).toMatchObject([
        { inSquad: true, name: 'Bernt Klaverboer', source: 'selectie' },
      ])
      expect((await database.db.select().from(players).where(eq(players.id, before!.id)))[0]?.position).not.toBeNull()
      // The next read finds him unchanged.
      expect(await importAt(server, new Date(first.getTime() + hours(1)))).toMatchObject({
        players: { added: 0, unchanged: 25, updated: 0 },
      })
    })

    it('is found by his person when the table links another title of his page', async () => {
      const [{ insertId: personId }] = await database.db.insert(persons).values({ wikipediaPage: 'Bernt Klaverboer' })

      await database.db.insert(personPages).values([
        { page: 'Bernt Klaverboer', personId },
        { page: 'B. Klaverboer', personId },
      ])
      await database.db
        .insert(players)
        .values({ ...scorer, name: 'B. Klaverboer', personId, wikipediaPage: 'B. Klaverboer' })

      const [before] = await database.db.select().from(players)
      const { server } = await serve()

      expect(await importAt(server, first)).toMatchObject({ players: { added: 24, updated: 1 } })
      expect(await database.db.select().from(players).where(eq(players.personId, personId))).toMatchObject([
        { id: before!.id, name: 'Bernt Klaverboer', source: 'selectie', wikipediaPage: 'Bernt Klaverboer' },
      ])
    })

    it('stays in the squad, with his source, while the table does not have him', async () => {
      await database.db.insert(players).values({
        ...scorer,
        name: 'Pelle van Amersfoort',
        searchTerm: 'van Amersfoort',
        wikipediaPage: 'Pelle van Amersfoort',
      })

      const { server } = await serve()

      expect(await importAt(server, first)).toMatchObject({ players: { added: 25, left: 0 } })
      expect(await importAt(server, new Date(first.getTime() + hours(1)))).toMatchObject({
        players: { left: 0, unchanged: 25 },
      })
      expect(await database.db.select().from(players).where(eq(players.name, 'Pelle van Amersfoort'))).toMatchObject([
        { inSquad: true, leftSquadAt: null, source: 'doelpunten' },
      ])
    })
  })
})

describe('what the editors set of a player (#1022)', () => {
  const later = new Date(first.getTime() + hours(1))
  const evenLater = new Date(first.getTime() + hours(2))
  const klaverboer = async () =>
    (await database.db.select().from(players).where(eq(players.wikipediaPage, 'Bernt Klaverboer')))[0]!
  const waiting = () =>
    database.db
      .select()
      .from(playerFieldDifferences)
      .orderBy(asc(playerFieldDifferences.field), asc(playerFieldDifferences.id))

  it('leaves the fields the editors set alone, and still writes the others', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const before = await klaverboer()

    // The editors gave him another name, number and line. The table then changes his flag.
    await database.db
      .update(players)
      .set({
        editorsFields: ['name', 'shirt_number', 'position'],
        name: 'Bernt K.',
        position: 'aanvaller',
        shirtNumber: 1,
      })
      .where(eq(players.id, before.id))
    page.squad = original.replace(
      '{{NL-VLAG}}|| align="left" |[[Bernt Klaverboer]]',
      '{{BE-VLAG}}|| align="left" |[[Bernt Klaverboer]]',
    )

    expect(await importAt(server, later)).toMatchObject({ players: { added: 0, left: 0, unchanged: 24, updated: 1 } })
    expect(await klaverboer()).toMatchObject({
      country: 'BE',
      editorsFields: ['name', 'shirt_number', 'position'],
      id: before.id,
      name: 'Bernt K.',
      position: 'aanvaller',
      shirtNumber: 1,
      source: 'selectie',
    })
    // The next read finds him unchanged, and writes nothing.
    expect(await importAt(server, evenLater)).toMatchObject({ players: { unchanged: 25, updated: 0 } })
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('keeps what the table says instead as a difference that waits, once, and closes one that is gone', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const before = await klaverboer()

    await database.db
      .update(players)
      .set({
        editorsFields: ['name', 'shirt_number', 'position'],
        name: 'Bernt K.',
        position: 'aanvaller',
        shirtNumber: 1,
      })
      .where(eq(players.id, before.id))
    await importAt(server, later)

    expect(await waiting()).toMatchObject([
      { editorsValue: 'Bernt K.', field: 'name', importValue: 'Bernt Klaverboer', playerId: before.id, season },
      { editorsValue: '1', field: 'shirt_number', importValue: '22', status: 'pending' },
      { editorsValue: 'aanvaller', field: 'position', firstSeenAt: later, importValue: 'doelman', lastSeenAt: later },
    ])

    // The editors make the number that of the table: that difference closes itself, and the
    // other two are seen again and not kept twice.
    await database.db.update(players).set({ shirtNumber: 22 }).where(eq(players.id, before.id))
    await importAt(server, evenLater)

    expect(await waiting()).toMatchObject([
      { field: 'name', firstSeenAt: later, lastSeenAt: evenLater, status: 'pending' },
      { decidedAt: evenLater, field: 'shirt_number', resolution: 'reverted', status: 'rejected' },
      { field: 'position', firstSeenAt: later, lastSeenAt: evenLater, status: 'pending' },
    ])
    expect(await klaverboer()).toMatchObject({ name: 'Bernt K.', position: 'aanvaller', shirtNumber: 22 })
  })

  it('keeps a player the editors added in the squad when the table does not have him, also in the first read', async () => {
    await database.db
      .insert(players)
      .values([
        ...madeUpSquad(first),
        { editorsFields: ['name'], name: 'Sanne Spits', searchTerm: 'Spits', season, source: 'redactie' },
      ])

    const { server } = await serve()

    expect(await importAt(server, first)).toMatchObject({ players: { added: 25, left: 0 } })
    expect(await importAt(server, later)).toMatchObject({ players: { left: 0, unchanged: 25 } })
    expect(await database.db.select().from(players)).toHaveLength(26)
    expect(await database.db.select().from(players).where(eq(players.name, 'Sanne Spits'))).toMatchObject([
      { inSquad: true, leftSquadAt: null, source: 'redactie' },
    ])
  })

  it('merges the player of the table into the player of the editors with the same page, and fills in what he lacks', async () => {
    await database.db.insert(players).values({
      editorsFields: ['name', 'wikipedia_page'],
      name: 'Bernt K.',
      searchTerm: 'K.',
      season,
      source: 'redactie',
      wikipediaPage: 'Bernt Klaverboer',
    })

    const [before] = await database.db.select().from(players)
    const { server } = await serve()

    expect(await importAt(server, first)).toMatchObject({ players: { added: 24, left: 0, updated: 1 } })
    expect(await database.db.select().from(players)).toHaveLength(25)

    const after = await klaverboer()

    expect(after).toMatchObject({
      country: 'NL',
      id: before!.id,
      name: 'Bernt K.',
      position: 'doelman',
      shirtNumber: 22,
      source: 'redactie',
    })
    expect(after.personId).not.toBeNull()
    // The numbers of the table are his.
    expect(
      await database.db.select().from(playerSeasonStats).where(eq(playerSeasonStats.playerId, after.id)),
    ).not.toEqual([])
    expect(await waiting()).toMatchObject([
      { editorsValue: 'Bernt K.', field: 'name', importValue: 'Bernt Klaverboer' },
    ])
  })

  it('finds a player of the editors by his person when the table links another title, and keeps their page', async () => {
    const [{ insertId: personId }] = await database.db.insert(persons).values({ wikipediaPage: 'Bernt Klaverboer' })

    await database.db.insert(personPages).values([
      { page: 'Bernt Klaverboer', personId },
      { page: 'B. Klaverboer', personId },
    ])
    await database.db.insert(players).values({
      editorsFields: ['name', 'wikipedia_page'],
      name: 'B. Klaverboer',
      personId,
      searchTerm: 'Klaverboer',
      season,
      source: 'redactie',
      wikipediaPage: 'B. Klaverboer',
    })

    const [before] = await database.db.select().from(players)
    const { server } = await serve()

    expect(await importAt(server, first)).toMatchObject({ players: { added: 24, updated: 1 } })
    expect(await database.db.select().from(players).where(eq(players.personId, personId))).toMatchObject([
      { id: before!.id, name: 'B. Klaverboer', shirtNumber: 22, wikipediaPage: 'B. Klaverboer' },
    ])
    expect(await waiting()).toMatchObject([
      { editorsValue: 'B. Klaverboer', field: 'name', importValue: 'Bernt Klaverboer' },
      { editorsValue: 'B. Klaverboer', field: 'wikipedia_page', importValue: 'Bernt Klaverboer' },
    ])
  })

  it('makes a person the editors made without an article the person of the page the table links', async () => {
    const [{ insertId: untitled }] = await database.db
      .insert(persons)
      .values({ familyName: 'Klaverboer', givenName: 'Bernt', name: 'Bernt Klaverboer', nameSource: 'redactie' })

    await database.db.insert(players).values({
      editorsFields: ['name'],
      name: 'Bernt Klaverboer',
      personId: untitled,
      searchTerm: 'Klaverboer',
      season,
      source: 'redactie',
    })

    const [before] = await database.db.select().from(players)
    const { server } = await serve()

    await importAt(server, first)

    const after = await klaverboer()

    expect(after).toMatchObject({ id: before!.id, source: 'redactie' })
    expect(await database.db.select().from(persons).where(eq(persons.id, untitled))).toEqual([])
    // The name of the editors stays on the person of the page, also after the names are read.
    expect(await database.db.select().from(persons).where(eq(persons.id, after.personId!))).toMatchObject([
      { familyName: 'Klaverboer', name: 'Bernt Klaverboer', nameSource: 'redactie', wikipediaPage: 'Bernt Klaverboer' },
    ])
    expect(await waiting()).toEqual([])
    expect(await importAt(server, later)).toMatchObject({ players: { added: 0, unchanged: 25, updated: 0 } })
  })
})

describe('two persons the editors merged in the admin (#977)', () => {
  const later = new Date(first.getTime() + hours(1))

  it('does not make the person that went again, and leaves what the editors set', async () => {
    // A made-up player who changed his name: an earlier season has him under the old name.
    const [{ insertId: old }] = await database.db.insert(persons).values({
      line: 'aanvaller',
      lineSource: 'manual',
      name: 'Bernt Oudenaam',
      nameSource: 'sort_key',
      wikipediaPage: 'Bernt Oudenaam',
    })

    await database.db.insert(personPages).values({ page: 'Bernt Oudenaam', personId: old })
    await database.db.insert(players).values({
      name: 'Bernt Oudenaam',
      personId: old,
      searchTerm: 'Oudenaam',
      season: '2025/26',
      wikipediaPage: 'Bernt Oudenaam',
    })

    const { page, server } = await serve()

    await importAt(server, first)

    const [renamed] = await database.db.select().from(persons).where(eq(persons.wikipediaPage, 'Bernt Klaverboer'))
    const kept = renamed!.id

    // What the admin does: the same function, with the row of the log.
    await mergeChosenPersons(database.db, { describe: () => 'merged', keptId: kept, otherId: old, userId: null })

    const merged = await database.db.select().from(persons).orderBy(asc(persons.id))

    // The table links the old title from now on, under the new name.
    page.squad = original.replace('[[Bernt Klaverboer]]', '[[Bernt Oudenaam|Bernt Klaverboer]]')

    // The row of the season is the same row: only its page changes.
    expect(await importAt(server, later)).toMatchObject({ players: { added: 0, left: 0, updated: 1 } })
    // Nobody is made and nobody changed: the old title leads to the person that stays.
    expect(await database.db.select().from(persons).orderBy(asc(persons.id))).toEqual(merged)
    expect(merged.find((person) => person.id === kept)).toMatchObject({
      line: 'aanvaller',
      lineSource: 'manual',
      wikipediaPage: 'Bernt Klaverboer',
    })
    expect(merged.some((person) => person.id === old)).toBe(false)
    expect(await database.db.select().from(personPages).where(eq(personPages.page, 'Bernt Oudenaam'))).toEqual([
      { page: 'Bernt Oudenaam', personId: kept },
    ])
    expect(
      await database.db
        .select({ name: players.name, season: players.season })
        .from(players)
        .where(eq(players.personId, kept))
        .orderBy(asc(players.season)),
    ).toEqual([
      { name: 'Bernt Oudenaam', season: '2025/26' },
      { name: 'Bernt Klaverboer', season },
    ])
  })
})

describe('a read that fails a check or a page that has changed', () => {
  const failures: [string, (text: string) => string, string][] = [
    [
      'the table is gone',
      (text) => text.replace('=== Spelers ===', '=== Selectie ==='),
      'the squad page has no table under the heading Spelers',
    ],
    [
      'a group heading we do not know',
      (text) => text.replace('|Middenvelders', '|Trainers'),
      "the squad table has a heading we do not know: 'Trainers'",
    ],
    [
      'a shirt number we do not know',
      (text) => text.replace("|'''22'''||", "|'''een'''||"),
      "Bernt Klaverboer has a shirt number we do not know: 'een'",
    ],
    [
      'fewer than 18 players',
      (text) =>
        without(
          text,
          'Mats Egbring',
          'Darling Bladi',
          'Jimte Scholten',
          'Oliver Braude',
          'Levi Smans',
          'Marcus Linday',
          'Luca Oyen',
          'Marko Farji',
        ),
      'the squad has 17 players, not 18 to 45',
    ],
    [
      'one goalkeeper only',
      (text) => without(text, 'Timo Schreuder', 'Andries Noppert', 'Sten Kremers'),
      'the squad has 1 goalkeeper, not at least 2',
    ],
    [
      'no forwards',
      (text) => text.replace('|Aanvallers', '|Aanvallers\n|-\n! colspan="13" align="left" |Doelmannen'),
      'the squad has no aanvaller',
    ],
    [
      'a name twice',
      (text) => text.replace('[[Maas Willemsen]]', '[[Sam Kersten]]'),
      'the name Sam Kersten is in the squad twice',
    ],
  ]

  it.each(failures)(
    'leaves the last good squad, writes a warning with the reason and counts the failure: %s',
    async (_name, change, reason) => {
      const { page, server } = await serve()

      await importAt(server, first)

      const before = await snapshot()

      page.squad = change(original)

      const report = await importAt(server, new Date(first.getTime() + hours(1)))

      expect(report.kind).toBe('error')
      expect(formatSquadReport(report)).toContain(
        'Squad 2026/27: warning, nothing changed and the last good copy stays: ',
      )
      expect(formatSquadReport(report)).toContain(reason)
      expect(await snapshot()).toEqual(before)
      expect((await database.db.select().from(squadImports))[0]).toMatchObject({
        failuresInARow: 1,
        lastOutcome: 'error',
        lastSuccessAt: first,
      })
    },
  )

  it('leaves the last good squad when the page cannot be read', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const before = await snapshot()

    page.squad = null

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'error', message: expect.stringContaining('HTTP 404') })
    expect(await snapshot()).toEqual(before)
  })

  it('writes nothing in an empty database either', async () => {
    const { server } = await serve('Een kale pagina')

    expect(await importAt(server, first)).toMatchObject({ kind: 'error' })
    expect(await snapshot()).toEqual({ pages: [], players: [] })
  })

  it('does not read a page that robots.txt closes, and counts no failure', async () => {
    const { server } = await serve(original, { robots: 'User-agent: *\nDisallow: /wiki/' })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'blocked-by-robots' })
    expect(pageRequests(server)).toEqual([])
    expect(await database.db.select().from(players)).toEqual([])
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'blocked-by-robots',
    })
  })

  it('waits as long as Wikipedia asks, and counts it as no failure', async () => {
    const { server: ok } = await serve()
    const busy = await startServer({
      '/robots.txt': reply(200, ''),
      [pageUrl('', squadPageTitle(season))]: reply(429, 'Te druk', { 'Retry-After': '120' }),
    })

    servers.push(busy)

    const report = await importAt(busy, first)

    expect(report).toMatchObject({ kind: 'wait', retryAfterSeconds: 120 })
    expect(formatSquadReport(report)).toBe('Squad 2026/27: not read, Wikipedia asks us to wait 120 seconds')
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'wait',
      retryAt: new Date(first.getTime() + 120 * 1000),
    })
    expect(await importAt(ok, new Date(first.getTime() + 180 * 1000))).toMatchObject({ kind: 'imported' })
  })
})

describe('the numbers of the players', () => {
  /** The page with the row of this player written again, with these cells after the contract */
  function withNumbers(text: string, name: string, shirt: number, numbers: string) {
    return text
      .split(/(?=^\|-)/mu)
      .map((row) =>
        row.includes(`[[${name}]]`)
          ? `|-\n|'''${shirt}'''||{{NL-VLAG}}|| align="left" |[[${name}]]||2029||${numbers}\n`
          : row,
      )
      .join('')
  }

  async function statsOf(name: string) {
    return database.db
      .select({
        appearances: playerSeasonStats.appearances,
        assists: playerSeasonStats.assists,
        competition: playerSeasonStats.competition,
        goals: playerSeasonStats.goals,
        updatedAt: playerSeasonStats.updatedAt,
      })
      .from(playerSeasonStats)
      .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
      .where(eq(players.name, name))
      .orderBy(asc(playerSeasonStats.competition))
  }

  /** A match that was played, with the Eredivisie goals of the squad table. */
  async function playMatchWithTheGoalsOfTheTable() {
    const rows = await database.db
      .select({ goals: playerSeasonStats.goals, name: players.name, playerId: players.id })
      .from(playerSeasonStats)
      .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
      .where(eq(playerSeasonStats.competition, 'Eredivisie'))
    const scorers = rows.flatMap((row) => Array.from({ length: row.goals }, () => row))
    const [{ insertId }] = await database.db.insert(matches).values(
      (
        await withClubs(database.db, [
          {
            competition: 'Eredivisie',
            goalsAgainst: 0,
            goalsFor: scorers.length,
            home: true,
            kickoffAt: new Date('2026-10-24T18:45:00Z'),
            matchDate: '2026-10-24',
            opponent: 'Testdorp FC',
            round: 'Speelronde 1',
            season,
            status: 'played',
          },
        ])
      )[0]!,
    )

    await database.db.insert(matchGoals).values(
      scorers.map((scorer, index) => ({
        matchId: insertId,
        minute: index + 1,
        ours: true,
        player: scorer.name,
        playerId: scorer.playerId,
      })),
    )

    return insertId
  }

  it('stores the appearances, goals and assists of each player in each competition', async () => {
    const { server } = await serve()

    await importAt(server, first)

    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect(await statsOf('Luca Oyen')).toEqual([
      { appearances: 8, assists: 1, competition: 'Eredivisie', goals: 2, updatedAt: first },
      { appearances: 0, assists: 0, competition: 'KNVB Beker', goals: 0, updatedAt: first },
    ])
    expect((await database.db.select().from(playerSeasonStats)).every((row) => row.season === season)).toBe(true)
  })

  it('gives a player without numbers, an empty cell, no row, and a dash is zero', async () => {
    const text = withNumbers(
      withNumbers(original, 'Luca Oyen', 11, '||||||||||||||||'),
      'Jacob Trenskow',
      20,
      '-||-||-||2||1||-||2||1||0',
    )
    const { server } = await serve(text)

    const report = await importAt(server, first)

    expect(report).toMatchObject({
      kind: 'imported',
      players: { added: 25 },
      stats: { added: 48, unchanged: 0, updated: 0 },
      warnings: [],
    })
    expect(await statsOf('Luca Oyen')).toEqual([])
    expect(await statsOf('Jacob Trenskow')).toEqual([
      { appearances: 0, assists: 0, competition: 'Eredivisie', goals: 0, updatedAt: first },
      { appearances: 2, assists: 0, competition: 'KNVB Beker', goals: 1, updatedAt: first },
    ])
    expect(await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))).toHaveLength(1)
  })

  it('updates the numbers in the next run, without double rows, and moves the moment only for a change', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = withNumbers(original, 'Luca Oyen', 11, '9||3||1||1||1||0||10||4||1')

    const later = new Date(first.getTime() + hours(1))
    const report = await importAt(server, later)

    expect(report).toMatchObject({ kind: 'imported', stats: { added: 0, unchanged: 48, updated: 2 } })
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect(await statsOf('Luca Oyen')).toEqual([
      { appearances: 9, assists: 1, competition: 'Eredivisie', goals: 3, updatedAt: later },
      { appearances: 1, assists: 0, competition: 'KNVB Beker', goals: 1, updatedAt: later },
    ])
    expect((await statsOf('Dylan Vente'))[0]?.updatedAt).toEqual(first)

    // The same page again changes nothing, also not the moment.
    const again = await importAt(server, new Date(first.getTime() + hours(2)))

    expect(again).toMatchObject({ kind: 'imported', stats: { added: 0, unchanged: 50, updated: 0 } })
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect((await statsOf('Luca Oyen'))[0]?.updatedAt).toEqual(later)
  })

  it('keeps the last numbers of a player who leaves the table', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))).toMatchObject([
      { inSquad: false },
    ])
    expect(await statsOf('Marko Farji')).toEqual([
      { appearances: 4, assists: 0, competition: 'Eredivisie', goals: 1, updatedAt: first },
      { appearances: 0, assists: 0, competition: 'KNVB Beker', goals: 0, updatedAt: first },
    ])
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
  })

  it('keeps the numbers of a player whose cells become empty', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = withNumbers(original, 'Luca Oyen', 11, '||||||||||||||||')

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', stats: { added: 0, unchanged: 48, updated: 0 } })
    expect(await statsOf('Luca Oyen')).toHaveLength(2)
  })

  it('leaves a player out, with a warning, when his row is already taken by another player of the table', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    // One player is known by the page, another by the name: both would land on the same row.
    page.squad = original
      .replace('[[Sam Kersten]]', '[[Sam Kersten|Sammie Kersten]]')
      .replace(
        '\n|}',
        "\n|-\n|'''40'''||{{NL-VLAG}}|| align=\"left\" |[[Anderen Pagina|Sam Kersten]]||2028||1||0||0||0||0||0||1||0||0\n|}",
      )

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({
      kind: 'imported',
      warnings: ['Sam Kersten: could not be linked to a player in the squad, so the numbers are skipped'],
    })
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('does not warn when the goals in the table are those of the matches', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await playMatchWithTheGoalsOfTheTable()

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', warnings: [] })
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({ lastWarning: null })
  })

  it('keeps a difference with the goals of the matches for the editors, once, and never as a warning (#974)', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const matchId = await playMatchWithTheGoalsOfTheTable()
    const [oyen] = await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))

    // One goal less for Oyen. His own goal and a goal of the opponent don't count for him.
    await database.pool.query('DELETE FROM match_goals WHERE player_id = ? LIMIT 1', [oyen?.id])
    await database.db.insert(matchGoals).values([
      { matchId, minute: 80, ours: false, ownGoal: true, player: 'Oyen', playerId: oyen?.id ?? null },
      { matchId, minute: 81, ours: false, player: 'Oyen' },
    ])

    const before = await database.db.select().from(playerSeasonStats).orderBy(asc(playerSeasonStats.id))
    const later = new Date(first.getTime() + hours(1))
    const report = await importAt(server, later)

    expect(report).toMatchObject({ kind: 'imported', warnings: [] })
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({ lastOutcome: 'imported' })
    expect(await database.db.select().from(playerStatDifferences)).toMatchObject([
      {
        comparedWith: 'matches',
        competition: 'Eredivisie',
        firstSeenAt: later,
        otherGoals: 1,
        playerId: oyen?.id,
        season: '2026/27',
        status: 'pending',
        tableGoals: 2,
      },
    ])
    // The table stays the source until an editor decides: nothing in the numbers changed.
    expect(await database.db.select().from(playerSeasonStats).orderBy(asc(playerSeasonStats.id))).toEqual(before)

    // The next run sees the same difference, and the one after it finds it gone.
    const next = new Date(first.getTime() + hours(2))

    await importAt(server, next)
    expect(await database.db.select().from(playerStatDifferences)).toMatchObject([
      { firstSeenAt: later, lastSeenAt: next, status: 'pending' },
    ])

    await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 82, ours: true, player: 'Oyen', playerId: oyen?.id ?? null })
    await importAt(server, new Date(first.getTime() + hours(3)))
    expect(await database.db.select().from(playerStatDifferences)).toMatchObject([
      { resolution: 'reverted', status: 'rejected' },
    ])
  })

  it('leaves the goals the editors took over while the table says the same, and follows the table when it changes', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const [oyen] = await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))
    const league = () =>
      database.db
        .select()
        .from(playerSeasonStats)
        .where(eq(playerSeasonStats.playerId, oyen?.id ?? 0))
        .then((rows) => rows.find((row) => row.competition === 'Eredivisie'))
    const tabled = (await league())?.goals ?? 0

    // An editor took one goal less over: the table said `tabled` then.
    await database.pool.query(
      "UPDATE player_season_stats SET goals = ?, table_goals = ? WHERE player_id = ? AND competition = 'Eredivisie'",
      [tabled - 1, tabled, oyen?.id],
    )

    await importAt(server, new Date(first.getTime() + hours(1)))
    expect(await league()).toMatchObject({ goals: tabled - 1, tableGoals: tabled })

    // The table of Wikipedia says something else now: its number counts again.
    const changed = await serve(
      withNumbers(original, 'Luca Oyen', 11, `8||${tabled + 1}||1||1||0||0||9||${tabled + 1}||1`),
    )

    await importAt(changed.server, new Date(first.getTime() + hours(2)))
    expect(await league()).toMatchObject({ goals: tabled + 1, tableGoals: null })
  })

  it('keeps a difference with the goals of the match reports for the editors, and never as a warning (#974)', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const matchId = await playMatchWithTheGoalsOfTheTable()
    const [oyen] = await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))

    // The report of the only match is klaar and gives Oyen one goal, where the table says two.
    await database.db.insert(matchReports).values({ matchId, status: 'klaar' })

    const [appearance] = await database.db
      .insert(matchAppearances)
      .values({ matchId, name: 'Luca Oyen', ours: true, playerId: oyen?.id ?? null, shirtNumber: 9, starter: true })
      .$returningId()

    await database.pool.query('UPDATE match_goals SET appearance_id = ? WHERE player_id = ? LIMIT 1', [
      appearance?.id,
      oyen?.id,
    ])

    const later = new Date(first.getTime() + hours(1))

    expect(await importAt(server, later)).toMatchObject({ kind: 'imported', warnings: [] })

    // Every other scorer of the table has goals the one report does not have; Oyen is one row.
    const kept = () =>
      database.db
        .select()
        .from(playerStatDifferences)
        .then((rows) => rows.filter((row) => row.playerId === (oyen?.id ?? 0)))

    expect(await kept()).toMatchObject([
      { comparedWith: 'reports', firstSeenAt: later, otherGoals: 1, status: 'pending', tableGoals: 2 },
    ])
    // Nothing goes in the log of the admin until an editor decides.
    expect(await database.db.select().from(auditLog)).toEqual([])

    // The next run finds the same numbers and keeps nothing more.
    await importAt(server, new Date(first.getTime() + hours(2)))
    expect(await kept()).toHaveLength(1)
  })

  it('compares each competition on its own', async () => {
    const { server } = await serve(withNumbers(original, 'Luca Oyen', 11, '8||0||1||1||2||0||9||2||1'))

    await importAt(server, first)
    await playMatchWithTheGoalsOfTheTable()

    await importAt(server, new Date(first.getTime() + hours(1)))

    const [oyen] = await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))

    // Oyen has no Eredivisie goal in the table now, so the goals of the matches are not his.
    expect(
      (await database.db.select().from(playerStatDifferences))
        .filter((row) => row.playerId === oyen?.id)
        .map((row) => [row.competition, row.tableGoals, row.otherGoals]),
    ).toEqual([['KNVB Beker', 2, 0]])
  })
})

describe('seasons', () => {
  const oldPlayer = {
    name: 'Oude Speler',
    position: 'doelman',
    searchTerm: 'Speler',
    season: '2025/26',
    shirtNumber: 1,
  } as const

  it('leaves the players of an earlier season as they are when a squad is read', async () => {
    await database.db.insert(players).values(oldPlayer)

    const { server } = await serve()

    await importAt(server, first)
    // Another squad with the same name in the earlier season does not clash with it either.
    await database.db.insert(players).values({ ...oldPlayer, name: 'Bernt Klaverboer', season: '2025/26' })
    await importAt(server, new Date(first.getTime() + hours(1)))

    const old = await database.db.select().from(players).where(eq(players.season, '2025/26'))

    expect(old.map((player) => player.name).sort()).toEqual(['Bernt Klaverboer', 'Oude Speler'])
    expect(await database.db.select().from(players).where(eq(players.season, season))).toHaveLength(25)
  })

  it('gives every player with a page his person, and the same person in the next season', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const before = await database.db.select().from(players).orderBy(asc(players.id))

    expect(before.filter((player) => player.wikipediaPage !== null && player.personId === null)).toEqual([])
    expect(new Set(before.map((player) => player.personId)).size).toBe(25)
    expect(await database.db.select().from(persons)).toHaveLength(25)

    await importAt(server, new Date('2027-07-01T10:00:00Z'))

    const next = await database.db.select().from(players).where(eq(players.season, '2027/28'))

    expect(next).toHaveLength(25)
    expect(next.map((player) => player.personId).sort()).toEqual(before.map((player) => player.personId).sort())
    expect(await database.db.select().from(persons)).toHaveLength(25)
  })

  it('reads the page of the new season on 1 July, and keeps the squad of the old one', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const july = new Date('2027-07-01T10:00:00Z')
    const report = await importAt(server, july)

    expect(report).toMatchObject({ kind: 'imported', players: { added: 25 }, season: '2027/28' })
    expect(
      pageRequests(server)
        .filter((path) => path?.includes('Sc_Heerenveen_in_het_seizoen'))
        .at(-1),
    ).toBe('/wiki/Sc_Heerenveen_in_het_seizoen_2027/28_(mannen)?action=raw')
    expect(await database.db.select().from(players).where(eq(players.season, season))).toHaveLength(25)
    expect(await database.db.select().from(players).where(eq(players.season, '2027/28'))).toHaveLength(25)
    expect((await database.db.select().from(squadImports)).map((row) => row.season).sort()).toEqual([
      '2026/27',
      '2027/28',
    ])
  })
})

describe('the import command', () => {
  /** Puts a source with a feed in the register. */
  async function addFeed() {
    const server = await startServer({
      '/rss/': reply(
        200,
        '<?xml version="1.0"?><rss version="2.0"><channel><title>T</title><item><title>Kop</title><link>https://krant.test/1</link><guid>g1</guid></item></channel></rss>',
        { 'Content-Type': 'text/xml' },
      ),
    })

    servers.push(server)

    const [source] = await database.db
      .insert(sources)
      .values({ domain: 'krant.test', kind: 'news', name: 'Krant' })
      .$returningId()

    await database.db.insert(feeds).values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })

    return server
  }

  async function run(wikipedia: TestServer, feed: TestServer) {
    const lines: string[] = []

    // These tests are not about the list of players: it was read an hour ago.
    await database.db
      .insert(playerListTitles)
      .values({ readAt: new Date(first.getTime() - 3600_000), title: 'Gerrit Abma' })
      .onDuplicateKeyUpdate({ set: { readAt: new Date(first.getTime() - 3600_000) } })
    const code = await runImport(database.url, {
      clock: () => first,
      makeFetcher: (robots) => fetcherFor([feed, wikipedia], { robots }),
      wikipediaOrigin: wikipedia.origin,
      write: (line) => lines.push(line),
    })

    return { code, lines }
  }

  it('imports the squad after the matches, in the same run', async () => {
    const feed = await addFeed()
    const { server } = await serve(original, { matchPages: true })

    const { code, lines: reports } = await run(server, feed)
    const lines = reports
      .flatMap((report) => report.split('\n'))
      .filter((line) => !/: (new (club|name) |persons: )/u.test(line))

    expect(code).toBe(0)
    // The import of the matches made the ten scorers with a page players (#1024), and the squad
    // table then gives each of them its row.
    expect(lines.slice(0, 7)).toEqual([
      expect.stringContaining('1 new, 0 updated, 0 unchanged, 0 skipped'),
      expect.stringContaining('Matches 2026/27: 35 new'),
      expect.stringContaining('Matches 2026/27: league results of all clubs'),
      expect.stringContaining('Matches 2026/27: 10 players added from a goal: Luca Oyen, '),
      'Squad 2026/27: 15 new, 10 updated, 0 unchanged, 0 left the squad',
      'Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged',
      'Squad 2026/27: countries of the players: 25 of 25 have one',
    ])
    // The goals of the made-up matches differ from the made-up table: a row for each, for the
    // editors, and no warning.
    expect(lines).toHaveLength(8)
    expect(new Set((await database.db.select().from(players)).map((player) => player.source))).toEqual(
      new Set(['selectie']),
    )
    expect((await database.db.select().from(playerStatDifferences)).length).toBeGreaterThan(0)
    expect(
      pageRequests(server)
        .filter((path) => path?.includes('Sc_Heerenveen_in_het_seizoen'))
        .at(-1),
    ).toBe('/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)?action=raw')
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('still reads the squad when the matches fail, and does not fail the run for it', async () => {
    const feed = await addFeed()
    const { server } = await serve()

    const { code, lines: reports } = await run(server, feed)
    const lines = reports.flatMap((report) => report.split('\n'))

    expect(code).toBe(0)
    expect(lines[1]).toContain('Matches 2026/27: warning, nothing changed and the last good copy stays')
    expect(lines[2]).toBe('Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad')
    expect(lines[3]).toBe('Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged')
    expect(lines[4]).toBe('Squad 2026/27: countries of the players: 25 of 25 have one')
    expect(lines[5]).toBe(
      'Squad 2026/27: persons: 25 titles asked, 25 new persons, 25 titles remembered, 25 names stored (25 from a sort key, 0 guessed, 0 from the list)',
    )
    expect(lines[6]).toBe('Completeness 2026/27: 95% compleet, 25 players, new')
    // No match was played in the database, so there is nothing to compare the goals with.
    expect(lines).toHaveLength(7)
    expect(await database.db.select().from(matches)).toEqual([])
  })

  it('still reads the matches and the feeds when the squad fails, and does not fail the run for it', async () => {
    const feed = await addFeed()
    const { server } = await serve('Een kale pagina', { matchPages: true })

    const { code, lines } = await run(server, feed)

    expect(code).toBe(0)
    expect(lines[1]).toContain('Matches 2026/27: 35 new')
    expect(lines[2]).toContain('Squad 2026/27: warning, nothing changed and the last good copy stays')
    expect(await database.db.select().from(matches)).toHaveLength(35)
    // The only players are the scorers with a page, which the import of the matches made.
    expect(new Set((await database.db.select().from(players)).map((player) => player.source))).toEqual(
      new Set(['doelpunten']),
    )
  })

  it('does not print a line for the squad when the hour is not over yet', async () => {
    const feed = await addFeed()
    const { server } = await serve(original, { matchPages: true })

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

  it('says that the squad has not been read yet', async () => {
    const { code, text } = await status(first)

    expect(code).toBe(0)
    expect(text).toContain('Squad 2026/27 (Wikipedia): not read yet')
  })

  it('shows the last good read, the last outcome, the failed runs and the page', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = 'Een kale pagina'
    await importAt(server, new Date(first.getTime() + hours(1)))

    const { code, text } = await status(new Date(first.getTime() + hours(1) + 60_000))

    expect(code).toBe(0)
    expect(text).toContain('Squad 2026/27 (Wikipedia): healthy')
    expect(text).toContain('last success: 2026-10-25 12:00:00 UTC')
    expect(text).toContain('last outcome: error')
    expect(text).toContain('failed runs in a row: 1')
    expect(text).toContain('the squad page has no table under the heading Spelers')
    expect(text).toContain('next try from: 2026-10-25 13:59:00 UTC')
    expect(text).toContain(
      'page: Sc Heerenveen in het seizoen 2026/27 (mannen), version Sat, 17 Oct 2026 07:23:24 GMT, read 2026-10-25 12:00:00 UTC',
    )
  })

  it('exits with 1 when the import has failed three runs in a row', async () => {
    const { server } = await serve('Een kale pagina')

    for (const hour of [0, 1, 2]) {
      await importAt(server, new Date(first.getTime() + hours(hour)))
    }

    const { code, text } = await status(new Date(first.getTime() + hours(2) + 60_000))

    expect(code).toBe(1)
    expect(text).toContain('Squad 2026/27 (Wikipedia): unhealthy')
    expect(text).toContain('failed runs in a row: 3')
  })

  it('keeps the page of the squad out of the pages of the matches', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const { text } = await status(first)
    const matchPart = text.slice(text.indexOf('Matches'), text.indexOf('Squad'))

    expect(matchPart).not.toContain('Sc Heerenveen in het seizoen')
    expect(text.slice(text.indexOf('Squad'))).toContain('page: Sc Heerenveen in het seizoen 2026/27 (mannen)')
  })
})

describe('storeChosenSpellings', () => {
  const season = '1996/97'
  const rows = async () =>
    (await database.db.select().from(players).where(eq(players.season, season)).orderBy(asc(players.name))).map(
      (row) => `${row.name} | ${row.searchTerm} | ${row.wikipediaPage}`,
    )

  it('gives each of the four the spelling that stays, with the surname as search term, and then changes nothing', async () => {
    await database.db.insert(players).values([
      { name: 'Jan-Harm Schippers', searchTerm: 'Schippers', season, wikipediaPage: 'Jan-Harm Schippers' },
      { name: 'Radoslav Samardzic', searchTerm: 'Samardzic', season },
      { name: 'Robert van der Berg', searchTerm: 'van der Berg', season, source: 'transfers' },
      { name: 'Ugur Yıldırım', searchTerm: 'Yıldırım', season, wikipediaPage: 'Ugur Yıldırım' },
      { name: 'Jordy Buijs', searchTerm: 'Buijs', season },
      { name: 'Robert van der Berg', searchTerm: 'van der Berg', season: '1997/98' },
    ])

    const before = await database.db.select().from(players).orderBy(asc(players.id))

    expect(await storeChosenSpellings(database.db, season)).toBe(4)
    expect(await rows()).toEqual([
      'Jan Harm Schippers | Schippers | Jan Harm Schippers',
      'Jordy Buijs | Buijs | null',
      'Radoslav Samardžić | Samardžić | null',
      'Robert van den Berg | van den Berg | null',
      'Uğur Yıldırım | Yıldırım | Uğur Yıldırım',
    ])
    // Every row keeps its `id`, and the row of another season is not touched.
    expect((await database.db.select().from(players).orderBy(asc(players.id))).map((row) => row.id)).toEqual(
      before.map((row) => row.id),
    )
    expect(await database.db.select().from(players).where(eq(players.season, '1997/98'))).toMatchObject([
      { name: 'Robert van der Berg' },
    ])
    expect(await storeChosenSpellings(database.db, season)).toBe(0)
  })

  it('merges the row of the other spelling into the row that stays when the season has both', async () => {
    const [{ insertId: stays }] = await database.db
      .insert(players)
      .values({ name: 'Robert van den Berg', searchTerm: 'van den Berg', season })
    const [{ insertId: other }] = await database.db
      .insert(players)
      .values({ name: 'Robert van der Berg', searchTerm: 'van der Berg', season, source: 'transfers' })

    await database.db.insert(playerSeasonStats).values({
      appearances: 3,
      assists: 0,
      competition: 'Eredivisie',
      goals: 1,
      playerId: other,
      season,
    })

    expect(await storeChosenSpellings(database.db, season)).toBe(1)
    expect(await rows()).toEqual(['Robert van den Berg | van den Berg | null'])
    expect(await database.db.select().from(playerSeasonStats)).toMatchObject([{ goals: 1, playerId: stays }])
    expect(await storeChosenSpellings(database.db, season)).toBe(0)
  })

  it('leaves a name and a page the editors set as they wrote them (#1022)', async () => {
    await database.db.insert(players).values([
      {
        editorsFields: ['name', 'wikipedia_page'],
        name: 'Jan-Harm Schippers',
        searchTerm: 'Schippers',
        season,
        wikipediaPage: 'Jan-Harm Schippers',
      },
      // Only the name is theirs: the page gets the title that stays.
      {
        editorsFields: ['name'],
        name: 'Robert van der Berg',
        searchTerm: 'van der Berg',
        season,
        wikipediaPage: 'Robert van der Berg',
      },
    ])

    expect(await storeChosenSpellings(database.db, season)).toBe(1)
    expect(await rows()).toEqual([
      'Jan-Harm Schippers | Schippers | Jan-Harm Schippers',
      'Robert van der Berg | van der Berg | Robert van den Berg',
    ])
    expect(await storeChosenSpellings(database.db, season)).toBe(0)
  })

  it('keeps the row of the editors when the season has both spellings, and merges the other into it (#1022)', async () => {
    const [{ insertId: other }] = await database.db.insert(players).values({
      country: 'NL',
      name: 'Robert van den Berg',
      position: 'verdediger',
      searchTerm: 'van den Berg',
      season,
    })
    const [{ insertId: ofEditors }] = await database.db.insert(players).values({
      editorsFields: ['shirt_number'],
      name: 'Robert van der Berg',
      searchTerm: 'van der Berg',
      season,
      shirtNumber: 4,
      source: 'redactie',
    })

    await database.db.insert(playerSeasonStats).values({
      appearances: 3,
      assists: 0,
      competition: 'Eredivisie',
      goals: 1,
      playerId: other,
      season,
    })

    expect(await storeChosenSpellings(database.db, season)).toBe(1)
    expect(await database.db.select().from(players).where(eq(players.season, season))).toMatchObject([
      {
        country: 'NL',
        id: ofEditors,
        name: 'Robert van den Berg',
        position: 'verdediger',
        shirtNumber: 4,
        source: 'redactie',
      },
    ])
    expect(await database.db.select().from(playerSeasonStats)).toMatchObject([{ goals: 1, playerId: ofEditors }])
    expect(await storeChosenSpellings(database.db, season)).toBe(0)
  })

  it('merges the row of the spelling that stays into a row whose name the editors set, and keeps their name (#1022)', async () => {
    const [{ insertId: ofEditors }] = await database.db.insert(players).values({
      editorsFields: ['name'],
      name: 'Robert van der Berg',
      searchTerm: 'van der Berg',
      season,
      source: 'redactie',
    })

    await database.db
      .insert(players)
      .values({ name: 'Robert van den Berg', searchTerm: 'van den Berg', season, shirtNumber: 4 })

    expect(await storeChosenSpellings(database.db, season)).toBe(1)
    expect(await database.db.select().from(players).where(eq(players.season, season))).toMatchObject([
      { id: ofEditors, name: 'Robert van der Berg', searchTerm: 'van der Berg', shirtNumber: 4 },
    ])
    expect(await storeChosenSpellings(database.db, season)).toBe(0)
  })
})
