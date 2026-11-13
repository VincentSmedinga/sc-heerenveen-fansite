import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { matchAppearances, matches, matchReports, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import QualityPage from '../page'
import UsualSlotsPage, { metadata } from './page'

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
  await database.pool.query('DELETE FROM matches')
})

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '2005-08-13',
  opponent: 'Testdorp FC',
  round: '1',
  season: '2005/06',
  status: 'played',
}

/** `count` matches in a 4-3-3 with the same eleven starters, named Speler 1 to Speler 11. */
async function addMatches(count: number) {
  const rows = await withClubs(
    database.db,
    Array.from({ length: count }, (_nothing, index) => ({ ...base, round: String(index + 1) })),
  )

  for (const row of rows) {
    const [{ insertId }] = await database.db.insert(matches).values(row)

    await database.db.insert(matchReports).values({ formationOurs: '4-3-3', matchId: insertId, status: 'klaar' })
    await database.db.insert(matchAppearances).values(
      Array.from({ length: 11 }, (_nothing, index) => ({
        matchId: insertId,
        name: `Speler ${index + 1}`,
        ours: true,
        starter: true,
      })),
    )
  }
}

describe('the page Vaste plaatsen', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    renderToStaticMarkup(await UsualSlotsPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Vaste plaatsen in een 4-3-3')
  })

  it('says what was counted, and that nobody has enough matches yet', async () => {
    const html = renderToStaticMarkup(await UsualSlotsPage())

    expect(html).toContain('In een 4-3-3, voor spelers met minstens 10 wedstrijden.')
    expect(html).toContain('Geen enkele speler heeft 10 wedstrijden in een 4-3-3.')
  })

  it('lists each player with matches, his slot in words and the share, and says every time for 100%', async () => {
    await addMatches(10)

    const html = renderToStaticMarkup(await UsualSlotsPage())

    expect(html).toContain('Speler 1')
    expect(html).toContain('keeper')
    expect(html).toContain('verdediger, 1 van 4')
    expect(html).toContain('aanvaller, 3 van 3')
    expect(html).toContain('100%, elke keer')
    expect(html).toContain('href="/beheer/kwaliteit"')
  })

  it('is linked from the page Kwaliteit', async () => {
    expect(renderToStaticMarkup(await QualityPage())).toContain('href="/beheer/kwaliteit/plaatsen"')
  })
})
