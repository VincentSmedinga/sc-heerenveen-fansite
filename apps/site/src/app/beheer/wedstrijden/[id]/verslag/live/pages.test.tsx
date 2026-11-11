import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matchAppearances, matches, matchGoals, matchReports, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'

import LiveReportPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
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
  await createAccount(database.db, 'sanne@example.org', 'beheerder')

  const userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId })

  const [values] = await withClubs(database.db, [live])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  matchId = inserted?.id ?? 0
})

/** A report with two players of ours (one on the bench), one of the opponent, and two goals. */
async function addReport() {
  await database.db.insert(matchReports).values({ matchId, opponentComplete: false, status: 'bezig' })
  await database.db.insert(matchAppearances).values([
    { captain: false, matchId, name: 'Speler 9', ours: true, shirtNumber: 9, starter: true },
    { captain: false, matchId, name: 'Speler 12', ours: true, shirtNumber: 12, starter: false },
    { captain: false, matchId, name: 'Sibbing', ours: false, shirtNumber: 7, starter: true },
  ])
  await database.db.insert(matchGoals).values([
    { matchId, minute: 12, ours: true, player: 'Speler 9' },
    { matchId, minute: 40, ours: false, player: 'Sibbing' },
  ])
}

const page = async (id: number | string) =>
  renderToStaticMarkup(await LiveReportPage({ params: Promise.resolve({ id: String(id) }) }))

describe('the screen "Verslag bijhouden"', () => {
  it('is for the beheerder, is not indexed, and is not found for another match', async () => {
    await addReport()
    requireRole.mockRejectedValue(new Error('not found'))
    await expect(page(matchId)).rejects.toThrow('not found')
    expect(metadata.robots).toEqual({ follow: false, index: false })

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId: 1 })
    await expect(page(999_999)).rejects.toThrow('not found')
    await expect(page('x')).rejects.toThrow('not found')
  })

  it('has one h1, the stand in the order of the match, and the button "Wedstrijd afgelopen"', async () => {
    await addReport()

    const html = await page(matchId)

    expect(html.match(/<h1[^>]*>(.*?)<\/h1>/gu)).toHaveLength(1)
    expect(html).toContain('Bijhouden: N.E.C. - sc Heerenveen')
    // sc Heerenveen plays away: one goal for N.E.C. first, then one for us.
    expect(html).toContain('Stand 1–1')
    expect(html).toContain(`action="/beheer/wedstrijden/${matchId}/verslag/afgelopen"`)
    expect(html).toContain('>Wedstrijd afgelopen</button>')
  })

  it('has a form for a goal, a card and a substitution, each with labelled fields', async () => {
    await addReport()

    const html = await page(matchId)

    for (const name of ['Doelpunt', 'Kaart', 'Wissel']) {
      expect(html).toContain(`>${name}</h2>`)
      expect(html).toContain(`${name}</span> opslaan</button>`)
    }

    // The minute opens the number keyboard on a phone.
    expect(html.match(/<input[^>]*inputMode="numeric"[^>]*name="minuut"/gu)).toHaveLength(3)

    const labelled = [...html.matchAll(/<label[^>]*for="([^"]+)"/gu)].map(([, id]) => id)

    for (const id of labelled) {
      expect(html).toContain(`id="${id}"`)
    }
    // A substitution brings a player on from the bench and takes one off the pitch.
    expect(html).toMatch(/<select[^>]*name="erin"[^>]*>(?:(?!<\/select>).)*Speler 12(?:(?!<\/select>).)*<\/select>/u)
    expect(html).not.toMatch(/<select[^>]*name="erin"[^>]*>(?:(?!<\/select>).)*Speler 9(?:(?!<\/select>).)*<\/select>/u)
    expect(html).toContain('role="status"')
  })

  it('lists the events from the last to the first, each with a question before it goes', async () => {
    await addReport()

    const html = await page(matchId)

    expect(html.indexOf('Doelpunt 40&#x27; Sibbing')).toBeLessThan(html.indexOf('Doelpunt 12&#x27; Speler 9'))
    expect(html).toContain('Haal weg: Doelpunt 40')
    expect(html).toContain('Ja, haal weg')
    expect(html).not.toContain('Weet je zeker')
    // The focus goes here after a removal.
    expect(html).toMatch(/<h2[^>]*id="gebeurtenissen-kop"[^>]*tabindex="-1"/iu)
  })

  it('has no breadcrumb or link back, the bar of the admin and the jumps are in the slot', async () => {
    await addReport()

    const html = await page(matchId)

    expect(html).not.toContain('Kruimelpad')
    for (const id of ['live-doelpunt-kop', 'live-kaart-kop', 'live-wissel-kop', 'gebeurtenissen-kop']) {
      expect(html).toContain(`id="${id}"`)
    }
  })

  it('asks for the line-up first when the match has no report', async () => {
    const html = await page(matchId)

    expect(html).toContain('Eerst de opstelling')
    expect(html).not.toContain('Doelpunt opslaan')
    expect(html).toContain(`href="/beheer/wedstrijden/${matchId}/verslag"`)
  })
})
