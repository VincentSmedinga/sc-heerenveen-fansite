import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, clubs } from '@fansite/db/schema'
import { saveStadium } from '@fansite/db/stadium-admin'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'

import ListPage, { metadata as listMetadata } from '../page'
import StadiumPage, { metadata as stadiumMetadata } from './[id]/page'

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

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('UPDATE matches SET stadium_id = NULL')
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })
})

const name = (text: string, startSeason: null | string = null) => ({
  name: text,
  note: null,
  startDay: null,
  startSeason,
})

async function make(
  names: ReturnType<typeof name>[],
  more: { latitude?: string; longitude?: string; place?: string; postcode?: string; street?: string } = {},
) {
  const result = await saveStadium(database.db, userId, null, {
    latitude: more.latitude ?? null,
    longitude: more.longitude ?? null,
    names,
    place: more.place ?? null,
    postcode: more.postcode ?? null,
    street: more.street ?? null,
  })

  return result.status === 'saved' ? result.id : 0
}

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await ListPage({ searchParams: Promise.resolve(searchParams) }))
const stadium = async (id: string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await StadiumPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(searchParams) }),
  )

describe('the pages of a stadium', () => {
  it('tell search engines to stay away', () => {
    expect(listMetadata.robots).toEqual({ follow: false, index: false })
    expect(stadiumMetadata.robots).toEqual({ follow: false, index: false })
  })

  it.each([
    ['the list', () => list()],
    ['the stadium', () => stadium('nieuw')],
  ])('are for the editor and not for the author: %s', async (_name, render) => {
    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('author') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
  })
})

describe('the list of the stadiums', () => {
  it('has each stadium with the name it has now, its place and in words what we know of where it is', async () => {
    await make([name('Oud Veld'), name('Nieuw Veld', '2010/11')], {
      latitude: '52.000000',
      longitude: '5.000000',
      place: 'Oefenstad',
    })
    await make([name('Kaal Veld')])
    await make([name('Compleet Veld')], {
      latitude: '52.100000',
      longitude: '5.100000',
      postcode: '1234 AB',
      street: 'Weg 1',
    })

    const html = await list()
    const rows = [...html.matchAll(/<tr><th scope="row">(.*?)<\/th><td>(.*?)<\/td><td>(.*?)<\/td>/g)].map((found) =>
      found.slice(1).map((cell) =>
        cell
          .replaceAll(/<[^>]*>/g, ' ')
          .replaceAll(/\s+/g, ' ')
          .trim(),
      ),
    )

    expect(rows).toEqual([
      ['Compleet Veld', 'Onbekend', 'Coördinaten Adres'],
      ['Kaal Veld', 'Onbekend', 'Nog niets'],
      ['Nieuw Veld', 'Oefenstad', 'Coördinaten'],
    ])
    expect(html).toContain('href="/beheer/stadions/stadion/nieuw"')
    expect(html).toContain('href="/beheer/stadions/clubs"')
  })

  it('tells that a stadium is gone, with the notice in the address', async () => {
    expect(await list({ fout: 'weg' })).toContain('Dit stadion bestaat niet.')
    expect(await list({ fout: 'onzin' })).not.toContain('class="hf-notice"')
  })
})

describe('the page of a stadium', () => {
  it('shows the fields and the names of a stadium, the clubs that play there, and the notice of the last action', async () => {
    const id = await make([name('Oud Veld'), name('Nieuw Veld', '2010/11')], {
      latitude: '52.000000',
      longitude: '5.000000',
      place: 'Oefenstad',
    })

    await database.db.insert(clubs).values({ name: 'Oefenstad AZ', slug: 'oefenstad-az' })

    const html = await stadium(String(id), { gedaan: 'opgeslagen' })

    expect(html).toContain('<h1 class="hf-heading-1">Nieuw Veld</h1>')
    expect(html).toContain('value="Oefenstad"')
    expect(html).toContain('value="52.000000"')
    expect(html).toContain('value="Oud Veld"')
    expect(html).toContain('Het stadion is bewaard.')
    expect(html).toContain('Plaats van de redactie')
    expect(html).toContain('Vul het adres in vanaf de coördinaten')
  })

  it('makes a new stadium with one empty line of names, and not found for what does not exist', async () => {
    const html = await stadium('nieuw')

    expect(html).toContain('Nieuw stadion')
    expect(html).toContain('name="regel-1-naam"')
    await expect(stadium('999999')).rejects.toThrow('not found')
    await expect(stadium('onzin')).rejects.toThrow('not found')
  })

  it('offers to go back to Wikidata only for a stadium with an item and a place from the editors', async () => {
    const id = await make([name('Eigen')], { latitude: '52.000000', longitude: '5.000000', place: 'Oefenstad' })

    expect(await stadium(String(id))).not.toContain('Terug naar Wikidata')

    await database.pool.query("UPDATE stadiums SET wikidata_id = 'Q9' WHERE id = ?", [id])
    expect(await stadium(String(id))).toContain('Terug naar Wikidata')
  })
})
