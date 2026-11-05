import type { TestDatabase } from '@fansite/db/test-database'

import { clubNames, clubPages, clubs, matches, matchImports } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { lookUpTitles, maxRedirects, repairClubPagesFromWikipedia } from './club-pages.ts'
import { importMatches, repairKnownClubs } from './import-matches.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { articleRoutes, articleText } from './test-articles.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

/**
 * The texts of the three redirects, as the Dutch Wikipedia gave them with `?action=raw` on 3
 * November 2026 (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/deed.nl). Each is
 * one line.
 */
const redirectFixtures = {
  'AZ Alkmaar': fixture('wikipedia-redirect-az-alkmaar.wiki'),
  'BV De Graafschap': fixture('wikipedia-redirect-bv-de-graafschap.wiki'),
  'SBV Excelsior': fixture('wikipedia-redirect-sbv-excelsior.wiki'),
}

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Wed, 21 Oct 2026 14:40:44 GMT' }

const first = new Date('2026-10-25T12:00:00Z')

let database: TestDatabase
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of [
    'match_changes',
    'matches',
    'persons',
    'club_pages',
    'club_names',
    'clubs',
    'league_results',
    'standings',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
  await database.pool.query('DELETE FROM wikipedia_pages')
  await database.pool.query('DELETE FROM match_imports')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** A web server that answers as Wikipedia does for these titles: the text, or a 404. */
async function serve(texts: Record<string, string>, extra: Record<string, Handler> = {}) {
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }

  for (const [title, text] of Object.entries(texts)) {
    routes[pageUrl('', title)] = reply(200, text, wiki)
  }

  const server = await startServer({ ...routes, ...extra })

  servers.push(server)

  return server
}

/** The requests for articles: everything but the robots.txt. */
const asked = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

describe('lookUpTitles', () => {
  it('follows a redirect to the article, and asks once for each title', async () => {
    const server = await serve({ ...redirectFixtures, 'AZ (voetbalclub)': articleText })
    const found = await lookUpTitles(fetcherFor([server]), server.origin, ['AZ Alkmaar'], new Map())

    expect(found).toEqual({
      kind: 'found',
      redirects: new Map([
        ['AZ (voetbalclub)', 'AZ (voetbalclub)'],
        ['AZ Alkmaar', 'AZ (voetbalclub)'],
      ]),
      sortKeys: new Map(),
    })
    expect(asked(server)).toEqual(['/wiki/AZ_Alkmaar?action=raw', '/wiki/AZ_(voetbalclub)?action=raw'])
  })

  it('reads #DOORVERWIJZING as well as #REDIRECT, whatever the capitals', async () => {
    const server = await serve({
      'Eerste titel': '#doorverwijzing [[Tweede titel#Kopje|andere tekst]]\n[[Categorie:Doorverwijzing]]',
      'Tweede titel': articleText,
    })
    const found = await lookUpTitles(fetcherFor([server]), server.origin, ['Eerste titel'], new Map())

    expect(found).toMatchObject({
      redirects: new Map([
        ['Eerste titel', 'Tweede titel'],
        ['Tweede titel', 'Tweede titel'],
      ]),
    })
  })

  it('asks nothing about the target of a redirect that a club already has', async () => {
    const server = await serve({ ...redirectFixtures })
    const found = await lookUpTitles(
      fetcherFor([server]),
      server.origin,
      ['AZ Alkmaar'],
      new Map([['AZ (voetbalclub)', 'AZ (voetbalclub)']]),
    )

    expect(found).toEqual({
      kind: 'found',
      redirects: new Map([['AZ Alkmaar', 'AZ (voetbalclub)']]),
      sortKeys: new Map(),
    })
    expect(asked(server)).toEqual(['/wiki/AZ_Alkmaar?action=raw'])
  })

  it('takes the article a remembered redirect ends in, not the redirect', async () => {
    const server = await serve({ ...redirectFixtures })
    const found = await lookUpTitles(
      fetcherFor([server]),
      server.origin,
      ['SBV Excelsior'],
      new Map([['Excelsior Rotterdam', 'Excelsior Rotterdam']]),
    )

    expect(found).toEqual({
      kind: 'found',
      redirects: new Map([['SBV Excelsior', 'Excelsior Rotterdam']]),
      sortKeys: new Map(),
    })
  })

  it('takes a title that is no redirect as its own article, after one request', async () => {
    const server = await serve({ 'FC Twente': articleText })
    const found = await lookUpTitles(fetcherFor([server]), server.origin, ['FC Twente', 'FC Twente'], new Map())

    expect(found).toEqual({ kind: 'found', redirects: new Map([['FC Twente', 'FC Twente']]), sortKeys: new Map() })
    expect(asked(server)).toHaveLength(1)
  })

  it('follows a redirect to a redirect, three times at most', async () => {
    const server = await serve({
      A: '#REDIRECT [[B]]',
      B: '#REDIRECT [[C]]',
      C: '#REDIRECT [[D]]',
      D: articleText,
      E: '#REDIRECT [[F]]',
      F: '#REDIRECT [[G]]',
      G: '#REDIRECT [[H]]',
      H: '#REDIRECT [[I]]',
      I: articleText,
    })
    const fetcher = fetcherFor([server])

    expect(maxRedirects).toBe(3)
    expect(await lookUpTitles(fetcher, server.origin, ['A'], new Map())).toMatchObject({
      kind: 'found',
      redirects: new Map([
        ['A', 'D'],
        ['B', 'D'],
        ['C', 'D'],
        ['D', 'D'],
      ]),
    })
    expect(await lookUpTitles(fetcher, server.origin, ['E'], new Map())).toEqual({
      kind: 'error',
      message: 'E: more than 3 redirects in a row',
    })
  })

  it('gives an error for redirects in a circle and for a redirect with no title', async () => {
    const server = await serve({ A: '#REDIRECT [[B]]', B: '#REDIRECT [[A]]', C: '#REDIRECT nergens heen' })
    const fetcher = fetcherFor([server])

    expect(await lookUpTitles(fetcher, server.origin, ['A'], new Map())).toEqual({
      kind: 'error',
      message: 'A: the redirects go round in a circle',
    })
    expect(await lookUpTitles(fetcher, server.origin, ['C'], new Map())).toEqual({
      kind: 'error',
      message: 'C: a redirect without a title to go to',
    })
  })

  it('gives no answer at all when one request fails, and keeps nothing of the text', async () => {
    const server = await serve(
      { 'FC Twente': articleText, 'Kapotte club': 'x' },
      {
        [pageUrl('', 'Kapotte club')]: reply(500, 'Fout'),
      },
    )
    const found = await lookUpTitles(fetcherFor([server]), server.origin, ['FC Twente', 'Kapotte club'], new Map())

    expect(found).toMatchObject({ kind: 'error', message: expect.stringContaining('Kapotte club') })
    expect(found).not.toHaveProperty('redirects')
  })

  it('gives an error for a page that is not there, and says robots.txt and a wait as such', async () => {
    const gone = await serve({})
    const closed = await startServer({
      '/robots.txt': reply(200, 'User-agent: *\nDisallow: /wiki/', { 'Content-Type': 'text/plain' }),
    })
    const busy = await serve({}, { [pageUrl('', 'FC Twente')]: reply(429, 'Te druk', { 'Retry-After': '90' }) })

    servers.push(closed)

    expect(await lookUpTitles(fetcherFor([gone]), gone.origin, ['FC Twente'], new Map())).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('404'),
    })
    expect(await lookUpTitles(fetcherFor([closed]), closed.origin, ['FC Twente'], new Map())).toMatchObject({
      kind: 'blocked-by-robots',
    })
    expect(await lookUpTitles(fetcherFor([busy]), busy.origin, ['FC Twente'], new Map())).toMatchObject({
      kind: 'wait',
      retryAfterSeconds: 90,
    })
  })
})

describe('the clubs under a redirect, at the start of a run', () => {
  async function club(name: string, slug: string, page: null | string, seasons: string[] = []) {
    const [{ id }] = (await database.db.insert(clubs).values({ name, slug, wikipediaPage: page }).$returningId()) as [
      { id: number },
    ]

    for (const [index, season] of seasons.entries()) {
      await database.db.insert(matches).values({
        clubId: id,
        competition: 'Eredivisie',
        dateText: 'x',
        home: true,
        matchDate: `${season.slice(0, 4)}-09-0${index + 1}`,
        opponent: name,
        round: `Speelronde ${slug}-${index}`,
        season,
        status: 'scheduled',
      })
    }

    return id
  }

  const everything = async () => ({
    clubs: await database.db.select().from(clubs).orderBy(clubs.id),
    matches: await database.db.select().from(matches).orderBy(matches.id),
    names: await database.db.select().from(clubNames).orderBy(clubNames.id),
    pages: await database.db.select().from(clubPages).orderBy(clubPages.page),
  })

  const repair = (server: TestServer) => repairKnownClubs(database.db, fetcherFor([server]), server.origin, () => first)

  it('makes one club of AZ and AZ Alkmaar, and of Excelsior Rotterdam and SBV Excelsior, and logs it', async () => {
    const az = await club('AZ', 'az', 'AZ (voetbalclub)', ['2025/26', '2024/25'])

    await club('AZ', 'az-2', 'AZ Alkmaar', ['2012/13'])

    const excelsior = await club('Excelsior Rotterdam', 'excelsior-rotterdam', 'Excelsior Rotterdam', ['2025/26'])

    await club('SBV Excelsior', 'excelsior-rotterdam-2', 'SBV Excelsior', ['2010/11', '2011/12'])
    await club('Excelsior Maassluis', 'excelsior-maassluis', 'Excelsior Maassluis')

    const server = await serve({
      ...redirectFixtures,
      'AZ (voetbalclub)': articleText,
      'Excelsior Maassluis': articleText,
      'Excelsior Rotterdam': articleText,
    })
    const lines = await repair(server)

    expect(lines).toEqual([
      "Clubs: merged club 'AZ' into club 'AZ'",
      "Clubs: title 'AZ Alkmaar' is a redirect to 'AZ (voetbalclub)', the article of club 'AZ'",
      "Clubs: merged club 'SBV Excelsior' into club 'Excelsior Rotterdam'",
      "Clubs: title 'SBV Excelsior' is a redirect to 'Excelsior Rotterdam', the article of club 'Excelsior Rotterdam'",
      // The list of full names comes after the redirects.
      "Clubs: new name 'Excelsior' for club 'Excelsior Rotterdam'",
    ])

    const found = await everything()

    expect(found.clubs.map((one) => [one.id, one.slug])).toEqual([
      [az, 'az'],
      [excelsior, 'excelsior-rotterdam'],
      [found.clubs[2]!.id, 'excelsior-maassluis'],
    ])
    expect(found.matches.map((one) => one.clubId).sort()).toEqual([az, az, az, excelsior, excelsior, excelsior])
    expect(found.names.map((one) => [one.clubId, one.name]).sort()).toEqual([
      [excelsior, 'Excelsior'],
      [excelsior, 'SBV Excelsior'],
    ])
    expect(found.pages.map((one) => one.page)).toEqual([
      'AZ (voetbalclub)',
      'AZ Alkmaar',
      'Excelsior Maassluis',
      'Excelsior Rotterdam',
      'SBV Excelsior',
    ])
  })

  it('asks once for each title, and a second run asks nothing and writes nothing', async () => {
    await club('AZ', 'az', 'AZ (voetbalclub)', ['2025/26'])
    await club('AZ', 'az-2', 'AZ Alkmaar', ['2012/13'])

    const server = await serve({ ...redirectFixtures, 'AZ (voetbalclub)': articleText })

    await repair(server)
    expect(asked(server)).toEqual(['/wiki/AZ_(voetbalclub)?action=raw', '/wiki/AZ_Alkmaar?action=raw'])

    const before = await everything()

    expect(await repair(server)).toEqual([])
    expect(asked(server)).toHaveLength(2)
    expect(await everything()).toEqual(before)
  })

  it('gives BV De Graafschap the article its redirect ends in, without a second club', async () => {
    const graafschap = await club('De Graafschap', 'de-graafschap', 'BV De Graafschap', ['2012/13'])
    const server = await serve({ ...redirectFixtures, 'De Graafschap (voetbalclub)': articleText })

    expect(await repair(server)).toEqual([
      "Clubs: article 'De Graafschap (voetbalclub)' for club 'De Graafschap'",
      "Clubs: title 'BV De Graafschap' is a redirect to 'De Graafschap (voetbalclub)', the article of club 'De Graafschap'",
    ])
    expect(await database.db.select().from(clubs)).toMatchObject([
      { id: graafschap, slug: 'de-graafschap', wikipediaPage: 'De Graafschap (voetbalclub)' },
    ])
  })

  it('keeps two clubs with an article each apart, and the list of full names has no warning for them', async () => {
    await club('Excelsior Rotterdam', 'excelsior-rotterdam', 'Excelsior Rotterdam')
    await club('Excelsior Maassluis', 'excelsior-maassluis', 'Excelsior Maassluis')

    const server = await serve({ 'Excelsior Maassluis': articleText, 'Excelsior Rotterdam': articleText })

    // Only the other spellings of the full name, as before: no 'have an article each' line.
    expect(await repair(server)).toEqual([
      "Clubs: new name 'Excelsior' for club 'Excelsior Rotterdam'",
      "Clubs: new name 'SBV Excelsior' for club 'Excelsior Rotterdam'",
    ])
    expect(await database.db.select().from(clubs)).toHaveLength(2)
    expect(await database.db.select().from(clubPages)).toHaveLength(2)
  })

  it('makes a warning of a request that fails, merges nothing, and tries again next time', async () => {
    await club('AZ', 'az', 'AZ (voetbalclub)', ['2025/26'])
    await club('AZ', 'az-2', 'AZ Alkmaar', ['2012/13'])

    const broken = await serve({}, { [pageUrl('', 'AZ (voetbalclub)')]: reply(500, 'Fout') })
    const lines = await repair(broken)

    expect(lines).toEqual([expect.stringMatching(/^Clubs: warning, club pages not checked: AZ \(voetbalclub\): /u)])
    expect(await database.db.select().from(clubs)).toHaveLength(2)
    expect(await database.db.select().from(clubPages)).toHaveLength(0)
    expect(await database.db.select().from(matchImports)).toEqual([
      expect.objectContaining({ lastWarning: expect.stringContaining('club pages not checked') }),
    ])

    const working = await serve({ ...redirectFixtures, 'AZ (voetbalclub)': articleText })

    expect(await repair(working)).toHaveLength(2)
    expect(await database.db.select().from(clubs)).toHaveLength(1)
  })

  it('does nothing without a Wikipedia to read from', async () => {
    await club('AZ', 'az', 'AZ (voetbalclub)')

    const server = await serve({})

    expect(await repairKnownClubs(database.db, fetcherFor([server]), null, () => first)).toEqual([])
    expect(asked(server)).toEqual([])
    expect(
      await repairClubPagesFromWikipedia(database.db, fetcherFor([server]), server.origin).catch(() => 'failed'),
    ).toBe('failed')
  })
})

describe('the import of a season', () => {
  const original = {
    cup: fixture('wikipedia-cup.wiki'),
    programme: fixture('wikipedia-programme.wiki'),
    standings: fixture('wikipedia-standings.wiki'),
  }

  /** The pages of 2026/27 with the programme changed, and the answers for the articles. */
  async function serveSeason(programme: string, redirects: Record<string, string> = {}) {
    const pages = { ...original, programme }
    const routes: Record<string, Handler> = {
      ...articleRoutes(Object.values(pages), { redirects }),
      '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }),
    }

    for (const kind of ['cup', 'programme', 'standings'] as const) {
      routes[pageUrl('', pageTitles('2026/27')[kind])] = reply(200, pages[kind], wiki)
    }

    const server = await startServer(routes)

    servers.push(server)

    return server
  }

  const importAt = (server: TestServer, at: Date) =>
    importMatches(database.db, fetcherFor([server]), { clock: () => at, origin: server.origin })

  const articlesAsked = (server: TestServer) =>
    server.paths().filter((path) => path !== '/robots.txt' && !/20[12]\d/u.test(path ?? ''))

  const azLink = '[[AZ (voetbalclub)|AZ]]'
  const excelsiorLink = '[[Excelsior Rotterdam]]'

  it('makes one club AZ when the programme links AZ Alkmaar and AZ, and remembers both titles', async () => {
    const programme = original.programme.replaceAll(azLink, '[[AZ Alkmaar|AZ]]')
    const server = await serveSeason(programme, {
      'AZ Alkmaar': 'AZ (voetbalclub)',
    })

    await importAt(server, first)

    const found = await database.db.select().from(clubs).where(eq(clubs.name, 'AZ'))

    expect(found).toMatchObject([{ slug: 'az', wikipediaPage: 'AZ (voetbalclub)' }])
    expect(
      (await database.db.select().from(clubPages).where(eq(clubPages.clubId, found[0]!.id))).map((row) => row.page),
    ).toEqual(['AZ (voetbalclub)', 'AZ Alkmaar'])
    expect(await database.db.select().from(clubs).where(eq(clubs.slug, 'az-2'))).toEqual([])
  })

  it('finds the club SBV Excelsior under the slug excelsior-rotterdam, with the title in club_pages', async () => {
    const programme = original.programme.replaceAll(excelsiorLink, '[[SBV Excelsior|Excelsior Rotterdam]]')
    const server = await serveSeason(programme, { 'SBV Excelsior': 'Excelsior Rotterdam' })

    expect(await importAt(server, first)).toMatchObject({ kind: 'imported' })
    expect(
      (await database.db.select().from(clubs))
        .filter((club) => club.name.startsWith('Excelsior'))
        .map((club) => club.slug)
        .sort(),
    ).toEqual(['excelsior-maassluis', 'excelsior-rotterdam'])
    expect(
      (await database.db.select().from(clubPages))
        .map((row) => row.page)
        .filter((page) => page.includes('Excelsior'))
        .sort(),
    ).toEqual(['Excelsior Maassluis', 'Excelsior Rotterdam', 'SBV Excelsior'])
  })

  it('costs one request for a title, and none the next time', async () => {
    const server = await serveSeason(original.programme)

    await importAt(server, first)

    const firstAsked = articlesAsked(server)

    expect(new Set(firstAsked).size).toBe(firstAsked.length)
    expect(firstAsked).toContain('/wiki/FC_Twente?action=raw')

    await importAt(server, new Date(first.getTime() + 60 * 60 * 1000))
    expect(articlesAsked(server)).toEqual(firstAsked)
  })

  it('asks about no title it knows from a club, though the club was made by an earlier run', async () => {
    await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente', wikipediaPage: 'FC Twente' })

    const server = await serveSeason(original.programme)

    await importAt(server, first)
    expect(articlesAsked(server)).not.toContain('/wiki/FC_Twente?action=raw')
  })

  it('makes no club on a guess when a request fails, and the next run starts again', async () => {
    const server = await serveSeason(original.programme)
    const broken = await startServer({
      '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }),
      ...Object.fromEntries(
        (['cup', 'programme', 'standings'] as const).map((kind) => [
          pageUrl('', pageTitles('2026/27')[kind]),
          reply(200, original[kind], wiki),
        ]),
      ),
      [pageUrl('', 'FC Twente')]: reply(500, 'Fout'),
    })

    servers.push(broken)

    const report = await importAt(broken, first)

    expect(report).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('the article of a club, '),
      season: '2026/27',
    })
    expect(await database.db.select().from(clubs)).toEqual([])
    expect(await database.db.select().from(matches)).toEqual([])
    expect(await importAt(server, new Date(first.getTime() + 60 * 60 * 1000))).toMatchObject({ kind: 'imported' })
  })
})
