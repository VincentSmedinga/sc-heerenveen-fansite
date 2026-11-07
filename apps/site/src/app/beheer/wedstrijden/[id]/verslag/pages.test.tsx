import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matches, matchGoals, type NewMatch, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { saveReport } from '#src/beheer/match-reports'
import { emptyRow } from '#src/beheer/report-fields'
import { report as baseReport, squadOf, substitution } from '#src/beheer/report-fixtures'
import { checkReportForm } from '#src/beheer/report-form'

import ReportPage, { metadata } from './page'

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
let squad: { id: number; name: string; shirtNumber: null | number }[]

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const played: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  kickoffAt: new Date('2026-10-31T17:45:00Z'),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season: '2026/27',
  status: 'played',
}

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId })

  const [values] = await withClubs(database.db, [played])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  matchId = inserted?.id ?? 0
  await database.db.insert(players).values(
    squadOf(1).map((player) => ({
      name: player.name,
      searchTerm: player.name,
      season: '2026/27',
      shirtNumber: player.shirtNumber,
    })),
  )
  squad = (await database.db.select().from(players).orderBy(asc(players.shirtNumber))).map((player) => ({
    id: player.id,
    name: player.name,
    shirtNumber: player.shirtNumber,
  }))
  await database.db.insert(matchGoals).values([
    { matchId, minute: 12, ours: true, player: 'Speler 9' },
    { matchId, minute: 40, ours: false, player: 'Sibbing' },
    { matchId, minute: 77, ours: true, player: 'Speler 10' },
  ])
})

const page = async (id: number | string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await ReportPage({ params: Promise.resolve({ id: String(id) }), searchParams: Promise.resolve(searchParams) }),
  )
const headings = (html: string, level: number) =>
  [...html.matchAll(new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, 'g'))].map(([, text]) => text)

async function store(overrides: Parameters<typeof baseReport>[1] = {}, status = 'klaar') {
  const checked = checkReportForm(
    { ...baseReport(squad, overrides), status },
    { match: { extraTime: false, goalsAgainst: 1, goalsFor: 2, opponent: 'N.E.C.', status: 'played' }, squad },
  )

  await saveReport(database.db, userId, matchId, { ...checked.plan!, status: status === 'klaar' ? 'klaar' : 'bezig' })
}

describe('the report screen', () => {
  it('tells search engines to stay away, and is for the beheerder and not for the moderator', async () => {
    expect(metadata.robots).toEqual({ follow: false, index: false })

    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('moderator') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(page(matchId)).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('beheerder')
  })

  it('is "not found" for a match that does not exist, was not played, or is no number', async () => {
    await database.db.update(matches).set({ goalsAgainst: null, goalsFor: null, status: 'scheduled' })

    await expect(page(matchId)).rejects.toThrow('not found')
    await expect(page(999_999)).rejects.toThrow('not found')
    await expect(page('x')).rejects.toThrow('not found')
  })

  it('opens a new report with a title, the data, and for each team the five parts under a heading', async () => {
    const html = await page(matchId)

    expect(headings(html, 1)).toEqual(['Verslag: sc Heerenveen - N.E.C.'])
    expect(headings(html, 2)).toEqual([
      'Gegevens',
      'Opstelling en bank van sc Heerenveen',
      'Wissels van sc Heerenveen',
      'Doelpunten van sc Heerenveen',
      'Kaarten van sc Heerenveen',
      'Gemiste strafschoppen van sc Heerenveen',
      'Opstelling en bank van N.E.C.',
      'Wissels van N.E.C.',
      'Doelpunten van N.E.C.',
      'Kaarten van N.E.C.',
      'Gemiste strafschoppen van N.E.C.',
      'Opslaan',
    ])
    expect(html).toContain('Nog geen verslag')
    // Uitslag 2-1.
    expect(html).toContain('Uitslag 2–1')
    // The hint above the source says what belongs there, in one sentence.
    expect(html).toContain('Schrijf de naam van wat je overtypt, zoals wedstrijdformulier of uitzending')
    expect(html).toContain('nooit tekst van een verslag en geen hele tabellen van een site met statistieken.')
    // A line-up of eleven empty rows, and the goals of Wikipedia by name.
    expect(html.match(/name="speler-wij-\d+-rugnummer"/g)).toHaveLength(11)
    expect(html).toContain('value="Speler 9"')
    expect(html).toContain('value="Sibbing"')
    expect(html).not.toContain('Verslag weghalen')
  })

  it('has a hidden first button that saves, so Enter never removes a row, and a label for every field that names the row', async () => {
    await store()

    const html = await page(matchId)
    const first = html.match(/<button[^>]*>/u)?.[0] ?? ''

    expect(first).toContain('value="opslaan"')
    expect(first).toContain('hf-visually-hidden')
    expect(html).toContain('Minuut<span class="hf-visually-hidden">, doelpunt 1</span>')
    expect(html).toContain('aria-label="Doelpunt 2 weghalen"')
    for (const kind of ['speler', 'wissel', 'doelpunt', 'kaart', 'strafschop']) {
      expect(html).toContain(`value="${kind}-wij-toevoegen"`)
      expect(html).toContain(`value="${kind}-zij-toevoegen"`)
    }
  })

  it('lists a player as the number and the name, as the line-up has them', async () => {
    await store()

    const html = await page(matchId)

    expect(html).toContain('>9 Speler 9</option>')
    expect(html).toContain('>14 Speler 14</option>')
  })

  it('opens a report that is klaar and right with its status, the button that takes it away, and no errors', async () => {
    await store({ wij: { wissel: [substitution({ erin: '12', eruit: '11', minuut: '60' })] } })

    const html = await page(matchId)

    expect(html).toContain('Klaar')
    expect(html).toContain('Verslag weghalen')
    expect(html).not.toContain('Er is iets mis')
    expect(html).not.toContain('Controleer')
  })

  it('says "Controleer" and shows the error when the result changed after the report was klaar', async () => {
    await store()
    await database.db.update(matches).set({ goalsFor: 3 })

    const html = await page(matchId)

    expect(html).toContain('Controleer het verslag')
    expect(html).toContain('De doelpunten geven 2–1 en de uitslag is 3–1')
    expect(html).toMatch(/<a href="#doelpunt-wij">De doelpunten geven/u)
  })

  it('shows what is still to do when the report is bezig, and the warnings at their list', async () => {
    await store({ wij: { speler: baseReport(squad).wij.speler.slice(0, 13) } }, 'bezig')

    const html = await page(matchId)

    expect(html).toContain('Bezig')
    expect(html).toContain('De bank van sc Heerenveen heeft 2 spelers')
  })

  it.each([
    ['klaar', 'Klaar.'],
    ['nog-niet-klaar', 'Bewaard als bezig.'],
    ['opgeslagen', 'Opgeslagen.'],
    ['ongewijzigd', 'Niets veranderd.'],
    ['weggehaald', 'Verslag weggehaald.'],
    ['geen-verslag', 'Niets weggehaald.'],
  ])('tells what the last action did: %s', async (done, title) => {
    expect(await page(matchId, { gedaan: done })).toContain(title)
  })

  it('does not tell anything for a word it does not know', async () => {
    expect(await page(matchId, { gedaan: 'iets' })).not.toContain('class="hf-notice')
  })

  it('has a sidebar with the save panel and a link back to the match', async () => {
    const html = await page(matchId)

    expect(html).toContain('aria-label="Opslaan en verslag"')
    expect(html).toContain(`href="/beheer/wedstrijden/${matchId}"`)
    expect(html).toContain('form="verslag"')
    // The row of a new empty speler is the default.
    expect(emptyRow('speler').rol).toBe('basis')
    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, matchId))).toHaveLength(3)
  })
})
