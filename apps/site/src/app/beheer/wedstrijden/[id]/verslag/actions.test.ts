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
  matchShootoutKicks,
  type NewMatch,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { findReportScreen, reportBasis } from '#src/beheer/match-reports'
import {
  emptyRow,
  previousLineUpButtonValue,
  type ReportFormState,
  type ReportValues,
  type Row,
} from '#src/beheer/report-fields'
import { report as baseReport, formDataOf, goal, squadOf, substitution } from '#src/beheer/report-fixtures'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitFinish, submitRemoveReport, submitReport } from './actions'

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
  resultOf(() => submitReport(id as number, undefined, initial, formDataOf(values, knop)))
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

  it('takes a report back to bezig when a player goes off who is not on the pitch, as a form without JavaScript sends it', async () => {
    await submit(matchId, report())

    const wissel = [{ ...emptyRow('wissel'), erin: '13', eruit: '12', minuut: '60' }]

    expect(await submit(matchId, report({ wij: { wissel } }))).toEqual({ redirect: reportAddress('nog-niet-klaar') })
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

  it('refuses a save of a form that was opened before someone else saved, and gives back what was typed', async () => {
    await submit(matchId, report())

    const typed = report({ wij: { doelpunt: [goal({ minuut: '12', speler: 'wij-9' })] } })
    const answer = await resultOf(() => submitReport(matchId, 'leeg', initial, formDataOf(typed)))

    expect(answer).toMatchObject({
      errors: { verslag: expect.stringContaining('Iemand anders') as string },
      values: typed,
    })
    expect(await database.db.select().from(matchGoals)).toHaveLength(3)
  })

  it('saves a form whose report is the one that is stored', async () => {
    await submit(matchId, report())

    const screen = await findReportScreen(database.db, matchId)
    const formData = formDataOf({ ...report(), bron: 'ander wedstrijdformulier' })

    expect(await resultOf(() => submitReport(matchId, reportBasis(screen!.report), initial, formData))).toEqual({
      redirect: reportAddress('klaar'),
    })
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

  it('moves a player with a button, says where he stands now, and does not store anything', async () => {
    const start = report()
    const names = start.wij.speler.map((row) => row.keuze)
    const moved = (await submit(matchId, start, 'speler-wij-omlaag-1')) as ReportFormState

    expect(moved.values.wij.speler.map((row) => row.keuze)).toEqual([names[1], names[0], ...names.slice(2)])
    expect(moved.moved).toEqual({ side: 'wij', text: 'Speler 1 staat nu op plaats 2.' })
    expect(moved.focus).toBe('speler-wij-omlaag-2-knop')
    expect(await reports()).toHaveLength(0)

    // A button for a place that does not exist changes nothing.
    const none = (await submit(matchId, start, 'speler-wij-omhoog-1')) as ReportFormState

    expect(none.values.wij.speler.map((row) => row.keuze)).toEqual(names)
    expect(none.moved).toBeUndefined()
  })

  it('ends on the list with a notice for a match that is gone or was not played', async () => {
    expect(await submit(999_999, report())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await submit('x', report())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })

    await database.db.update(matches).set({ goalsAgainst: null, goalsFor: null, status: 'postponed' })

    expect(await submit(matchId, report())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await reports()).toHaveLength(0)
  })

  it('refuses a call without a session, or from an author', async () => {
    jar.clear()
    await expect(submitReport(matchId, undefined, initial, formDataOf(report()))).rejects.toMatchObject({
      url: '/beheer/inloggen',
    })

    await createAccount(database.db, 'jelle@example.org', 'author', '')

    const [author] = await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org'))

    jar.set(sessionCookieName, await startSession(database.db, author?.id ?? 0))
    await expect(submitReport(matchId, undefined, initial, formDataOf(report()))).rejects.toThrow('not found')
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

describe('submitReport for the kicks of the shoot-out', () => {
  const kick = (fields: Row): Row => ({ ...emptyRow('serie'), ...fields })

  /** A cup tie that ended 2-2 after extra time and 4-3 on penalties, with five rounds. */
  async function cupReport() {
    await database.db
      .update(matches)
      .set({
        competition: 'KNVB Beker',
        extraTime: true,
        goalsAgainst: 2,
        penaltiesAgainst: 3,
        penaltiesFor: 4,
      })
      .where(eq(matches.id, matchId))

    const values = report({
      zij: { doelpunt: [goal({ minuut: '40', naam: 'Sibbing' }), goal({ minuut: '100', naam: 'Sibbing' })] },
    })

    values.wij.serie = [9, 10, 8, 7, 6].map((speler, index) =>
      kick({ speler: String(speler), uitkomst: index === 2 ? 'naast' : 'raak' }),
    )
    values.zij.serie = ['raak', 'raak', 'naast', 'gestopt', 'raak'].map((uitkomst) => kick({ uitkomst }))

    return values
  }

  it('adds a row to the list with a button, also without JavaScript, and keeps the kicks that were typed', async () => {
    const values = await cupReport()
    const added = (await submit(matchId, values, 'serie-zij-toevoegen')) as ReportFormState

    expect(added).toMatchObject({ errors: {}, focus: 'serie-zij-6-speler', version: 1 })
    expect(added.values.zij.serie).toHaveLength(6)
    expect(added.values.wij.serie.map((row) => row.uitkomst)).toEqual(['raak', 'raak', 'naast', 'raak', 'raak'])
    expect(await reports()).toHaveLength(0)

    const removed = (await submit(matchId, values, 'serie-wij-weghalen-2')) as ReportFormState

    expect(removed.values.wij.serie.map((row) => row.speler)).toEqual(['9', '8', '7', '6'])
    expect(removed.focus).toBe('serie-wij-2-speler')
  })

  it('stores the kicks with the report, and takes them away when the list is empty', async () => {
    const values = await cupReport()

    expect(await submit(matchId, values)).toEqual({ redirect: reportAddress('klaar') })
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(10)

    values.wij.serie = []
    values.zij.serie = []
    // Without the kicks the result of the series stands alone, which is allowed.
    expect(await submit(matchId, values)).toEqual({ redirect: reportAddress('klaar') })
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(0)
  })

  it('gives a wrong series back as errors at the list and at the row, and stores nothing when the report can not be stored', async () => {
    const values = await cupReport()

    values.wij.serie[3] = kick({ speler: '30', uitkomst: 'raak' })

    const unknown = (await submit(matchId, values)) as ReportFormState

    expect(unknown.errors['serie-wij-4-speler']).toMatch(/in de opstelling of op de bank/u)
    expect(await reports()).toHaveLength(0)

    values.wij.serie[3] = kick({ speler: '7', uitkomst: 'naast' })

    // Only three of the five went in: the report is stored as bezig, with the error.
    expect(await submit(matchId, values)).toEqual({ redirect: reportAddress('nog-niet-klaar') })
    expect(await reports()).toMatchObject([{ status: 'bezig' }])
    expect(await database.db.select().from(matchShootoutKicks)).toHaveLength(10)
  })
})

describe('submitRemoveReport', () => {
  const remove = (id: unknown, reason: string) =>
    resultOf(() => {
      const formData = new FormData()

      formData.set('reden', reason)

      return submitRemoveReport(id as number, {}, formData)
    })

  it('takes the report away without a reason, and writes none in the log', async () => {
    await submit(matchId, report())

    expect(await remove(matchId, '  ')).toMatchObject({ redirect: expect.any(String) })
    expect(await reports()).toEqual([])
    expect((await database.db.select().from(auditLog)).at(-1)).toMatchObject({ action: 'match.undo', reason: null })
  })

  it('leaves the report as it is for a reason of more than 300 characters', async () => {
    await submit(matchId, report())

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

describe('submitFinish', () => {
  /** The match becomes one that is being played, with a report that is bezig. */
  async function beginMatch() {
    await database.db
      .update(matches)
      .set({ goalsAgainst: null, goalsFor: null, resultSetAt: null, status: 'scheduled' })
      .where(eq(matches.id, matchId))
    await database.db.insert(matchReports).values({ matchId, opponentComplete: false, status: 'bezig' })
  }

  const finish = (id: number | string, fields: Record<string, string>) => {
    const formData = new FormData()

    for (const [name, value] of Object.entries(fields)) {
      formData.set(name, value)
    }

    return submitFinish(id as number, {}, formData).catch((error: unknown) => {
      if (error instanceof Redirect) {
        return { redirect: error.url }
      }

      throw error
    })
  }
  const scores = { 'uitslag-wij': '2', 'uitslag-zij': '1' }

  it('gives the match its result, logs it, and ends on the report with a notice', async () => {
    await beginMatch()

    expect(await finish(matchId, scores)).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}/verslag?gedaan=afgelopen`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({
      goalsAgainst: 1,
      goalsFor: 2,
      status: 'played',
    })
    expect((await database.db.select().from(auditLog)).at(-1)).toMatchObject({
      action: 'match.edit',
      detail: 'Uitslag: sc Heerenveen 2–1 N.E.C.',
      reason: 'Wedstrijd afgelopen',
      userId,
    })
    expect((await database.db.select().from(matchReports))[0]).toMatchObject({ status: 'bezig' })
  })

  it('takes the numbers the editor changed', async () => {
    await beginMatch()
    await finish(matchId, { 'uitslag-wij': '4', 'uitslag-zij': '0' })

    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsAgainst: 0, goalsFor: 4 })
  })

  it.each([
    [{ 'uitslag-wij': '', 'uitslag-zij': '1' }, ['uitslag-wij']],
    [{ 'uitslag-wij': '2', 'uitslag-zij': 'x' }, ['uitslag-zij']],
    [{ 'uitslag-wij': '-1', 'uitslag-zij': '100' }, ['uitslag-wij', 'uitslag-zij']],
    [{ 'uitslag-wij': '1,5', 'uitslag-zij': '1' }, ['uitslag-wij']],
  ])(
    'says at each score that is not a whole number from 0 to 99, and writes nothing: %j',
    async (fields, fieldsWithError) => {
      await beginMatch()

      const answer = await finish(matchId, fields)

      expect(Object.keys((answer as { errors: object }).errors)).toEqual(fieldsWithError)
      // What was typed comes back, so the form can show it again.
      expect((answer as { values: object }).values).toEqual(fields)
      expect((answer as { errors: Record<string, string> }).errors[fieldsWithError[0]!]).toBe(
        'Vul een aantal doelpunten in, een heel getal van 0 tot 99.',
      )
      expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: null, status: 'scheduled' })
    },
  )

  it('says the match was already over when the import was first, and changes nothing', async () => {
    await beginMatch()
    await database.db
      .update(matches)
      .set({ goalsAgainst: 1, goalsFor: 3, status: 'played' })
      .where(eq(matches.id, matchId))

    expect(await finish(matchId, scores)).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}/verslag?gedaan=al-afgelopen`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 3 })
  })

  it('ends on the list for a match that is gone, and refuses a call without a session', async () => {
    expect(await finish(999_999, scores)).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await finish('x', scores)).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })

    jar.clear()
    expect(await finish(matchId, scores)).toEqual({ redirect: '/beheer/inloggen' })
  })
})

describe('submitReport with the button for the line-up of the previous match', () => {
  /** A match a week before, with the report of the fixture, so it has a line-up of ours. */
  async function previousMatch() {
    const [values] = await withClubs(database.db, [
      {
        ...played,
        kickoffAt: new Date('2026-10-24T17:45:00Z'),
        matchDate: '2026-10-24',
        opponent: 'Vorige Tegenstander',
        round: 'Speelronde 10',
      },
    ])
    const [inserted] = await database.db.insert(matches).values(values!).$returningId()
    const id = inserted?.id ?? 0

    expect(await submit(id, report())).toEqual({ redirect: `/beheer/wedstrijden/${id}/verslag?gedaan=klaar` })

    return id
  }

  /** The form with an empty line-up of ours, as a page opens it for a new report. */
  const empty = (): ReportValues => {
    const values = report({ wij: { speler: Array.from({ length: 11 }, () => emptyRow('speler')) } })

    return { ...values, formatie: { ...values.formatie, wij: { eigen: '', keuze: '' } } }
  }
  const press = (values: ReportValues) => submit(matchId, values, previousLineUpButtonValue) as Promise<ReportFormState>

  it('fills the formation and the rows of ours from the previous match, and says from which match', async () => {
    await previousMatch()

    const answer = await press(empty())

    expect(answer.takenFrom).toBe('Vorige Tegenstander, 24 oktober 2026')
    expect(answer.focus).toBe('speler-wij')
    expect(answer.errors).toEqual({})
    // The players and roles of the previous match, with the number the stored row has.
    expect(answer.values.wij.speler.map(({ keuze, rol }) => ({ keuze, rol }))).toEqual(
      report().wij.speler.map(({ keuze, rol }) => ({ keuze, rol })),
    )
    expect(answer.values.wij.speler.map((row) => row.rugnummer)).toEqual(
      Array.from({ length: 14 }, (_nothing, index) => String(index + 1)),
    )
    expect(answer.version).toBe(1)
    expect(await database.db.select().from(matchReports).where(eq(matchReports.matchId, matchId))).toHaveLength(0)
  })

  it('takes nothing but the line-up: the substitutions, goals, cards and the other side stay as typed', async () => {
    await previousMatch()

    const typed = {
      ...empty(),
      bron: 'Wedstrijdformulier',
      wij: { ...empty().wij, wissel: [substitution({ erin: '12', eruit: '11', minuut: '60' })] },
    }
    const answer = await press(typed)

    expect(answer.values.bron).toBe('Wedstrijdformulier')
    expect(answer.values.wij.wissel).toEqual(typed.wij.wissel)
    expect(answer.values.wij.doelpunt).toEqual(typed.wij.doelpunt)
    expect(answer.values.zij).toEqual(typed.zij)
  })

  it('writes over nothing: with a row filled in, or a formation, the form comes back as it was', async () => {
    await previousMatch()

    const typed = empty()
    const rows = typed.wij.speler.map((row, index) => (index === 0 ? { ...row, rugnummer: '5' } : row))
    const withRow = await press({ ...typed, wij: { ...typed.wij, speler: rows } })

    expect(withRow.takenFrom).toBeUndefined()
    expect(withRow.values.wij.speler).toEqual(rows)

    const withFormation = await press({ ...typed, formatie: { ...typed.formatie, wij: { eigen: '', keuze: '4-3-3' } } })

    expect(withFormation.takenFrom).toBeUndefined()
    expect(withFormation.values.formatie.wij.keuze).toBe('4-3-3')
  })

  it('does nothing when there is no earlier match with a line-up', async () => {
    const answer = await press(empty())

    expect(answer.takenFrom).toBeUndefined()
    expect(answer.values.wij.speler).toEqual(empty().wij.speler)
  })
})
