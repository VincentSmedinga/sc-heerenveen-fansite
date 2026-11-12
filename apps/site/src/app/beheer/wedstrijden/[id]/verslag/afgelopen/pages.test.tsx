import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matches, matchGoals, matchReports, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'

import FinishMatchPage, { metadata } from './page'

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
let matchId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const live: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  home: false,
  kickoffAt: new Date('2026-10-31T17:45:00Z'),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season: '2026/27',
  status: 'scheduled',
}

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })

  const [values] = await withClubs(database.db, [live])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  matchId = inserted?.id ?? 0
  await database.db.insert(matchReports).values({ matchId, opponentComplete: false, status: 'bezig' })
  // Two goals for us and one for N.E.C.
  await database.db.insert(matchGoals).values([
    { matchId, minute: 12, ours: true, player: 'Speler 9' },
    { matchId, minute: 40, ours: false, player: 'Sibbing' },
    { matchId, minute: 77, ours: true, player: 'Speler 10' },
  ])
})

const page = async (id: number | string) =>
  renderToStaticMarkup(await FinishMatchPage({ params: Promise.resolve({ id: String(id) }) }))

describe('the screen "Wedstrijd afgelopen"', () => {
  it('is for the editor, and is not indexed', async () => {
    requireRole.mockRejectedValue(new Error('not found'))

    await expect(page(matchId)).rejects.toThrow('not found')
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it('has one h1 with the clubs, a link back to the report, and a card with the question', async () => {
    const html = await page(matchId)

    expect(html.match(/<h1[^>]*>(.*?)<\/h1>/u)?.[1]).toBe('Wedstrijd afgelopen: N.E.C. - sc Heerenveen')
    expect(html).toContain(`href="/beheer/wedstrijden/${matchId}/verslag"`)
    expect(html).toContain('Is de wedstrijd afgelopen?')
  })

  it('shows the stand counted from the goals of the report in two fields, in the order of the match', async () => {
    const html = await page(matchId)
    const fields = [...html.matchAll(/<label[^>]*for="([^"]+)"[^>]*>(.*?)<\/label>/gu)].map(([, id, label]) => [
      id,
      label,
    ])

    // sc Heerenveen plays away, so the opponent's field comes first, as in the title.
    expect(fields).toEqual([
      ['uitslag-zij', 'Doelpunten N.E.C.'],
      ['uitslag-wij', 'Doelpunten sc Heerenveen'],
    ])
    expect(html).toMatch(/<input[^>]*name="uitslag-wij"[^>]*value="2"/u)
    expect(html).toMatch(/<input[^>]*name="uitslag-zij"[^>]*value="1"/u)
    expect(html).toContain('<legend>Eindstand</legend>')
    expect(html).toContain('>Wedstrijd afgelopen</button>')
    expect(html).toContain('Annuleren')
  })

  it('says in words what ending the match does, so the confirmation is clear', async () => {
    const html = await page(matchId)

    expect(html).toContain('De stand komt uit de doelpunten van het verslag dat is bewaard')
    expect(html).toContain('Het verslag blijft bezig')
    expect(html).toContain('Verlenging en strafschoppen')
  })

  it('goes back to the report for a match that was played, or has no report, and is not found otherwise', async () => {
    await database.db
      .update(matches)
      .set({ goalsAgainst: 1, goalsFor: 2, status: 'played' })
      .where(eq(matches.id, matchId))
    await expect(page(matchId)).rejects.toThrow(
      `redirect to /beheer/wedstrijden/${matchId}/verslag?gedaan=al-afgelopen`,
    )

    await database.db
      .update(matches)
      .set({ goalsAgainst: null, goalsFor: null, status: 'scheduled' })
      .where(eq(matches.id, matchId))
    await database.db.delete(matchReports)
    await expect(page(matchId)).rejects.toThrow(`redirect to /beheer/wedstrijden/${matchId}/verslag`)

    await expect(page(999_999)).rejects.toThrow('not found')
    await expect(page('x')).rejects.toThrow('not found')
  })
})
