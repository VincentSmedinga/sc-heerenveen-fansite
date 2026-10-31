import type { TestDatabase } from '@fansite/db/test-database'

import { dailyVisitors, pageViews } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { visitDay } from '@fansite/db/visits'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import VisitPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('../../../database', () => ({ getDatabase: () => database }))
vi.mock('../../../beheer/require-role', () => ({ requireRole }))

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId: 1 })
  await database.pool.query('DELETE FROM page_views')
  await database.pool.query('DELETE FROM daily_visitors')
})

/** The h1s, h2s and so on of some markup, as text. */
const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

describe('the page with the numbers of the visit', () => {
  it('is for a beheerder only, and stays out of search engines', async () => {
    await renderToStaticMarkup(await VisitPage())

    expect(requireRole).toHaveBeenCalledWith('beheerder')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Bezoek')
  })

  it('shows nothing to somebody without a session or with another role', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(VisitPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })

  it('says there are no numbers yet, and still explains them, when nothing is counted', async () => {
    const html = renderToStaticMarkup(await VisitPage())

    expect(headings(html)).toEqual(['h1 Bezoek', 'h2 Nog geen cijfers', 'h2 Wat deze cijfers zijn'])
    expect(html).toContain('nog geen bezoek geteld')
    expect(html).not.toContain('<table')
  })

  it('shows the totals, the days and the most viewed pages as tables with a caption and scopes', async () => {
    const today = visitDay(new Date())

    await database.db.insert(dailyVisitors).values({ day: today, visitors: 1234 })
    await database.db.insert(pageViews).values([
      { day: today, path: '/', views: 2000 },
      { day: today, path: '/nieuws/podcasts', views: 3 },
    ])

    const html = renderToStaticMarkup(await VisitPage())

    expect(headings(html)).toEqual([
      'h1 Bezoek',
      'h2 Totalen',
      'h2 Per dag',
      'h2 Meest bekeken pagina’s',
      'h2 Wat deze cijfers zijn',
    ])
    expect(html.match(/<table/g)).toHaveLength(3)
    expect(html.match(/<caption/g)).toHaveLength(3)
    expect(html.match(/<th scope="col"/g)).toBeTruthy()
    expect([...html.matchAll(/<th[ >][^>]*>/g)].every(([tag]) => tag.includes('scope='))).toBe(true)
    // A thousands separator in the Dutch way.
    expect(html).toContain('<td class="hf-numeric">1.234</td>')
    expect(html).toContain('<td class="hf-numeric">2.003</td>')
    expect(html.match(/<th scope="row"[^>]*>\/(nieuws\/podcasts)?<\/th>/g)).toHaveLength(2)
    // 30 days and the two totals.
    expect(html.match(/<th scope="row"/g)).toHaveLength(2 + 30 + 2)
  })

  it('explains in plain words what the numbers are and are not', async () => {
    const html = renderToStaticMarkup(await VisitPage())

    for (const part of ['ruw', 'bots', 'Do Not Track', 'Global Privacy Control', 'som van de dagen']) {
      expect(html).toContain(part)
    }
  })
})
