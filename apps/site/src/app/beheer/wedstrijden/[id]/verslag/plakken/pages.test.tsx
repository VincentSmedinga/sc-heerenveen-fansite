import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matches, type NewMatch, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { saveReport } from '#src/beheer/match-reports'
import { report as baseReport, squadOf } from '#src/beheer/report-fixtures'
import { checkReportForm } from '#src/beheer/report-form'
import { readPastedReport } from '#src/beheer/report-paste'
import { pasteExample } from '#src/beheer/report-paste-state'

import PasteReportPage, { metadata } from './page'
import { PasteOutcome } from './PasteScreen'

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
  squad = (await database.db.select().from(players)).map((player) => ({
    id: player.id,
    name: player.name,
    shirtNumber: player.shirtNumber,
  }))
})

const page = async (id: number | string) =>
  renderToStaticMarkup(await PasteReportPage({ params: Promise.resolve({ id: String(id) }) }))
const headings = (html: string, level: number) =>
  [...html.matchAll(new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, 'g'))].map(([, text]) => text)

describe('the screen Tekst plakken', () => {
  it('tells search engines to stay away, and is for the beheerder and not for the moderator', async () => {
    expect(metadata.robots).toEqual({ follow: false, index: false })

    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('moderator') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(page(matchId)).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('beheerder')
  })

  it('is "not found" for a match that does not exist, was not played, or is no number', async () => {
    await database.db.update(matches).set({ goalsAgainst: null, goalsFor: null, status: 'postponed' })

    await expect(page(matchId)).rejects.toThrow('not found')
    await expect(page(999_999)).rejects.toThrow('not found')
    await expect(page('x')).rejects.toThrow('not found')
  })

  it('has one h1 with the clubs, a card for the text and a card for the format, and a way back', async () => {
    const html = await page(matchId)

    expect(headings(html, 1)).toEqual(['Verslag plakken: sc Heerenveen - N.E.C.'])
    expect(headings(html, 2)).toEqual(['Tekst plakken', 'Het formaat'])
    expect(html).toContain('aria-label="Kruimelpad"')
    expect(html).toContain(`href="/beheer/wedstrijden/${matchId}/verslag"`)
    expect(html).toContain('Annuleren')
  })

  it('has a label and an explanation for the field, and the example of the format to copy', async () => {
    const html = await page(matchId)

    expect(html).toMatch(/<label[^>]*for="tekst"[^>]*>Tekst van het verslag/u)
    expect(html).toContain('Plak de tekst in het formaat hieronder. Hoogstens 20.000 tekens.')
    expect(html).toContain('Er wordt niets bewaard voordat je in het formulier Opslaan kiest.')
    expect(html).toContain('name="tekst"')
    expect(html).toMatch(/<textarea[^>]*readOnly=""[^>]*>Formatie: 4-3-3\nOpstelling\n/u)
    expect(html).toContain('Tekst lezen')

    // Every kind of line of the format has a rule.
    for (const word of ['Opstelling', 'Bank', 'Wissels', 'Doelpunten', 'Kaarten', 'Strafschoppen', 'Tegenstander']) {
      expect(html, word).toContain(word)
    }
  })

  it('has no box to replace for a match without a report', async () => {
    expect(await page(matchId)).not.toContain('name="vervangen"')
  })

  it('asks first, with what the report has now, for a match that has a report', async () => {
    const checked = checkReportForm(baseReport(squad), {
      match: {
        extraTime: false,
        goalsAgainst: 1,
        goalsFor: 2,
        opponent: 'N.E.C.',
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      },
      squad,
    })

    await saveReport(database.db, userId, matchId, { ...checked.plan!, status: 'klaar' })

    const html = await page(matchId)

    expect(html).toContain('name="vervangen"')
    expect(html).toContain('In het verslag staat al iets: 14 spelers')
    expect(html).toContain('Het verslag in de database verandert pas als je Opslaan kiest.')
    expect(html).toContain('Ja, vervang wat nu in het verslag staat')
  })

  it('has an example that its own reading takes without an unread line', () => {
    const result = readPastedReport(pasteExample, squadOf(1))

    expect(result.unread).toEqual([])
    expect(result.read.length).toBeGreaterThan(10)
  })
})

describe('what the reading says', () => {
  const result = readPastedReport('Opstelling\n1\n9 Speler 40\nvoor de opstelling\nDoelpunten\n12 onbekend', squadOf(1))
  const html = renderToStaticMarkup(
    <PasteOutcome
      state={{
        choices: result.choices,
        form: { errors: {}, values: result.values, version: 0, warnings: {} },
        kind: 'read',
        read: result.read,
        unread: result.unread,
        version: 1,
      }}
    />,
  )

  it('says in text, with the number of the line and the reason, which lines were not read', () => {
    expect(headings(html, 3)).toContain('Niet gelezen')
    expect(html).toContain('Regel 4:')
    expect(html).toContain('Regel 6:')
    expect(html).toContain('De speler die scoorde staat niet in de opstelling')
  })

  it('says that nothing is stored yet, and has the focus on the card', () => {
    expect(html).toContain('Er is nog niets bewaard.')
    expect(html).toContain('id="plakresultaat"')
    expect(html).toContain('tabindex="-1"')
  })

  it('lists what each line was read as, behind a fold', () => {
    expect(html).toContain('Wat we lazen')
    expect(html).toContain('Opstelling sc Heerenveen: 1 Speler 1')
  })
})
