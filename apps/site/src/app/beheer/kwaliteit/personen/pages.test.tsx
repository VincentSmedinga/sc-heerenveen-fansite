import type { TestDatabase } from '@fansite/db/test-database'

import { persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import PersonFactsPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('./actions', () => ({ submitPersonFact: () => Promise.resolve({}) }))

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
  await database.pool.query('DELETE FROM players')
  await database.db.delete(persons)
})

const page = async (query: Record<string, string> = {}) =>
  renderToStaticMarkup(await PersonFactsPage({ searchParams: Promise.resolve(query) }))

async function addPeople(total: number) {
  await database.db.insert(persons).values(
    Array.from({ length: total }, (_, index) => ({
      country: index === 0 ? 'NO' : null,
      name: `Verzonnen ${String(index + 1).padStart(2, '0')}`,
    })),
  )
}

describe('the page of the persons without a line or a country', () => {
  it('is for an editor and stays out of search engines', async () => {
    await page()

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata).toMatchObject({ robots: { follow: false, index: false }, title: 'Personen zonder linie of land' })
  })

  it('shows the list without a line first, with the seasons and the article of a person', async () => {
    const [person] = await database.db
      .insert(persons)
      .values({ englishTitle: true, name: 'Verzonnen Spits', wikipediaPage: 'Verzonnen Spits (footballer)' })
      .$returningId()

    await database.db.insert(players).values(
      ['2001/02', '2003/04'].map((season) => ({
        name: 'Verzonnen Spits',
        personId: person?.id ?? 0,
        searchTerm: 'spits',
        season,
      })),
    )

    const html = await page()

    expect(html).toContain('Nog 1 persoon zonder linie.')
    expect(html).toContain('2001/02 tot en met 2003/04')
    expect(html).toContain('href="https://en.wikipedia.org/wiki/Verzonnen_Spits_(footballer)"')
    expect(html).toContain('aria-label="Verdediger voor Verzonnen Spits"')
    expect(html).toContain('Zonder land (1)')
    expect(html).not.toContain('Land van')
    expect(html).not.toContain('hf-pagination')
  })

  it('shows the list without a country, with the countries of our persons in the first group', async () => {
    await addPeople(3)

    const html = await page({ lijst: 'land' })

    expect(html).toContain('Nog 2 personen zonder land.')
    expect(html).not.toContain('>Verzonnen 01<')
    expect(html).toMatch(
      /<optgroup label="Landen van onze spelers"><option value="NO">Noorwegen \(NO\)<\/option><\/optgroup>/u,
    )
    expect(html).toMatch(/<optgroup label="Andere landen">.*<option value="NL">Nederland \(NL\)<\/option>/u)
    // Each country is in one group: once in the list of each of the two persons.
    expect(html.match(/<option value="NO">/gu)).toHaveLength(2)
  })

  it('says that nothing is left', async () => {
    const html = await page()

    expect(html).toContain('Er is niets meer te doen: elke persoon heeft een linie.')
    expect(await page({ lijst: 'land' })).toContain('Er is niets meer te doen: elke persoon heeft een land.')
  })

  it('shows more than fifty persons in parts, with a link to the next one', async () => {
    await addPeople(51)

    const first = await page()

    expect(first.match(/<h2/gu)).toHaveLength(50)
    expect(first).toContain('Nog 51 personen zonder linie.')
    expect(first).toContain('Pagina 1 van 2')
    expect(first).toContain('href="/beheer/kwaliteit/personen?deel=2"')

    const second = await page({ deel: '2' })

    expect(second.match(/<h2/gu)).toHaveLength(1)
    expect(second).toContain('>Verzonnen 51<')
    expect(second).toContain('href="/beheer/kwaliteit/personen"')
    // A part that does not exist is the last one, and a part that is no number the first.
    expect(await page({ deel: '9' })).toContain('Pagina 2 van 2')
    expect(await page({ deel: 'x' })).toContain('Pagina 1 van 2')
    expect(await page({ deel: '2', lijst: 'land' })).toContain('href="/beheer/kwaliteit/personen?lijst=land"')
  })
})
