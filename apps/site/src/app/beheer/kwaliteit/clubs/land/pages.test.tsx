import type { TestDatabase } from '@fansite/db/test-database'

import { clubs } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import ClubsWithoutCountryPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('./actions', () => ({ submitClubCountryFromList: () => Promise.resolve({}) }))

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId: 1 })
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM clubs')
})

const page = async (query: Record<string, string> = {}) =>
  renderToStaticMarkup(await ClubsWithoutCountryPage({ searchParams: Promise.resolve(query) }))

async function addClubs(total: number) {
  await database.db.insert(clubs).values(
    Array.from({ length: total }, (_, index) => {
      const name = `Verzonnen ${String(index + 1).padStart(2, '0')}`

      return { country: index === 0 ? 'NL' : null, name, slug: name.toLowerCase().replace(' ', '-') }
    }),
  )
}

describe('the page of the clubs without a country', () => {
  it('is for an editor and stays out of search engines', async () => {
    await page()

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata).toMatchObject({ robots: { follow: false, index: false }, title: 'Clubs zonder land' })
  })

  it('counts the clubs without a country and leaves out the ones that have one', async () => {
    await addClubs(3)

    const html = await page()

    expect(html).toContain('Nog 2 clubs zonder land, 0 van wedstrijden in Europa.')
    expect(html).toContain('aria-label="Sla op: land van Verzonnen 02"')
    expect(html).not.toContain('Land van Verzonnen 01')
    expect(html).toContain('Duitsland (DE)')
    expect(html).not.toContain('hf-pagination')
  })

  it('says that nothing is left', async () => {
    expect(await page()).toContain('Er is niets meer te doen: elke club heeft een land.')
  })

  it('shows more than fifty clubs in parts, with a link to the next one', async () => {
    await addClubs(52)

    const first = await page()

    expect(first.match(/<h2/gu)).toHaveLength(50)
    expect(first).toContain('Nog 51 clubs zonder land')
    expect(first).toContain('href="/beheer/kwaliteit/clubs/land?deel=2"')

    const second = await page({ deel: '2' })

    expect(second.match(/<h2/gu)).toHaveLength(1)
    expect(second).toContain('href="/beheer/kwaliteit/clubs/land"')
    expect(await page({ deel: '9' })).toContain('Pagina 2 van 2')
    expect(await page({ deel: 'x' })).toContain('Pagina 1 van 2')
  })
})
