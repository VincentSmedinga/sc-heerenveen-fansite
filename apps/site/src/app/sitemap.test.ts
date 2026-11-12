import { readdirSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pages } from '../pages'
import sitemap from './sitemap'

const { getAllReportAddresses, getClubRecords, getPlayerSlugs, getPublishedArticles } = vi.hoisted(() => ({
  getAllReportAddresses: vi.fn(),
  getClubRecords: vi.fn(),
  getPlayerSlugs: vi.fn(),
  getPublishedArticles: vi.fn(),
}))

vi.mock('../articles', () => ({ getPublishedArticles }))
vi.mock('../opponents', () => ({ getClubRecords, opponentsPath: '/tegenstanders' }))
vi.mock('../report-data', () => ({ getAllReportAddresses }))
vi.mock('../player-page', () => ({ getPlayerSlugs, playerAddress: (slug: string) => `/spelers/${slug}` }))

// The pages that are not in the sitemap on purpose, as paths such as '/beheer'. A new page.tsx
// that isn't in the list of pages in pages.ts must be named here, so a new page doesn't forget
// the sitemap.
const notInSitemap: string[] = [
  '/beheer',
  '/beheer/artikelen',
  '/beheer/artikelen/[id]',
  '/beheer/artikelen/[id]/versies/[nummer]',
  '/beheer/artikelen/[id]/voorbeeld',
  '/beheer/artikelen/nieuw',
  '/beheer/wedstrijden',
  '/beheer/wedstrijden/nieuw',
  '/beheer/wedstrijden/[id]',
  '/beheer/wedstrijden/[id]/verslag',
  '/beheer/wedstrijden/[id]/verslag/afgelopen',
  '/beheer/wedstrijden/[id]/verslag/live',
  '/beheer/wedstrijden/[id]/verslag/plakken',
  '/beheer/spelers',
  '/beheer/spelers/nieuw',
  '/beheer/spelers/[id]',
  '/beheer/spelers/samenvoegen',
  '/beheer/stadions',
  '/beheer/stadions/[club]',
  '/beheer/clubnamen',
  '/beheer/clubnamen/[club]',
  '/beheer/kwaliteit',
  '/beheer/kwaliteit/[seizoen]/[lijst]',
  '/beheer/kwaliteit/[seizoen]/spelerscijfers',
  '/beheer/kwaliteit/[seizoen]/spelersgegevens',
  '/beheer/kwaliteit/personen',
  '/beheer/berichten',
  '/beheer/bezoek',
  '/beheer/inloggen',
  '/beheer/inloggen/bevestigen',
  '/beheer/inloggen/verstuurd',
  '/contact/verstuurd',
  // A page of results has no use in a search engine, and says noindex.
  '/nieuws/zoeken',
  // The same for the search for a player.
  '/spelers/zoeken',
  // And for the search for a match.
  '/wedstrijden/zoeken',
  // One page for every published article: the sitemap lists them from the database.
  '/redactie/[slug]',
  // One page for every club we played: the sitemap lists them from the database.
  '/tegenstanders/[club]',
  // The statistics of a season that is over: only the current season, /cijfers, is listed.
  '/cijfers/[seizoen]',
  // The same for the players of a season that is over: only /spelers is listed. The same route
  // is the page of each player, which the sitemap lists from the database.
  '/spelers/[seizoen]',
  // The matches of a season that is over: only the current season, /wedstrijden, is listed.
  '/wedstrijden/[seizoen]',
  // One page for every match with a report that is klaar: the sitemap lists them from the
  // database.
  '/wedstrijden/[seizoen]/[wedstrijd]',
]

/**
 * The path of every page.tsx under src/app, such as '/bronnen'. The homepage is '/'. A folder
 * that starts with @ is a slot of the layout (such as @shortcuts, the bar under the header),
 * not a page of its own, so it is left out.
 */
function pagePaths() {
  return readdirSync(import.meta.dirname, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === 'page.tsx')
    .map((entry) => entry.parentPath.slice(import.meta.dirname.length).replaceAll('\\', '/'))
    .filter((folder) => !folder.split('/').some((part) => part.startsWith('@')))
    .map((folder) => (folder === '' ? '/' : folder))
}

beforeEach(() => {
  getPublishedArticles.mockReset()
  getPublishedArticles.mockResolvedValue([])
  getClubRecords.mockReset()
  getClubRecords.mockResolvedValue([])
  getAllReportAddresses.mockReset()
  getAllReportAddresses.mockResolvedValue([])
  getPlayerSlugs.mockReset()
  getPlayerSlugs.mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sitemap', () => {
  it.each([
    ['local', 'http://localhost:3000'],
    ['acceptance', 'https://acc.sc.heerenveen.org'],
    ['production', 'https://sc.heerenveen.org'],
  ])('lists the pages with the address of %s, and nothing else', async (siteEnv, origin) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(await sitemap()).toEqual(pages.map(({ path }) => ({ url: `${origin}${path}` })))
  })

  it('has no address with a query, such as `/nieuws?pagina=2`', async () => {
    vi.stubEnv('SITE_ENV', 'local')

    expect((await sitemap()).filter(({ url }) => url.includes('?'))).toEqual([])
  })

  it('lists a published article with its address and nothing else', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    getPublishedArticles.mockResolvedValue([{ slug: 'dit-zijn-wij' }, { slug: 'eerder' }])

    expect((await sitemap()).slice(pages.length)).toEqual([
      { url: 'https://sc.heerenveen.org/redactie/dit-zijn-wij' },
      { url: 'https://sc.heerenveen.org/redactie/eerder' },
    ])
  })

  it('lists the page of each club we played, A to Z as the query gives them, and nothing else', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    getClubRecords.mockResolvedValue([{ slug: 'ado-den-haag' }, { slug: 'fc-groningen' }])

    expect(await sitemap()).toEqual([
      ...pages.map(({ path }) => ({ url: `https://sc.heerenveen.org${path}` })),
      { url: 'https://sc.heerenveen.org/tegenstanders/ado-den-haag' },
      { url: 'https://sc.heerenveen.org/tegenstanders/fc-groningen' },
    ])
    expect(getClubRecords).toHaveBeenCalledWith('all')
  })

  it('lists the page of each match that has one, as the address and nothing else', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    getAllReportAddresses.mockResolvedValue([
      '/wedstrijden/2026-27/2026-10-24-testdorp-fc',
      '/wedstrijden/2025-26/2025-11-01-fc-twente',
    ])

    expect((await sitemap()).slice(pages.length)).toEqual([
      { url: 'https://sc.heerenveen.org/wedstrijden/2026-27/2026-10-24-testdorp-fc' },
      { url: 'https://sc.heerenveen.org/wedstrijden/2025-26/2025-11-01-fc-twente' },
    ])
  })

  it('lists the page of each player of ours, at his address of now', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    getPlayerSlugs.mockResolvedValue(['jan-de-vries', 'jan-jansen-1975'])

    expect((await sitemap()).slice(pages.length)).toEqual([
      { url: 'https://sc.heerenveen.org/spelers/jan-de-vries' },
      { url: 'https://sc.heerenveen.org/spelers/jan-jansen-1975' },
    ])
  })

  it('still lists the pages, and says why in the log, when the database cannot give the players', async () => {
    vi.stubEnv('SITE_ENV', 'local')
    getPlayerSlugs.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await sitemap()).toEqual(pages.map(({ path }) => ({ url: `http://localhost:3000${path}` })))
    expect(error).toHaveBeenCalledWith(
      'Could not read the players for the sitemap: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('still lists the pages, and says why in the log, when the database cannot give the matches', async () => {
    vi.stubEnv('SITE_ENV', 'local')
    getAllReportAddresses.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await sitemap()).toEqual(pages.map(({ path }) => ({ url: `http://localhost:3000${path}` })))
    expect(error).toHaveBeenCalledWith(
      'Could not read the match reports for the sitemap: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('still lists the pages, and says why in the log, when the database cannot give the clubs', async () => {
    vi.stubEnv('SITE_ENV', 'local')
    getClubRecords.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await sitemap()).toEqual(pages.map(({ path }) => ({ url: `http://localhost:3000${path}` })))
    expect(error).toHaveBeenCalledWith('Could not read the clubs for the sitemap: connect ECONNREFUSED 127.0.0.1:3306')
  })

  it('still lists the pages, and says why in the log, when the database cannot give the articles', async () => {
    vi.stubEnv('SITE_ENV', 'local')
    getPublishedArticles.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await sitemap()).toEqual(pages.map(({ path }) => ({ url: `http://localhost:3000${path}` })))
    expect(error).toHaveBeenCalledWith(
      'Could not read the articles for the sitemap: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('has every page.tsx of the app, or names it as an exception', () => {
    const listed = pages.map(({ path }) => String(path))
    const missing = pagePaths().filter((path) => !listed.includes(path) && !notInSitemap.includes(path))

    expect(missing, 'add the page to pages.ts, or to notInSitemap in this test').toEqual([])
  })

  it('lists only pages that exist, and no exception that is in the list too', () => {
    const existing = pagePaths()

    expect(pages.map(({ path }) => String(path)).filter((path) => !existing.includes(path))).toEqual([])
    expect(notInSitemap.filter((path) => !existing.includes(path))).toEqual([])
    expect(notInSitemap.filter((path) => pages.some((page) => page.path === path))).toEqual([])
  })
})
