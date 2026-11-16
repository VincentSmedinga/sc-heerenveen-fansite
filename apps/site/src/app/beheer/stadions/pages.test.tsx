import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, clubHomeGrounds, clubs, matches, type NewMatch, stadiumNames, stadiums } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'

import ClubPage, { metadata as clubMetadata } from './[club]/page'
import ListPage, { metadata as listMetadata } from './clubs/page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const visit = (opponent: string, stadium: string, season = '2025/26'): Omit<NewMatch, 'clubId'> => ({
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 1,
  home: false,
  kickoffAt: new Date('2025-11-09T18:45:00Z'),
  matchDate: '2025-11-09',
  opponent,
  round: `Speelronde ${opponent}`,
  season,
  stadium,
  status: 'played',
})

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })
  await database.db
    .insert(matches)
    .values(
      await withClubs(database.db, [
        visit('Oefenstad AZ', 'Oud Stadion', '2024/25'),
        { ...visit('Oefenstad AZ', 'Nieuwe Arena'), round: 'Speelronde 2' },
        visit('Oefenstad NAC', 'Rat Verlegh Stadion'),
        visit('Oefenstad Zonder', 'Een Stadion'),
      ]),
    )
})

const clubId = async (slug: string) => (await database.db.select().from(clubs).where(eq(clubs.slug, slug)))[0]?.id ?? 0

async function giveList(slug: string) {
  const [{ insertId: afas }] = await database.db.insert(stadiums).values({})
  const [{ insertId: temporary }] = await database.db.insert(stadiums).values({})
  const club = await clubId(slug)

  await database.db.insert(stadiumNames).values([
    { name: 'AFAS Stadion', position: 0, stadiumId: afas },
    { name: 'Cars Jeans Stadion', position: 0, stadiumId: temporary },
  ])
  await database.db.insert(clubHomeGrounds).values([
    { clubId: club, position: 0, stadiumId: afas },
    {
      clubId: club,
      note: 'AZ speelde tijdelijk in Den Haag.',
      position: 1,
      stadiumId: temporary,
      startDay: '2019-08-10',
    },
    { clubId: club, position: 2, stadiumId: afas, startSeason: '2020/21' },
  ])
}

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await ListPage({ searchParams: Promise.resolve(searchParams) }))
const form = async (club: string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await ClubPage({ params: Promise.resolve({ club }), searchParams: Promise.resolve(searchParams) }),
  )

/** The rows of the table of the list, as the name of the club and the text of the cell. */
const rowsOf = (html: string) =>
  [...html.matchAll(/<tr><th scope="row">(.*?)<\/th><td>(.*?)<\/td>/g)].map(([, name, cell]) => [
    (name ?? '').replaceAll(/<[^>]*>/g, ''),
    (cell ?? '').replaceAll(/<[^>]*>/g, ''),
  ])

describe('the pages of the stadiums', () => {
  it.each([
    ['the list', listMetadata],
    ['the club', clubMetadata],
  ])('tell search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it.each([
    ['the list', () => list()],
    ['the club', () => form('oefenstad-az')],
  ])('are for the editor and not for the author: %s', async (_name, render) => {
    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('author') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
  })
})

describe('the list of the clubs', () => {
  it('has the clubs we have matches against, A to Z, and says in words which have home grounds', async () => {
    await giveList('oefenstad-az')

    const html = await list()

    expect(rowsOf(html)).toEqual([
      ['Oefenstad AZ', 'Thuisvelden'],
      ['Oefenstad NAC', 'Wikipedia'],
      ['Oefenstad Zonder', 'Wikipedia'],
    ])
    expect(html).toContain('href="/beheer/stadions/oefenstad-az"')
    expect(html).toContain('Alles (3)')
    expect(html).toContain('Thuisvelden (1)')
  })

  it('filters on the clubs with home grounds, and says so when there is none', async () => {
    expect(rowsOf(await list({ tonen: 'thuisvelden' }))).toEqual([])
    expect(await list({ tonen: 'thuisvelden' })).toContain('Nog geen club heeft thuisvelden.')

    await giveList('oefenstad-az')

    expect(rowsOf(await list({ tonen: 'thuisvelden' }))).toEqual([['Oefenstad AZ', 'Thuisvelden']])
  })

  it('searches on the name, with a form that works without JavaScript, and keeps the search in the filter', async () => {
    const html = await list({ q: 'nac' })

    expect(rowsOf(html)).toEqual([['Oefenstad NAC', 'Wikipedia']])
    expect(html).toMatch(/<form[^>]*action="\/beheer\/stadions\/clubs" method="get"/)
    expect(html).toContain('<input')
    expect(html).toContain('value="nac"')
    expect(html).toContain('href="/beheer/stadions/clubs?tonen=thuisvelden&amp;q=nac"')
    expect(await list({ q: 'bestaat niet' })).toContain('Geen club gevonden met “bestaat niet”.')
  })

  it('tells that a club is gone, with the notice in the address', async () => {
    expect(await list({ fout: 'weg' })).toContain('Deze club bestaat niet.')
    expect(await list({ fout: 'onzin' })).not.toContain('class="hf-notice')
  })
})

describe('the page of a club', () => {
  it('says a club without home grounds has none, and that its card shows what the matches say', async () => {
    const html = await form('oefenstad-az')

    expect(html).toContain('<h1')
    expect(html).toContain('Oefenstad AZ')
    expect(html).toContain('Geen thuisvelden')
    expect(html).toContain('De kaart toont wat de wedstrijden zeggen.')
    expect(html).not.toContain('name="regel-')
    expect(html).not.toContain('Wat de wedstrijden zeggen')
    expect(html).not.toContain('Terug naar Wikipedia')
  })

  it('has the form of the home grounds and the Wikidata number, and no list of its own any more', async () => {
    const html = await form('oefenstad-az')

    expect(html).toContain('name="knop"')
    expect(html).toContain('value="thuis-opslaan"')
    expect(html).toContain('Wikidata')
    expect(html).not.toContain('Eigen lijst opslaan')
  })

  it('shows the home grounds of the club with a tag', async () => {
    await giveList('oefenstad-az')

    const html = await form('oefenstad-az')

    expect(html).toContain('Thuisvelden')
    expect(html).toContain('De kaart op de pagina van de club toont deze velden met hun namen.')
    expect(html).toContain('value="2019-08-10"')
    expect(html).toContain('AZ speelde tijdelijk in Den Haag.')
  })

  it.each([['thuisvelden-opgeslagen', 'De thuisvelden zijn bewaard.']])(
    'tells what the last action did: %s',
    async (gedaan, text) => {
      expect(await form('oefenstad-az', { gedaan })).toContain(text)
    },
  )

  it('tells nothing for a notice the page does not know', async () => {
    expect(await form('oefenstad-az', { gedaan: 'onzin' })).not.toContain('class="hf-notice')
  })

  it('does not exist for a club no club has', async () => {
    await expect(form('bestaat-niet')).rejects.toThrow('not found')
  })
})
