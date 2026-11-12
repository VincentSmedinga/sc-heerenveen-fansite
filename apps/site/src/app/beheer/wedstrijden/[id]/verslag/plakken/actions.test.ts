import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import {
  adminUsers,
  matchAppearances,
  matches,
  matchGoals,
  matchReports,
  matchShootoutKicks,
  type NewMatch,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { saveReport } from '#src/beheer/match-reports'
import { report as baseReport, formDataOf, squadOf } from '#src/beheer/report-fixtures'
import { checkReportForm } from '#src/beheer/report-form'
import { firstPasteState, pasteMaxLength, type PasteState } from '#src/beheer/report-paste-state'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitPaste } from './actions'

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('#src/database', () => ({ getDatabase: () => database }))

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
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))

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
  ])
})

const text = [
  'Opstelling',
  '1',
  '9 (a)',
  '10 Speler 10',
  'Bank',
  '12',
  'Wissels',
  '60 12 voor 10',
  'Doelpunten',
  '12 9 assist 10',
  'onzin zonder minuut',
].join('\n')

function formOf(fields: Record<string, string>) {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  return formData
}

async function paste(fields: Record<string, string>, id: unknown = matchId, previous: PasteState = firstPasteState) {
  try {
    return await submitPaste(id as number, undefined, previous, formOf(fields))
  } catch (error) {
    if (error instanceof Redirect) {
      return { redirect: error.url }
    }

    throw error
  }
}

/** What an action returned, or where it redirected to. */
async function resultOf<T>(action: () => Promise<T>): Promise<T | { redirect: string }> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof Redirect) {
      return { redirect: error.url }
    }

    throw error
  }
}

/** How many rows every table of the report and its neighbours has: plakken must change none. */
async function rowCounts() {
  const counts: Record<string, number> = {}

  for (const table of [
    'matches',
    'match_goals',
    'match_edits',
    'match_reports',
    'match_appearances',
    'match_substitutions',
    'match_cards',
    'match_incidents',
    'match_shootout_kicks',
    'match_changes',
    'players',
    'audit_log',
  ]) {
    const [rows] = await database.pool.query(`SELECT COUNT(*) AS n FROM ${table}`)

    counts[table] = Number((rows as unknown as { n: number }[])[0]?.n)
  }

  return counts
}

describe('submitPaste', () => {
  it('reads the text into the values of the form, with what it could not read', async () => {
    const result = await paste({ tekst: text })

    expect(result).toMatchObject({ kind: 'read', version: 1 })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.form.values.wij.speler.map((row) => [row.keuze, row.rol, row.rugnummer])).toEqual([
      [String(squad[0]?.id), 'basis', '1'],
      [String(squad[8]?.id), 'aanvoerder', '9'],
      [String(squad[9]?.id), 'basis', '10'],
      [String(squad[11]?.id), 'bank', '12'],
    ])
    expect(result.form.values.wij.wissel).toMatchObject([{ erin: '4', eruit: '3', minuut: '60' }])
    expect(result.form.values.wij.doelpunt).toMatchObject([{ assist: 'wij-3', minuut: '12', speler: 'wij-2' }])
    expect(result.unread).toEqual([
      { line: 11, reason: expect.stringContaining('Begin met de minuut'), text: 'onzin zonder minuut' },
    ])
    expect(result.form.version).toBe(0)
  })

  it('checks the values as a form typed by hand is checked, so what is missing shows as an error', async () => {
    const result = await paste({ tekst: text })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(Object.keys(result.form.errors).length).toBeGreaterThan(0)
  })

  it('writes nothing: not the report, not the goals, not the squad and not the log', async () => {
    const before = await rowCounts()

    await paste({ tekst: text })
    await paste({ tekst: 'Opstelling\n44 Nieuwe Jongen' })

    expect(await rowCounts()).toEqual(before)
  })

  it('does not put the text in the log of the admin', async () => {
    await paste({ tekst: 'Opstelling\n44 Geheime Naam' })

    const [rows] = await database.pool.query("SELECT * FROM audit_log WHERE detail LIKE '%Geheime%'")

    expect(rows).toEqual([])
  })

  it('never adds a player to the squad: a name that is not in it comes back as a choice', async () => {
    const result = await paste({ tekst: 'Opstelling\n44 Nieuwe Jongen' })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.form.values.wij.speler[0]).toMatchObject({ keuze: '', naam: 'Nieuwe Jongen' })
    expect(result.choices).toHaveLength(1)
    expect(await database.db.select().from(players)).toHaveLength(14)
  })

  it('asks for text when there is none, and keeps what was typed', async () => {
    expect(await paste({ tekst: '   \n  ' })).toMatchObject({
      error: 'Plak eerst de tekst van het verslag.',
      field: 'tekst',
      kind: 'ask',
      version: 1,
    })
  })

  it('refuses a text of more than 20.000 characters, says so, and does not read it', async () => {
    const result = await paste({ tekst: `Opstelling\n${'4\n'.repeat(pasteMaxLength)}` })

    expect(result).toMatchObject({ error: expect.stringContaining('De tekst is te lang'), kind: 'ask' })
  })

  it('reads a text of exactly the most characters', async () => {
    const lines = ['Opstelling', ...Array.from({ length: 200 }, () => '4')]
    const filled = `${lines.join('\n')}\n${'#'.repeat(pasteMaxLength - lines.join('\n').length - 1)}`

    expect(filled).toHaveLength(pasteMaxLength)
    expect(await paste({ tekst: filled })).toMatchObject({ kind: 'read' })
  })

  it('handles a name and a line as text, never as markup', async () => {
    const result = await paste({ tekst: 'Tegenstander\nOpstelling\n5 <script>alert(1)</script>' })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.form.values.zij.speler[0]?.naam).toBe('<script>alert(1)</script>')
  })

  it('checks the length of a name that is not in the squad', async () => {
    const result = await paste({ tekst: `Opstelling\n5 ${'x'.repeat(101)}` })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.unread).toMatchObject([{ reason: 'Een naam heeft hoogstens 100 tekens.' }])
  })

  it('leads to the list with a notice for a match that is gone or was not played, and for a number that is none', async () => {
    expect(await paste({ tekst: text }, 999_999)).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await paste({ tekst: text }, 'x')).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await paste({ tekst: text }, 0)).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
  })

  it('is for the editor: a visitor without a session gets nothing', async () => {
    jar.clear()

    expect(await paste({ tekst: text })).toEqual({ redirect: '/beheer/inloggen' })
  })
})

describe('submitPaste for the post of the form after the text was read', () => {
  async function readState(tekst = text) {
    const result = await paste({ tekst })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    return result
  }

  it('answers with the screen of the report, in the same state, so a post without JavaScript keeps its form', async () => {
    const read = await readState()
    const result = await submitPaste(matchId, undefined, read, formDataOf(read.form.values, 'speler-zij-toevoegen'))

    expect(result).toMatchObject({ kind: 'read', version: read.version })

    if (result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.form.values.zij.speler).toHaveLength(read.form.values.zij.speler.length + 1)
    expect(result.form.version).toBe(1)
    expect(result.unread).toEqual(read.unread)
  })

  it('saves with the checks of the form: a doubt that is not settled comes back as an error, and nothing is stored', async () => {
    const read = await readState('Opstelling\n44 Nieuwe Jongen')
    const before = await rowCounts()
    const result = await submitPaste(matchId, undefined, read, formDataOf(read.form.values, 'opslaan'))

    expect(result).toMatchObject({ kind: 'read' })

    if (result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.form.errors['speler-wij-1-keuze']).toContain('kies een speler uit de selectie of Andere speler.')
    expect(await rowCounts()).toEqual(before)
  })

  it('saves a form that can be stored as the screen of the report does, and leads to its notice', async () => {
    const read = await readState()
    const values = { ...baseReport(squad), status: 'bezig' }

    expect(await resultOf(() => submitPaste(matchId, undefined, read, formDataOf(values, 'opslaan')))).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}/verslag?gedaan=opgeslagen`,
    })
    expect(await database.db.select().from(matchReports)).toHaveLength(1)
  })

  it('has no form to post when no text was read: it gives the screen as it opens', async () => {
    expect(await paste({ knop: 'opslaan' })).toEqual({ ...firstPasteState, version: 1 })
  })
})

describe('submitPaste for a match that has a report', () => {
  beforeEach(async () => {
    const checked = checkReportForm(baseReport(squad), {
      match: {
        extraTime: false,
        goalsAgainst: 1,
        goalsFor: 2,
        matchDate: '2026-10-31',
        opponent: 'N.E.C.',
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      },
      squad,
    })

    await saveReport(database.db, userId, matchId, { ...checked.plan!, status: 'klaar' })
  })

  it('asks first whether the report in the form may be replaced', async () => {
    const result = await paste({ tekst: text })

    expect(result).toMatchObject({
      error: 'Vink aan dat je wat nu in het verslag staat wilt vervangen, of kies Annuleren.',
      field: 'vervangen',
      kind: 'ask',
      replace: false,
      text,
    })
  })

  it('reads the text once the editor agreed, and still changes nothing in the database', async () => {
    const before = await rowCounts()
    const result = await paste({ tekst: text, vervangen: 'ja' })

    expect(result).toMatchObject({ kind: 'read' })
    expect(await rowCounts()).toEqual(before)
  })

  it('keeps the source of the report it replaces in the form', async () => {
    const result = await paste({ tekst: text, vervangen: 'ja' })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.form.values.bron).toBe('wedstrijdformulier')
    expect(result.form.values.status).toBe('bezig')
  })

  it('leaves the kicks of the shoot-out as they are, pointing to the same players by their shirt numbers', async () => {
    const appearances = await database.db.select().from(matchAppearances)
    const shirt = (number: number) => appearances.find((row) => row.ours && row.shirtNumber === number)?.id ?? null

    // Shirt 9 is in the pasted line-up, shirt 3 is not; the opponent's kicker is unknown.
    await database.db.insert(matchShootoutKicks).values([
      { appearanceId: shirt(9), matchId, ours: true, outcome: 'raak', round: 1 },
      { appearanceId: shirt(3), matchId, ours: true, outcome: 'naast', round: 2 },
      { appearanceId: null, matchId, ours: false, outcome: 'gestopt', round: 1 },
    ])

    const result = await paste({ tekst: text, vervangen: 'ja' })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    // The pasted line-up is 1, 9, 10 and the bench 12: shirt 9 is the second row.
    expect(result.form.values.wij.serie).toEqual([
      { speler: '2', uitkomst: 'raak' },
      { speler: '', uitkomst: 'naast' },
    ])
    expect(result.form.values.zij.serie).toEqual([{ speler: '', uitkomst: 'gestopt' }])
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(3)
  })

  it('has no kicks in the form of a report that has none', async () => {
    const result = await paste({ tekst: text, vervangen: 'ja' })

    if ('redirect' in result || result.kind !== 'read') {
      throw new Error('not read')
    }

    expect(result.form.values.wij.serie).toEqual([])
    expect(result.form.values.zij.serie).toEqual([])
  })
})
