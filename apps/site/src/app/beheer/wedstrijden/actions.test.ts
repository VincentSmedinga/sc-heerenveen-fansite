import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, auditLog, matchEdits, matches, matchGoals, type NewMatch, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '../../../beheer/accounts'
import { type MatchFormState } from '../../../beheer/match-fields'
import { emptyFields, emptyGoal } from '../../../beheer/match-fields'
import { sessionCookieName } from '../../../beheer/require-role'
import { startSession } from '../../../beheer/sessions'
import { submitMatch, submitRemoveEntry } from './actions'

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
vi.mock('../../../database', () => ({ getDatabase: () => database }))

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
    'doelpunt-2-speler': 'andere',
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

  it('says it saved nothing when nothing changed', async () => {
    const same = form({ 'aftrap-tijd': '18:45', status: 'scheduled', 'uitslag-wij': '', 'uitslag-zij': '' })

    expect(await submit(matchId, same)).toEqual({ redirect: `/beheer/wedstrijden/${matchId}?gedaan=ongewijzigd` })
    expect(await log()).toEqual([])
  })

  it('adds a goal and keeps what was filled in, with the focus on the first field of the new goal', async () => {
    const formData = form({ 'doelpunt-1-kant': 'wij', 'doelpunt-1-minuut': '12' })

    formData.set('knop', 'doelpunt-toevoegen')

    const result = await submit(matchId, formData)

    expect(result).toMatchObject({
      errors: {},
      focus: 'doelpunt-2-kant',
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
      focus: 'doelpunt-1-kant',
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
