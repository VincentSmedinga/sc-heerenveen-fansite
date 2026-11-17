import type { TestDatabase } from '@fansite/db/test-database'

import { stadiumNames, stadiums } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import QualityPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))

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
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
})

describe('the page Kwaliteit van stadions (#1307)', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    renderToStaticMarkup(await QualityPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it('shows nothing to somebody without a session or with another role', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(QualityPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })

  it('says everything is complete when nothing is missing', async () => {
    const html = renderToStaticMarkup(await QualityPage())

    expect(html).toContain('Alle stadions en clubs zijn compleet.')
    expect(html).toContain('Elk stadion heeft coördinaten.')
  })

  it('has a card for each kind, with a link to the stadium that misses something', async () => {
    const [{ insertId }] = await database.db.insert(stadiums).values({})

    await database.db.insert(stadiumNames).values({ name: 'Kaal Veld', position: 0, stadiumId: insertId })

    const html = renderToStaticMarkup(await QualityPage())

    expect([...html.matchAll(/<h2 [^>]*>(.*?)<\/h2>/g)].map(([, title]) => title)).toEqual([
      'Zonder Wikidata-nummer',
      'Zonder coördinaten',
      'Zonder adres',
      'Clubs zonder thuisveld',
    ])
    expect(html.match(/<section class="hf-card/g)).toHaveLength(4)
    expect(html).not.toContain('hf-card-warm')
    expect(html).toContain(`<a href="/beheer/stadions/stadion/${insertId}">Kaal Veld</a>`)
    expect(html).toContain('Nog 3 gaten bij de stadions en de clubs.')
  })
})
