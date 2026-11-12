import type { TestDatabase } from '@fansite/db/test-database'

import { replaceClubNamePeriods } from '@fansite/db/club-name-periods'
import { withClubs } from '@fansite/db/clubs'
import { adminUsers, clubNames, clubs, matches, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'

import ClubPage, { metadata as clubMetadata } from './[club]/page'
import ListPage, { metadata as listMetadata } from './page'

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

const visit = (opponent: string, season = '2025/26'): Omit<NewMatch, 'clubId'> => ({
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 1,
  home: false,
  kickoffAt: new Date('2025-11-09T18:45:00Z'),
  matchDate: '2025-11-09',
  opponent,
  round: `Speelronde ${opponent}`,
  season,
  status: 'played',
})

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM club_name_periods')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM club_names')
  await database.pool.query('DELETE FROM clubs')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })
  await database.db
    .insert(matches)
    .values(
      await withClubs(database.db, [
        visit('Oefenstad AZ', '2024/25'),
        { ...visit('Oefenstad AZ'), round: 'Speelronde 2' },
        visit('Oefenstad NAC'),
        visit('Oefenstad Zonder'),
      ]),
    )
})

const clubId = async (slug: string) => (await database.db.select().from(clubs).where(eq(clubs.slug, slug)))[0]?.id ?? 0

async function giveList(slug: string) {
  await replaceClubNamePeriods(database.db, userId, await clubId(slug), [
    { name: 'Oefen AZ', note: null, startDay: null, startSeason: null },
    {
      name: 'Oefen Boys',
      note: 'De club heette even anders, zegt Wikipedia.',
      startDay: '2019-08-10',
      startSeason: null,
    },
    { name: 'Oefenstad AZ', note: null, startDay: null, startSeason: '2020/21' },
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

describe('the pages of the names of the clubs', () => {
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
  it('has the clubs we have matches against, A to Z, and says in words which have a list of their own', async () => {
    await giveList('oefenstad-az')

    const html = await list()

    expect(rowsOf(html)).toEqual([
      ['Oefenstad AZ', 'Eigen lijst'],
      ['Oefenstad NAC', 'Geen lijst'],
      ['Oefenstad Zonder', 'Geen lijst'],
    ])
    expect(html).toContain('href="/beheer/clubnamen/oefenstad-az"')
    expect(html).toContain('Alles (3)')
    expect(html).toContain('Eigen lijst (1)')
  })

  it('filters on the clubs with a list of their own, and says so when there is none', async () => {
    expect(rowsOf(await list({ tonen: 'eigen-lijst' }))).toEqual([])
    expect(await list({ tonen: 'eigen-lijst' })).toContain('Nog geen club heeft een eigen lijst.')

    await giveList('oefenstad-az')

    expect(rowsOf(await list({ tonen: 'eigen-lijst' }))).toEqual([['Oefenstad AZ', 'Eigen lijst']])
  })

  it('searches on the name, with a form that works without JavaScript, and keeps the search in the filter', async () => {
    const html = await list({ q: 'nac' })

    expect(rowsOf(html)).toEqual([['Oefenstad NAC', 'Geen lijst']])
    expect(html).toMatch(/<form[^>]*action="\/beheer\/clubnamen" method="get"/)
    expect(html).toContain('<input')
    expect(html).toContain('value="nac"')
    expect(html).toContain('href="/beheer/clubnamen?tonen=eigen-lijst&amp;q=nac"')
    expect(await list({ q: 'bestaat niet' })).toContain('Geen club gevonden met “bestaat niet”.')
  })

  it('tells that a club is gone, with the notice in the address', async () => {
    expect(await list({ fout: 'weg' })).toContain('Deze club bestaat niet.')
    expect(await list({ fout: 'onzin' })).not.toContain('class="hf-notice')
  })
})

describe('the form of a club', () => {
  it('has one empty line for a club without a list, says which name the site shows, and the spellings of Wikipedia', async () => {
    await database.db.insert(clubNames).values({ clubId: await clubId('oefenstad-az'), name: 'Oefen A.Z.' })

    const html = await form('oefenstad-az')

    expect(html).toContain('<h1')
    expect(html).toContain('De site toont nu de naam <strong>Oefenstad AZ</strong> in de kop.')
    expect(html).toContain('Geen lijst')
    expect(html.match(/name="regel-\d+-naam"/g)).toEqual(['name="regel-1-naam"'])
    expect(html).toContain('Schrijfwijzen van Wikipedia')
    expect(html).toContain('<li>Oefen A.Z.</li>')
    expect(html).not.toContain('Lijst weghalen')
  })

  it('says Wikipedia has one spelling for a club without other names', async () => {
    expect(await form('oefenstad-nac')).toContain('Wikipedia schrijft deze club altijd als Oefenstad NAC.')
  })

  it('has the lines of the list of its own, with the note, and the block that takes the list away', async () => {
    await giveList('oefenstad-az')

    const html = await form('oefenstad-az')

    expect(html.match(/name="regel-\d+-naam"/g)).toHaveLength(3)
    expect(html).toContain('value="Oefen Boys"')
    expect(html).toContain('value="2019-08-10"')
    expect(html).toContain('value="2020/21"')
    expect(html).toContain('De club heette even anders, zegt Wikipedia.')
    expect(html).toContain('Eigen lijst')
    expect(html).toContain('Lijst weghalen')
    expect(html).toContain('aria-label="Lijst weghalen voor Oefenstad AZ"')
    expect(html).toContain('<li>Oefen AZ</li>')
  })

  it('says in plain text when the last name of the list is not the name in the heading, and still saves', async () => {
    await replaceClubNamePeriods(database.db, userId, await clubId('oefenstad-az'), [
      { name: 'Oefen AZ', note: null, startDay: null, startSeason: null },
      { name: 'Nieuwe Naam', note: null, startDay: null, startSeason: '2020/21' },
    ])

    const html = await form('oefenstad-az')

    expect(html).toContain(
      'De laatste naam van de lijst, Nieuwe Naam, is niet de naam in de kop van de pagina, Oefenstad AZ.',
    )
    expect(html).toContain('value="opslaan"')
  })

  it('says nothing about the heading when the last name is the name in it, whatever the punctuation', async () => {
    await replaceClubNamePeriods(database.db, userId, await clubId('oefenstad-az'), [
      { name: 'Oefen AZ', note: null, startDay: null, startSeason: null },
      { name: 'oefenstad a.z.', note: null, startDay: null, startSeason: '2020/21' },
    ])

    expect(await form('oefenstad-az')).not.toContain('is niet de naam in de kop')
  })

  it('names every field and every button of a line with the line, and has the hint for the note', async () => {
    await giveList('oefenstad-az')

    const html = await form('oefenstad-az')

    expect(html).toContain('Naam<span class="hf-visually-hidden">, regel 2: Oefen Boys</span>')
    expect(html).toContain('Toelichting<span class="hf-visually-hidden">, regel 2: Oefen Boys</span>')
    expect(html).toContain('Regel 2: Oefen Boys weghalen')
    expect(html).toContain('Schrijf in eigen woorden. Komt het uit een bron, noem die dan in de zin.')
  })

  it('puts the hidden save button first in the form, so Enter saves and does not remove a line', async () => {
    const html = await form('oefenstad-az')
    const first = html.slice(html.indexOf('<form'))

    expect(first.indexOf('value="opslaan"')).toBeLessThan(first.indexOf('value="regel-weghalen-1"'))
  })

  it.each([
    ['opgeslagen', 'De lijst is bewaard. Staat binnen vijf minuten op de pagina van de club.'],
    ['weggehaald', 'De lijst is weg.'],
    ['geen-lijst', 'Deze club had geen eigen lijst om weg te halen.'],
  ])('tells what the last action did: %s', async (gedaan, text) => {
    expect(await form('oefenstad-az', { gedaan })).toContain(text)
  })

  it('tells nothing for a notice the page does not know', async () => {
    expect(await form('oefenstad-az', { gedaan: 'onzin' })).not.toContain('class="hf-notice')
  })

  it('does not exist for a club no club has', async () => {
    await expect(form('bestaat-niet')).rejects.toThrow('not found')
  })

  it('shows a note as text, never as markup', async () => {
    await replaceClubNamePeriods(database.db, userId, await clubId('oefenstad-az'), [
      { name: 'Naam', note: '<b>vet</b>"><script>alert(1)</script>', startDay: null, startSeason: null },
    ])

    const html = await form('oefenstad-az')

    expect(html).not.toContain('<b>vet</b>')
    expect(html).not.toContain('<script>alert(1)')
    expect(html).toContain('&lt;b&gt;vet&lt;/b&gt;')
  })
})
