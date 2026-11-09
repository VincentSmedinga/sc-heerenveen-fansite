import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { encodeProposal, type ReadMatch } from '@fansite/db/match-changes'
import { encodePartProposal } from '@fansite/db/match-conflicts'
import {
  adminUsers,
  auditLog,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  type NewMatch,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { emptyAddValues } from '#src/beheer/match-add-fields'
import { type MatchFormState } from '#src/beheer/match-fields'
import { emptyFields, emptyGoal } from '#src/beheer/match-fields'
import { saveReport } from '#src/beheer/match-reports'
import { report as reportOf, squadOf } from '#src/beheer/report-fixtures'
import { checkReportForm } from '#src/beheer/report-form'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import {
  submitAddMatch,
  submitConflict,
  submitDeleteMatch,
  submitHeldChange,
  submitMatch,
  submitRemoveEntry,
} from './actions'

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
let moderatorId: number
let matchId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const scheduled: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  home: true,
  kickoffAt: new Date('2026-10-31T17:45:00Z'),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season: '2026/27',
  status: 'scheduled',
}

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  moderatorId =
    (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))

  const [values] = await withClubs(database.db, [scheduled])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  matchId = inserted?.id ?? 0
  await database.db
    .insert(players)
    .values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season: '2026/27' })
})

/** The form as an editor fills it in for a 2-1 win, and the changes in `overrides`. */
function form(overrides: Record<string, string> = {}) {
  const formData = new FormData()
  const values: Record<string, string> = {
    ...emptyFields,
    'aftrap-datum': '2026-10-31',
    'aftrap-tijd': '18:45',
    reden: 'Wikipedia is achter',
    status: 'played',
    'uitslag-wij': '2',
    'uitslag-zij': '1',
    verlenging: 'nee',
    ...overrides,
  }

  for (const [name, value] of Object.entries(values)) {
    formData.set(name, value)
  }

  return formData
}

async function oyenId() {
  return String((await database.db.select().from(players))[0]?.id ?? 0)
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

/** The three goals of a 2-1 win, as fields. */
async function threeGoals() {
  return {
    'doelpunt-1-kant': 'wij',
    'doelpunt-1-minuut': '12',
    'doelpunt-1-naam': '',
    'doelpunt-1-soort': 'gewoon',
    'doelpunt-1-speler': await oyenId(),
    'doelpunt-2-kant': 'zij',
    'doelpunt-2-minuut': '40',
    'doelpunt-2-naam': 'Sibbing',
    'doelpunt-2-soort': 'gewoon',
    'doelpunt-2-speler': '',
    'doelpunt-3-kant': 'wij',
    'doelpunt-3-minuut': '77',
    'doelpunt-3-naam': '',
    'doelpunt-3-soort': 'strafschop',
    'doelpunt-3-speler': await oyenId(),
  }
}

const initial: MatchFormState = {
  errors: {},
  values: { doelpunten: [], reden: '', velden: emptyFields },
}
const submit = (id: unknown, formData: FormData) => resultOf(() => submitMatch(id as number, initial, formData))
const remove = (id: unknown, reden: string) =>
  resultOf(() => {
    const formData = new FormData()

    formData.set('reden', reden)

    return submitRemoveEntry(id as number, {}, formData)
  })

const log = () => database.db.select().from(auditLog).orderBy(auditLog.id)
const edits = () => database.db.select().from(matchEdits)

describe('submitMatch', () => {
  it('stores the entry for the account of the session, marks it and leads to the page with a notice', async () => {
    const formData = form(await threeGoals())

    expect(await submit(matchId, formData)).toEqual({ redirect: `/beheer/wedstrijden/${matchId}?gedaan=opgeslagen` })
    expect((await database.db.select().from(matches))[0]).toMatchObject({
      goalsAgainst: 1,
      goalsFor: 2,
      status: 'played',
    })
    expect(await database.db.select().from(matchGoals)).toHaveLength(3)
    expect(await edits()).toMatchObject([{ editedBy: userId, goalsEdited: true, resultEdited: true }])
    expect(await log()).toMatchObject([
      { action: 'match.edit', itemId: matchId, reason: 'Wikipedia is achter', userId },
    ])
  })

  it('takes the account from the session and never from the form', async () => {
    await submit(matchId, form({ editedBy: String(moderatorId), userId: String(moderatorId) }))

    expect((await edits())[0]?.editedBy).toBe(userId)
    expect((await log())[0]?.userId).toBe(userId)
  })

  it('returns the form with the errors and the values, and stores nothing, for fields that are wrong', async () => {
    const result = await submit(matchId, form({ reden: '', 'uitslag-zij': '' }))

    expect(result).toMatchObject({
      errors: { reden: 'Schrijf waarom je dit invult of aanpast.', 'uitslag-zij': expect.any(String) },
      values: { reden: '', velden: { 'uitslag-wij': '2' } },
    })
    expect(await edits()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('refuses goals that do not give the result, with a sentence', async () => {
    const goals = await threeGoals()

    expect(await submit(matchId, form({ ...goals, 'uitslag-wij': '3' }))).toMatchObject({
      errors: { doelpunten: expect.stringContaining('De doelpunten geven 2–1') },
    })
    expect(await edits()).toEqual([])
  })

  it('does not take the rows that nobody filled in for goals, so a result without its scorers saves', async () => {
    const empty = { ...emptyGoal, kant: '' }
    const rows = Object.fromEntries(
      [1, 2, 3].flatMap((number) =>
        Object.entries(empty).map(([field, value]) => [`doelpunt-${number}-${field}`, value]),
      ),
    )

    expect(await submit(matchId, form(rows))).toEqual({ redirect: `/beheer/wedstrijden/${matchId}?gedaan=opgeslagen` })
    expect(await database.db.select().from(matchGoals)).toEqual([])
  })

  it('gives the form back with as many goals as the result asks for, the filled ones first', async () => {
    const result = await submit(
      matchId,
      form({
        'doelpunt-1-kant': 'wij',
        'doelpunt-1-minuut': '12',
        'doelpunt-1-speler': await oyenId(),
        'doelpunt-2-kant': '',
        'doelpunt-2-soort': 'gewoon',
        reden: '',
      }),
    )

    expect(result).toMatchObject({
      errors: { reden: expect.any(String) },
      values: { doelpunten: [{ kant: 'wij', minuut: '12' }, { ...emptyGoal }, { ...emptyGoal }] },
    })
  })

  it('keeps only the field that asks for the scorer, so a player of the opponent has no squad player', async () => {
    const oyen = await oyenId()
    const formData = form({
      'doelpunt-1-kant': 'zij',
      'doelpunt-1-minuut': '40',
      'doelpunt-1-naam': 'Sibbing',
      'doelpunt-1-soort': 'gewoon',
      'doelpunt-1-speler': oyen,
      'doelpunt-2-kant': 'wij',
      'doelpunt-2-minuut': '50',
      'doelpunt-2-naam': 'Oyen',
      'doelpunt-2-soort': 'gewoon',
      'doelpunt-2-speler': oyen,
      'doelpunt-3-kant': 'wij',
      'doelpunt-3-minuut': '60',
      'doelpunt-3-soort': 'gewoon',
      'doelpunt-3-speler': oyen,
      'uitslag-wij': '2',
      'uitslag-zij': '1',
    })

    expect(await submit(matchId, formData)).toEqual({ redirect: `/beheer/wedstrijden/${matchId}?gedaan=opgeslagen` })
    expect(
      (await database.db.select().from(matchGoals)).map((goal) => [goal.minute, goal.player, goal.playerId !== null]),
    ).toEqual([
      [40, 'Sibbing', false],
      [50, 'Luca Oyen', true],
      [60, 'Luca Oyen', true],
    ])
  })

  it('says it saved nothing when nothing changed', async () => {
    const same = form({ 'aftrap-tijd': '18:45', status: 'scheduled', 'uitslag-wij': '', 'uitslag-zij': '' })

    expect(await submit(matchId, same)).toEqual({ redirect: `/beheer/wedstrijden/${matchId}?gedaan=ongewijzigd` })
    expect(await log()).toEqual([])
  })

  it('adds a goal and keeps what was filled in, with the focus on the first field of the new goal, the minute', async () => {
    const formData = form({ 'doelpunt-1-kant': 'wij', 'doelpunt-1-minuut': '12' })

    formData.set('knop', 'doelpunt-toevoegen')

    const result = await submit(matchId, formData)

    expect(result).toMatchObject({
      errors: {},
      focus: 'doelpunt-2-minuut',
      values: { doelpunten: [{ kant: 'wij', minuut: '12' }, { ...emptyGoal }] },
    })
    expect(await edits()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('removes the goal that the button names, and puts the focus where the next goal is or on the add button', async () => {
    const goals = {
      'doelpunt-1-minuut': '10',
      'doelpunt-2-minuut': '20',
      'doelpunt-3-minuut': '30',
    }
    const first = form(goals)
    const last = form(goals)

    first.set('knop', 'doelpunt-weghalen-1')
    last.set('knop', 'doelpunt-weghalen-3')

    expect(await submit(matchId, first)).toMatchObject({
      focus: 'doelpunt-1-minuut',
      values: { doelpunten: [{ minuut: '20' }, { minuut: '30' }] },
    })
    expect(await submit(matchId, last)).toMatchObject({
      focus: 'doelpunt-toevoegen',
      values: { doelpunten: [{ minuut: '10' }, { minuut: '20' }] },
    })
    expect(await edits()).toEqual([])
  })

  it('sends a match that is gone, or a number that is not one, to the list with a notice', async () => {
    expect(await submit(99_999, form())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await submit('abc', form())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await submit(-1, form())).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
  })

  it('is for the beheerder: a moderator is told the page does not exist, and nothing is stored', async () => {
    jar.set(sessionCookieName, await startSession(database.db, moderatorId))

    await expect(submit(matchId, form())).rejects.toThrow('not found')
    expect(await edits()).toEqual([])
  })

  it('sends somebody without a session to the login page', async () => {
    jar.clear()

    expect(await submit(matchId, form())).toEqual({ redirect: '/beheer/inloggen' })
    expect(await edits()).toEqual([])
  })
})

describe('submitRemoveEntry', () => {
  it('takes the entry away, writes match.undo with the reason and leads to the page with a notice', async () => {
    await submit(matchId, form(await threeGoals()))

    expect(await remove(matchId, 'Het was een vergissing')).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=weggehaald`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: null, status: 'scheduled' })
    expect(await database.db.select().from(matchGoals)).toEqual([])
    expect(await edits()).toEqual([])
    expect((await log()).map((line) => [line.action, line.reason])).toEqual([
      ['match.edit', 'Wikipedia is achter'],
      ['match.undo', 'Het was een vergissing'],
    ])
  })

  it('asks for a reason, and takes nothing away without one', async () => {
    await submit(matchId, form())

    expect(await remove(matchId, '  ')).toEqual({ error: 'Schrijf waarom je de invoer weghaalt.' })
    expect(await remove(matchId, 'x'.repeat(301))).toEqual({ error: 'Schrijf hoogstens 300 tekens.' })
    expect(await edits()).toHaveLength(1)
    expect(await log()).toHaveLength(1)
  })

  it('says there was no entry, or no match', async () => {
    expect(await remove(matchId, 'Waarom')).toEqual({ redirect: `/beheer/wedstrijden/${matchId}?gedaan=geen-invoer` })
    expect(await remove(99_999, 'Waarom')).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
    expect(await remove('abc', 'Waarom')).toEqual({ redirect: '/beheer/wedstrijden?fout=weg' })
  })

  it('is for the beheerder', async () => {
    await submit(matchId, form())
    jar.set(sessionCookieName, await startSession(database.db, moderatorId))

    await expect(remove(matchId, 'Waarom')).rejects.toThrow('not found')
    expect(await edits()).toHaveLength(1)
  })
})

describe('submitConflict', () => {
  /** A match the editors entered as 2-1 and Wikipedia says 3-1 about: the difference waits. */
  async function waiting() {
    await submit(matchId, form())

    const [match] = await database.db.select().from(matches)
    const wikipedia = { ...match!, goalsFor: 3 }

    await database.db.insert(matchChanges).values({
      changed: 'uitslag',
      class: 'suspicious',
      competition: 'Eredivisie',
      firstSeenAt: new Date('2026-11-02T10:00:00Z'),
      lastSeenAt: new Date('2026-11-02T10:00:00Z'),
      matchId,
      newValue: 'sc Heerenveen 3–1 N.E.C.',
      oldValue: 'sc Heerenveen 2–1 N.E.C.',
      part: 'result',
      proposal: encodePartProposal('result', { goals: [], match: wikipedia }),
      reason: 'wijkt af van de invoer van de redactie',
      round: 'Speelronde 11',
      season: '2026/27',
      status: 'pending',
    })

    return (await database.db.select().from(matchChanges))[0]?.id ?? 0
  }

  const decide = (changeId: number | string, fields: Record<string, string>) => {
    const formData = new FormData()

    for (const [name, value] of Object.entries(fields)) {
      formData.set(name, value)
    }

    return resultOf(() => submitConflict(changeId as number, {}, formData))
  }

  it('takes Wikipedia over for the part, with the reason and the account in the log', async () => {
    const id = await waiting()

    expect(await decide(id, { besluit: 'overnemen', reden: 'Wikipedia heeft de bron' })).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=overgenomen`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 3, status: 'played' })
    expect(await edits()).toEqual([])
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ resolution: 'person', status: 'accepted' }])
    expect((await log()).map((line) => [line.action, line.reason, line.userId])).toEqual([
      ['match.edit', 'Wikipedia is achter', userId],
      ['match.take-over', 'Wikipedia heeft de bron', userId],
    ])
  })

  it('keeps the entry, with the reason and the account in the log', async () => {
    const id = await waiting()

    expect(await decide(id, { besluit: 'houden', reden: 'Wij zagen de uitslag zelf' })).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=gehouden`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 2 })
    expect(await edits()).toMatchObject([{ resultEdited: true }])
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ resolution: 'person', status: 'rejected' }])
    expect((await log()).at(-1)).toMatchObject({
      action: 'match.keep',
      reason: 'Wij zagen de uitslag zelf',
      userId,
    })
  })

  it('asks for a reason and for a choice, and decides nothing without them', async () => {
    const id = await waiting()

    expect(await decide(id, { besluit: 'overnemen', reden: '  ' })).toEqual({ error: 'Schrijf waarom je dit beslist.' })
    expect(await decide(id, { besluit: 'houden', reden: 'x'.repeat(301) })).toEqual({
      error: 'Schrijf hoogstens 300 tekens.',
    })
    expect(await decide(id, { besluit: 'misschien', reden: 'Waarom' })).toEqual({
      error: 'Kies of je Wikipedia overneemt of je invoer houdt.',
    })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ status: 'pending' }])
    expect(await log()).toHaveLength(1)
  })

  it('decides a difference once: the second time leads to the list with a notice', async () => {
    const id = await waiting()

    await decide(id, { besluit: 'houden', reden: 'Eerste' })

    expect(await decide(id, { besluit: 'overnemen', reden: 'Tweede' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=besloten',
    })
    expect(await decide(99_999, { besluit: 'overnemen', reden: 'Tweede' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=besloten',
    })
    expect(await decide('abc', { besluit: 'overnemen', reden: 'Tweede' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=besloten',
    })
    expect((await log()).map((line) => line.action)).toEqual(['match.edit', 'match.keep'])
  })

  it('is for the beheerder, and sends somebody without a session to the login page', async () => {
    const id = await waiting()

    jar.set(sessionCookieName, await startSession(database.db, moderatorId))
    await expect(decide(id, { besluit: 'overnemen', reden: 'Waarom' })).rejects.toThrow('not found')

    jar.clear()
    expect(await decide(id, { besluit: 'overnemen', reden: 'Waarom' })).toEqual({ redirect: '/beheer/inloggen' })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ status: 'pending' }])
  })
})

describe('submitHeldChange', () => {
  const wikipedia: ReadMatch = {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    attendance: null,
    competition: 'Eredivisie',
    dateText: null,
    extraTime: false,
    factsProblem: null,
    goals: null,
    goalsAgainst: 1,
    goalsFor: 3,
    goalsProblem: null,
    home: true,
    kickoffAt: scheduled.kickoffAt ?? null,
    matchDate: '2026-10-31',
    note: null,
    opponent: 'N.E.C.',
    opponentPage: null,
    penaltiesAgainst: null,
    penaltiesFor: null,
    referee: null,
    round: 'Speelronde 11',
    stadium: null,
    status: 'played',
  }

  /** A played match, 2-1, and a change that Wikipedia holds back: it says 3-1, or nothing. */
  async function held(newValue: null | string = 'sc Heerenveen 3–1 N.E.C.') {
    const [match] = await database.db.select().from(matches)

    await database.db
      .update(matches)
      .set({ goalsAgainst: 1, goalsFor: 2, resultSetAt: new Date('2026-10-31T21:00:00Z'), status: 'played' })
      .where(eq(matches.id, matchId))
    await database.db.insert(matchChanges).values({
      changed: newValue === null ? 'removed' : 'result',
      class: 'suspicious',
      competition: 'Eredivisie',
      firstSeenAt: new Date('2026-11-02T10:00:00Z'),
      lastSeenAt: new Date('2026-11-03T10:00:00Z'),
      matchId,
      newValue,
      oldValue: 'sc Heerenveen 2–1 N.E.C.',
      proposal: newValue === null ? null : encodeProposal({ clubId: match!.clubId, goals: [], match: wikipedia }),
      reason: 'the result changed after 3 days',
      round: 'Speelronde 11',
      season: '2026/27',
      status: 'pending',
    })

    return (await database.db.select().from(matchChanges))[0]?.id ?? 0
  }

  const decide = (changeId: number | string, fields: Record<string, string>) => {
    const formData = new FormData()

    for (const [name, value] of Object.entries(fields)) {
      formData.set(name, value)
    }

    return resultOf(() => submitHeldChange(changeId as number, {}, formData))
  }

  it('takes Wikipedia over: the match changes, the change is accepted, and the reason is in the log', async () => {
    const id = await held()

    expect(await decide(id, { besluit: 'overnemen', reden: 'Ik zag het in het verslag' })).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=wikipedia-overgenomen`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 3, status: 'played' })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ resolution: 'person', status: 'accepted' }])
    expect(await log()).toMatchObject([
      { action: 'match.take-over', itemId: matchId, reason: 'Ik zag het in het verslag', userId },
    ])
  })

  it('rejects the change: the match stays as it is, and the reason is in the log', async () => {
    const id = await held()

    expect(await decide(id, { besluit: 'afwijzen', reden: 'Dat klopt niet' })).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=wijziging-afgewezen`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 2 })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ resolution: 'person', status: 'rejected' }])
    expect(await log()).toMatchObject([{ action: 'match.keep', reason: 'Dat klopt niet', userId }])
  })

  it('removes the match when Wikipedia does not name it any more, and leads to the list', async () => {
    const id = await held(null)

    expect(await decide(id, { besluit: 'overnemen', reden: 'Het is weg' })).toEqual({
      redirect: '/beheer/wedstrijden?gedaan=verwijderd',
    })
    expect(await database.db.select().from(matches)).toEqual([])
    expect(await log()).toMatchObject([{ action: 'match.take-over', itemId: matchId }])
  })

  it('asks for a reason and for a choice, and decides nothing without them', async () => {
    const id = await held()

    expect(await decide(id, { besluit: 'overnemen', reden: '  ' })).toEqual({ error: 'Schrijf waarom je dit beslist.' })
    expect(await decide(id, { besluit: 'afwijzen', reden: 'x'.repeat(301) })).toEqual({
      error: 'Schrijf hoogstens 300 tekens.',
    })
    expect(await decide(id, { besluit: 'houden', reden: 'Waarom' })).toEqual({
      error: 'Kies of je Wikipedia overneemt of de wijziging afwijst.',
    })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ status: 'pending' }])
    expect(await log()).toEqual([])
  })

  it('changes nothing for a change that is decided already, and leads to the list with a notice', async () => {
    const id = await held()

    await decide(id, { besluit: 'afwijzen', reden: 'Eerste' })

    expect(await decide(id, { besluit: 'overnemen', reden: 'Tweede' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=besloten',
    })
    expect(await decide(99_999, { besluit: 'overnemen', reden: 'Tweede' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=besloten',
    })
    expect(await decide('abc', { besluit: 'overnemen', reden: 'Tweede' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=besloten',
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 2 })
    expect(await log()).toHaveLength(1)
  })

  it('does not take a difference with an entry of the editors for a held change', async () => {
    const id = await held()

    await database.db.update(matchChanges).set({ part: 'result' }).where(eq(matchChanges.id, id))

    expect(await decide(id, { besluit: 'overnemen', reden: 'Waarom' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=besloten',
    })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ status: 'pending' }])
  })

  it('leads to the list with a notice when the match is gone, and changes nothing', async () => {
    const id = await held()

    // The match is not on the round of the change any more.
    await database.db.update(matches).set({ round: 'Speelronde 12' }).where(eq(matches.id, matchId))

    expect(await decide(id, { besluit: 'afwijzen', reden: 'Waarom' })).toEqual({
      redirect: '/beheer/wedstrijden?fout=weg',
    })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ status: 'pending' }])
    expect(await log()).toEqual([])
  })

  it('says so when the change has no proposal to apply, and changes nothing', async () => {
    const id = await held()

    await database.db.update(matchChanges).set({ proposal: 'niets' }).where(eq(matchChanges.id, id))

    expect(await decide(id, { besluit: 'overnemen', reden: 'Waarom' })).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=wijziging-niet-gelukt`,
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 2 })
    expect(await log()).toEqual([])
  })

  it('is for the beheerder, and sends somebody without a session to the login page', async () => {
    const id = await held()

    jar.set(sessionCookieName, await startSession(database.db, moderatorId))
    await expect(decide(id, { besluit: 'overnemen', reden: 'Waarom' })).rejects.toThrow('not found')

    jar.clear()
    expect(await decide(id, { besluit: 'overnemen', reden: 'Waarom' })).toEqual({ redirect: '/beheer/inloggen' })
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ status: 'pending' }])
    expect((await database.db.select().from(matches))[0]).toMatchObject({ goalsFor: 2 })
  })
})

describe('submitMatch for a match with a report', () => {
  /** A 2-1 win with a report that is klaar: its goals are the goals of the match. */
  async function withReport() {
    await database.db.insert(players).values(
      squadOf(1).map((player) => ({
        name: player.name,
        searchTerm: player.name,
        season: '2026/27',
        shirtNumber: player.shirtNumber,
      })),
    )

    const squad = (await database.db.select().from(players)).filter((player) => player.name.startsWith('Speler '))
    const choices = squad.map((player) => ({ id: player.id, name: player.name, shirtNumber: player.shirtNumber }))

    await submit(matchId, form({ ...(await threeGoals()) }))

    const plan = checkReportForm(reportOf(choices), {
      match: {
        extraTime: false,
        goalsAgainst: 1,
        goalsFor: 2,
        opponent: 'N.E.C.',
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      },
      squad: choices,
    }).plan

    await saveReport(database.db, userId, matchId, plan!)
  }

  it('saves the kick-off and leaves the goals as the report made them, with their players', async () => {
    await withReport()

    const before = await database.db.select().from(matchGoals).orderBy(matchGoals.id)

    expect(before.every((goal) => goal.appearanceId !== null || !goal.ours)).toBe(true)

    // The form of a match with a report has no goals: the request holds none.
    expect(await submit(matchId, form({ 'aftrap-tijd': '19:45' }))).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=opgeslagen`,
    })
    expect(await database.db.select().from(matchGoals).orderBy(matchGoals.id)).toEqual(before)
    expect((await edits())[0]).toMatchObject({ goalsEdited: true })
    expect((await log()).at(-1)).toMatchObject({ action: 'match.edit', detail: expect.stringContaining('Aftrap:') })
  })

  it('keeps a match with a report played, and says so at the status', async () => {
    await withReport()

    const answer = await submit(matchId, form({ status: 'postponed', 'uitslag-wij': '', 'uitslag-zij': '' }))

    expect(answer).toMatchObject({
      errors: {
        status: 'Een wedstrijd met een verslag blijft gespeeld, of wordt nog gespeeld. Haal eerst het verslag weg.',
      },
    })
    expect((await database.db.select().from(matches))[0]).toMatchObject({ status: 'played' })
  })
})

describe('submitAddMatch and submitDeleteMatch (issue 970)', () => {
  /** The form for a cup match of 2008/09 against a new club, and the changes in `overrides`. */
  function addForm(overrides: Record<string, string> = {}) {
    const formData = new FormData()
    const values: Record<string, string> = {
      ...emptyAddValues,
      'aftrap-datum': '2009-05-12',
      bron: 'Leeuwarder Courant, 12 mei 2009',
      competitie: 'KNVB Beker',
      'nieuwe-club': 'Be Quick 1887',
      ronde: 'Finale',
      seizoen: '2008/09',
      status: 'played',
      tegenstander: 'nieuw',
      thuis: 'uit',
      'uitslag-wij': '2',
      'uitslag-zij': '1',
      ...overrides,
    }

    for (const [name, value] of Object.entries(values)) {
      formData.set(name, value)
    }

    return formData
  }

  const add = (formData: FormData) => resultOf(() => submitAddMatch({ errors: {}, values: emptyAddValues }, formData))
  const deleteMatch = (id: number, reden: string) =>
    resultOf(() => {
      const formData = new FormData()

      formData.set('reden', reden)

      return submitDeleteMatch(id, {}, formData)
    })
  const added = () => database.db.select().from(matches).where(eq(matches.dataSource, 'redactie'))

  it('adds the match for the account of the session and leads to its form, with a notice', async () => {
    const [row] = await (async () => {
      const result = await add(addForm())

      expect(result).toEqual({ redirect: expect.stringMatching(/^\/beheer\/wedstrijden\/\d+\?gedaan=toegevoegd$/u) })

      return added()
    })()

    expect(row).toMatchObject({
      opponent: 'Be Quick 1887',
      sourceLine: 'Leeuwarder Courant, 12 mei 2009',
      status: 'played',
    })
    expect(await log()).toMatchObject([{ action: 'match.add', itemId: row?.id, userId }])
  })

  it('returns the form with an error at each field and the values kept, and stores nothing', async () => {
    const result = await add(addForm({ bron: '', ronde: '' }))

    expect(result).toMatchObject({
      errors: { bron: expect.any(String), ronde: expect.any(String) },
      values: { 'nieuwe-club': 'Be Quick 1887', seizoen: '2008/09' },
    })
    expect(await added()).toEqual([])
  })

  it('refuses a match that is there already, with an error at the day', async () => {
    await add(addForm())

    expect(await add(addForm({ ronde: 'Halve finale' }))).toMatchObject({
      errors: { 'aftrap-datum': expect.stringContaining('staat er al') },
    })
    expect(await added()).toHaveLength(1)
  })

  it('is for a beheerder: a moderator adds nothing', async () => {
    jar.set(sessionCookieName, await startSession(database.db, moderatorId))

    await expect(add(addForm())).rejects.toThrow()
    expect(await added()).toEqual([])
  })

  it('deletes a match the editors added, with a reason, and leads to the list with a notice', async () => {
    await add(addForm())

    const [row] = await added()

    expect(await deleteMatch(row!.id, 'Dubbel')).toEqual({ redirect: '/beheer/wedstrijden?gedaan=wedstrijd-weg' })
    expect(await added()).toEqual([])
    expect((await log()).at(-1)).toMatchObject({ action: 'match.delete', reason: 'Dubbel', userId })
  })

  it('asks for a reason, and never deletes a match of an import', async () => {
    expect(await deleteMatch(matchId, '')).toMatchObject({ error: expect.any(String) })
    expect(await deleteMatch(matchId, 'Waarom')).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=niet-van-ons`,
    })
    expect(await database.db.select().from(matches).where(eq(matches.id, matchId))).toHaveLength(1)
  })
})
