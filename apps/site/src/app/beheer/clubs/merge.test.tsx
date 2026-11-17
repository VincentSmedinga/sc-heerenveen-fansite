import type { TestDatabase } from '@fansite/db/test-database'

import { auditLog, clubNames, clubs, matches } from '@fansite/db/schema'
import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as clubMerge from '#src/beheer/club-merge'

import { createAccount } from '#src/beheer/accounts'

import ClubPage from './[club]/page'
import { submitMergeClubs } from './actions'
import ListPage from './page'
import MergePage, { metadata } from './samenvoegen/page'

const { failMerge, requireRole } = vi.hoisted(() => ({ failMerge: { on: false }, requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('#src/beheer/club-merge', async (importOriginal) => {
  const original = await importOriginal<typeof clubMerge>()

  return {
    ...original,
    mergeClubs: (...args: Parameters<typeof original.mergeClubs>) =>
      failMerge.on ? Promise.reject(new Error('the database is gone')) : original.mergeClubs(...args),
  }
})
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
let venlo: number
let double: number
let dordrecht: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  failMerge.on = false
  for (const table of ['audit_log', 'matches', 'club_names', 'clubs']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })

  const add = async (values: typeof clubs.$inferInsert) =>
    (await database.db.insert(clubs).values(values).$returningId())[0]!.id

  venlo = await add({ name: 'VVV-Venlo', slug: 'vvv-venlo', wikidataId: 'Q24689', wikipediaPage: 'VVV-Venlo' })
  double = await add({ name: 'VVV', slug: 'vvv' })
  dordrecht = await add({ name: 'FC Dordrecht', slug: 'fc-dordrecht', wikidataId: 'Q1045811' })
  await database.db.insert(matches).values({
    clubId: double,
    competition: 'Eredivisie',
    goalsAgainst: 0,
    goalsFor: 1,
    home: true,
    kickoffAt: new Date('2004-10-24T18:45:00Z'),
    matchDate: '2004-10-24',
    opponent: 'VVV',
    round: 'Speelronde 1',
    season: '2004/05',
    status: 'played',
  })
})

const page = async (searchParams: Record<string, string>) =>
  renderToStaticMarkup(await MergePage({ searchParams: Promise.resolve(searchParams) }))
const text = (html: string) => html.replaceAll(/<[^>]*>/g, '')
const form = (sinds: string) => {
  const data = new FormData()

  data.set('sinds', sinds)

  return data
}

describe('the page that merges two clubs', () => {
  it('is not for search engines, and only for an owner or an editor', async () => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
    await page({ club: String(double), met: String(venlo) })
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
  })

  it('puts the two clubs next to each other and keeps the one with the number', async () => {
    const html = await page({ club: String(double), met: String(venlo) })

    expect(html).toContain('<th scope="col">Blijft: VVV-Venlo</th>')
    expect(html).toContain('<th scope="col">Verdwijnt: VVV</th>')
    expect(html).toMatch(/<th scope="row">Wikidata<\/th><td[^>]*>Q24689<\/td><td[^>]*>geen<\/td>/u)
    expect(html).toMatch(/<th scope="row">Wedstrijden<\/th><td[^>]*>0<\/td><td[^>]*>1<\/td>/u)
    expect(text(html)).toContain('VVV-Venlo blijft, want die heeft een Wikidata-nummer.')
    expect(text(html)).toContain('Dat kun je niet terugdraaien.')
    expect(text(html)).toContain('1 wedstrijd')
    expect(html).toContain('Voeg VVV samen met VVV-Venlo')
    expect(html).toContain('De blijvende naam heet sinds seizoen')
  })

  it('lets the editor choose which club stays, and writes nothing', async () => {
    const html = await page({ blijft: String(double), club: String(double), met: String(venlo) })

    expect(text(html)).toContain('VVV blijft omdat je dat koos.')
    expect(html).toContain('Voeg VVV-Venlo samen met VVV')
    expect(await database.db.select().from(clubs)).toHaveLength(3)
    expect(await database.db.select().from(auditLog)).toHaveLength(0)
  })

  it.each([
    ['one club twice', () => ({ club: String(venlo), met: String(venlo) }), 'Je koos twee keer dezelfde club.'],
    ['a club that is gone', () => ({ club: String(venlo), met: '99999999' }), 'bestaat niet meer'],
    ['no clubs', () => ({}), 'bestaat niet meer'],
    ['a number that is no number', () => ({ club: 'abc', met: 'x' }), 'bestaat niet meer'],
  ])('says that merging is not possible for %s, and has no button', async (_name, params, sentence) => {
    const html = await page(params())

    expect(text(html)).toContain('Samenvoegen kan niet.')
    expect(text(html)).toContain(sentence)
    expect(html).not.toContain('type="submit"')
  })

  it('refuses two clubs with a Wikidata number, and has no button', async () => {
    const html = await page({ club: String(dordrecht), met: String(venlo) })

    expect(text(html)).toContain('Beide clubs hebben een Wikidata-nummer')
    expect(html).not.toContain('type="submit"')
  })
})

describe('the way in from the form of a club and the list', () => {
  it('leads from the form of a club to the page, without the club itself in the choice', async () => {
    const html = renderToStaticMarkup(
      await ClubPage({ params: Promise.resolve({ club: 'vvv' }), searchParams: Promise.resolve({}) }),
    )

    expect(html).toContain('action="/beheer/clubs/samenvoegen"')
    expect(html).toContain(`type="hidden" name="club" value="${double}"`)
    expect(html).toContain(`<option value="${venlo}">VVV-Venlo (Q24689)</option>`)
    expect(html).not.toContain(`<option value="${double}">`)
  })

  it('says what happened after a merge', async () => {
    const html = renderToStaticMarkup(
      await ClubPage({
        params: Promise.resolve({ club: 'vvv-venlo' }),
        searchParams: Promise.resolve({ gedaan: 'samengevoegd' }),
      }),
    )

    expect(text(html)).toContain('De twee clubs zijn één club.')
  })

  it('leads from the list to the page', async () => {
    const html = renderToStaticMarkup(await ListPage({ searchParams: Promise.resolve({}) }))

    expect(html).toContain('Twee clubs samenvoegen')
    expect(html).toContain('action="/beheer/clubs/samenvoegen"')
  })
})

describe('the action that merges two clubs', () => {
  it('merges, writes the log and ends on the club that stayed', async () => {
    await expect(submitMergeClubs(double, venlo, {}, form('2002/03'))).rejects.toThrow(
      'redirect to /beheer/clubs/vvv-venlo?gedaan=samengevoegd',
    )

    expect(await database.db.select().from(clubs).where(eq(clubs.id, double))).toHaveLength(0)
    expect((await database.db.select().from(matches))[0]?.clubId).toBe(venlo)
    expect((await database.db.select().from(clubNames)).map((row) => row.name)).toEqual(['VVV'])
    expect(await database.db.select().from(auditLog)).toMatchObject([{ action: 'club.merge', itemId: venlo, userId }])
    expect((await database.db.select().from(auditLog))[0]?.detail).toContain('Samengevoegd: club')
  })

  it('answers a season that is no season with an error, and merges nothing', async () => {
    expect(await submitMergeClubs(double, venlo, {}, form('2002/04'))).toEqual({
      error: 'Vul een seizoen in zoals 2002/03, of laat het veld leeg.',
      sinds: '2002/04',
    })
    expect(await database.db.select().from(clubs)).toHaveLength(3)
  })

  it('answers a merge that failed with a message, keeps the season and writes nothing', async () => {
    failMerge.on = true

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await submitMergeClubs(double, venlo, {}, form('2002/03'))).toEqual({
      failure: 'De clubs zijn niet samengevoegd. Er is niets veranderd. Probeer het nog eens.',
      sinds: '2002/03',
    })
    expect(error).toHaveBeenCalled()
    error.mockRestore()
    expect(await database.db.select().from(clubs)).toHaveLength(3)
    expect(await database.db.select().from(auditLog)).toHaveLength(0)
  })

  it('sends two clubs with a number back to the page, which says so', async () => {
    await expect(submitMergeClubs(dordrecht, venlo, {}, form(''))).rejects.toThrow(
      `redirect to /beheer/clubs/samenvoegen?club=${dordrecht}&met=${venlo}`,
    )
    expect(await database.db.select().from(clubs)).toHaveLength(3)
  })

  it('needs an owner or an editor', async () => {
    requireRole.mockRejectedValue(new Error('not found'))

    await expect(submitMergeClubs(double, venlo, {}, form(''))).rejects.toThrow('not found')
    expect(await database.db.select().from(clubs)).toHaveLength(3)
  })
})
