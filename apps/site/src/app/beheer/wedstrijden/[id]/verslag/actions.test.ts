import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import {
  adminUsers,
  auditLog,
  matchAppearances,
  matchEdits,
  matches,
  matchGoals,
  matchReports,
  type NewMatch,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { emptyRow, type ReportFormState, type ReportValues } from '#src/beheer/report-fields'
import { report as baseReport, formDataOf, squadOf, substitution } from '#src/beheer/report-fixtures'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitRemoveReport, submitReport } from './actions'

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
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
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
})

const initial: ReportFormState = { errors: {}, values: baseReport([]), version: 0, warnings: {} }
const report = (overrides: Parameters<typeof baseReport>[1] = {}) => baseReport(squad, overrides)

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

const submit = (id: unknown, values: ReportValues, knop = 'opslaan') =>
  resultOf(() => submitReport(id as number, initial, formDataOf(values, knop)))
const reports = () => database.db.select().from(matchReports)
const reportAddress = (done: string) => `/beheer/wedstrijden/${matchId}/verslag?gedaan=${done}`

describe('submitReport', () => {
  it('stores a report that is right as klaar, for the account of the session, and leads to the screen with a notice', async () => {
    expect(await submit(matchId, report())).toEqual({ redirect: reportAddress('klaar') })
    expect(await reports()).toMatchObject([{ matchId, savedBy: userId, status: 'klaar' }])
    expect(await database.db.select().from(matchAppearances)).toHaveLength(14)
    expect(await database.db.select().from(matchEdits)).toMatchObject([
      { goalsEdited: true, reason: 'Verslag van de wedstrijd' },
    ])
    expect(await database.db.select().from(auditLog)).toMatchObject([{ action: 'match.edit', itemId: matchId, userId }])
  })

  it('stores a report that is bezig even when the rules find something, since a person fills it in over several sessions', async () => {
    const rows = report().wij.speler.slice(0, 10)

    expect(await submit(matchId, { ...report({ wij: { speler: rows } }), status: 'bezig' })).toEqual({
      redirect: reportAddress('opgeslagen'),
    })
    expect(await reports()).toMatchObject([{ status: 'bezig' }])
  })

  it('keeps a report as bezig when klaar was asked and the rules find something, and says so', async () => {
    const rows = report().wij.speler.slice(0, 10)

    expect(await submit(matchId, report({ wij: { speler: rows } }))).toEqual({
      redirect: reportAddress('nog-niet-klaar'),
    })
    expect(await reports()).toMatchObject([{ status: 'bezig' }])
    expect(await database.db.select().from(matchAppearances)).toHaveLength(10)
  })

  it('says klaar did not work every time it is asked for, also when nothing else changed', async () => {
    const rows = report().wij.speler.slice(0, 10)

    await submit(matchId, report({ wij: { speler: rows } }))

    expect(await submit(matchId, report({ wij: { speler: rows } }))).toEqual({
      redirect: reportAddress('nog-niet-klaar'),
    })
    expect(await database.db.select().from(auditLog)).toHaveLength(1)
  })

  it('takes a report that is klaar back to bezig when it is saved again with a mistake', async () => {
    await submit(matchId, report())

    const rows = report().wij.speler.map((row, index) => (index === 1 ? { ...row, rol: 'aanvoerder' } : row))

    expect(await submit(matchId, report({ wij: { speler: rows } }))).toEqual({
      redirect: reportAddress('nog-niet-klaar'),
    })
    expect(await reports()).toMatchObject([{ status: 'bezig' }])
  })

  it('does not store a report that the database could not hold, and gives the form back with its values and errors', async () => {
    const rows = report().wij.speler.map((row, index) => (index === 1 ? { ...row, rugnummer: '1' } : row))
    const answer = (await submit(matchId, { ...report({ wij: { speler: rows } }), status: 'bezig' })) as ReportFormState

    expect(answer.version).toBe(1)
    expect(answer.errors['speler-wij-2-rugnummer']).toMatch(/Rugnummer 1 staat twee keer/u)
    expect(answer.values.wij.speler[1]?.rugnummer).toBe('1')
    expect(await reports()).toHaveLength(0)
  })

  it('says it changed nothing, and writes nothing, when the same report is saved again', async () => {
    await submit(matchId, report())

    expect(await submit(matchId, report())).toEqual({ redirect: reportAddress('ongewijzigd') })
    expect(await database.db.select().from(auditLog)).toHaveLength(1)
  })

  it('adds a row with a button, and removes a row, and does not store anything', async () => {
    const added = (await submit(matchId, report(), 'wissel-wij-toevoegen')) as ReportFormState

    expect(added).toMatchObject({ errors: {}, focus: 'wissel-wij-1-minuut', version: 1 })
    expect(added.values.wij.wissel).toEqual([emptyRow('wissel')])

    const removed = (await submit(
      matchId,
      report({ wij: { wissel: [substitution({ erin: '12', eruit: '11', minuut: '60' })] } }),
      'wissel-wij-weghalen-1',
    )) as ReportFormState

    expect(removed.values.wij.wissel).toEqual([])
    expect(removed.focus).toBe('wissel-wij')
    expect(await reports()).toHaveLength(0)
  })

  it('ends on the list with a notice for a match that is gone or was not played', async () => {
    expect(await submit(999_999, report())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await submit('x', report())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })

    await database.db.update(matches).set({ goalsAgainst: null, goalsFor: null, status: 'scheduled' })

    expect(await submit(matchId, report())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await reports()).toHaveLength(0)
  })

  it('refuses a call without a session, or from a moderator', async () => {
    jar.clear()
    await expect(submitReport(matchId, initial, formDataOf(report()))).rejects.toMatchObject({
      url: '/beheer/inloggen',
    })

    await createAccount(database.db, 'jelle@example.org', 'moderator')

    const [moderator] = await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org'))

    jar.set(sessionCookieName, await startSession(database.db, moderator?.id ?? 0))
    await expect(submitReport(matchId, initial, formDataOf(report()))).rejects.toThrow('not found')
    expect(await reports()).toHaveLength(0)
  })

  it('leaves the import alone for the goals afterwards, also when the result changes', async () => {
    await database.db.insert(matchGoals).values({ matchId, minute: 12, ours: true, player: 'Oyen' })
    await submit(matchId, report())

    // The result of Wikipedia changes: it is not marked, so it follows. The goals are marked.
    const [edit] = await database.db.select().from(matchEdits)

    expect(edit).toMatchObject({ goalsEdited: true, resultEdited: false })
  })
})

describe('submitRemoveReport', () => {
  const remove = (id: unknown, reason: string) =>
    resultOf(() => {
      const formData = new FormData()

      formData.set('reden', reason)

      return submitRemoveReport(id as number, {}, formData)
    })

  it('asks for a reason, and leaves the report as it is without one', async () => {
    await submit(matchId, report())

    expect(await remove(matchId, '  ')).toEqual({ error: 'Schrijf waarom je het verslag weghaalt.' })
    expect(await remove(matchId, 'x'.repeat(301))).toEqual({ error: 'Schrijf hoogstens 300 tekens.' })
    expect(await reports()).toHaveLength(1)
  })

  it('removes the report with the reason, and leads to the screen with a notice', async () => {
    await submit(matchId, report())

    expect(await remove(matchId, 'Het was een proef')).toEqual({ redirect: reportAddress('weggehaald') })
    expect(await reports()).toHaveLength(0)
    expect((await database.db.select().from(auditLog).orderBy(asc(auditLog.id))).at(-1)).toMatchObject({
      action: 'match.undo',
      reason: 'Het was een proef',
      userId,
    })
  })

  it('says there was no report, or no such match', async () => {
    expect(await remove(matchId, 'Weg')).toEqual({ redirect: reportAddress('geen-verslag') })
    expect(await remove(999_999, 'Weg')).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
  })
})
