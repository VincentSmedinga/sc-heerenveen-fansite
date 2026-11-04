import type { TestDatabase } from '@fansite/db/test-database'

import { listClubNamePeriods } from '@fansite/db/club-name-periods'
import { withClubs } from '@fansite/db/clubs'
import { adminUsers, auditLog, clubs, matches, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { emptyNameRow, type NameFormState, type NameRowValues } from '#src/beheer/club-name-fields'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitNames, submitReset } from './actions'

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
let clubId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const visit = (matchDate: string, season: string): Omit<NewMatch, 'clubId'> => ({
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 1,
  home: false,
  kickoffAt: new Date(`${matchDate}T18:45:00Z`),
  matchDate,
  opponent: 'Oefenstad AZ',
  round: `Speelronde ${season}`,
  season,
  status: 'played',
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM club_name_periods')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM club_names')
  await database.pool.query('DELETE FROM clubs')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  moderatorId =
    (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))

  const values = await withClubs(database.db, [visit('2024-11-10', '2024/25'), visit('2025-11-09', '2025/26')])

  await database.db.insert(matches).values(values)
  clubId = (await database.db.select().from(clubs))[0]?.id ?? 0
})

const slug = 'oefenstad-az'

const row = (more: Partial<NameRowValues> = {}): NameRowValues => ({ ...emptyNameRow, naam: 'Naam Test', ...more })

/** A form as the browser sends it: the lines as fields, and the button that was pressed. */
function form(rows: readonly NameRowValues[], knop = 'opslaan', extra: Record<string, string> = {}) {
  const formData = new FormData()

  rows.forEach((values, index) => {
    for (const [field, value] of Object.entries(values)) {
      formData.set(`regel-${index + 1}-${field}`, value)
    }
  })
  formData.set('knop', knop)
  for (const [name, value] of Object.entries(extra)) {
    formData.set(name, value)
  }

  return formData
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

const initial: NameFormState = { errors: {}, values: [] }
const submit = (formData: FormData, clubSlug: unknown = slug) =>
  resultOf(() => submitNames(clubSlug as string, initial, formData))
const reset = (clubSlug: unknown = slug) => resultOf(() => submitReset(clubSlug as string))
const stored = () => listClubNamePeriods(database.db, clubId)
const log = () => database.db.select().from(auditLog)

const azList = [
  row({ naam: 'Oefen AZ' }),
  row({ dag: '2019-08-10', naam: 'Oefen Boys', toelichting: 'De club heette even anders, zegt Wikipedia.' }),
  row({ naam: 'Oefenstad AZ', seizoen: '2020/21' }),
]

describe('submitNames', () => {
  it('saves the lines, writes a row in the log without the note, and ends on the page of the club', async () => {
    expect(await submit(form(azList))).toEqual({ redirect: '/beheer/clubnamen/oefenstad-az?gedaan=opgeslagen' })

    expect(await stored()).toEqual([
      { name: 'Oefen AZ', note: null, startDay: null, startSeason: null },
      {
        name: 'Oefen Boys',
        note: 'De club heette even anders, zegt Wikipedia.',
        startDay: '2019-08-10',
        startSeason: null,
      },
      { name: 'Oefenstad AZ', note: null, startDay: null, startSeason: '2020/21' },
    ])
    expect(await log()).toMatchObject([
      {
        action: 'club-name.save',
        detail: '3 regels, 1 met toelichting, 2 namen erbij voor de import',
        itemId: clubId,
        userId,
      },
    ])
    expect(JSON.stringify(await log())).not.toContain('even anders')
  })

  it('takes the account from the session and never from the form', async () => {
    await submit(form(azList, 'opslaan', { userId: String(moderatorId) }))

    expect((await log())[0]?.userId).toBe(userId)
  })

  it('returns the form with the errors at their fields and the values, and stores nothing', async () => {
    const result = await submit(
      form([row({ naam: '', toelichting: 'Alleen een toelichting' }), row({ seizoen: '2019-20' })]),
    )

    expect(result).toMatchObject({
      errors: {
        'regel-1-naam': 'Vul de naam van de club in.',
        'regel-2-seizoen': 'Schrijf het seizoen zoals 2019/20.',
      },
      values: [
        { naam: '', toelichting: 'Alleen een toelichting' },
        { naam: 'Naam Test', seizoen: '2019-20' },
      ],
    })
    expect(await stored()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('refuses a note that is too long and a start that does not go up, and keeps the old list', async () => {
    await submit(form(azList))

    const result = await submit(
      form([row({ toelichting: 'a'.repeat(201) }), row({ seizoen: '2020/21' }), row({ seizoen: '2019/20' })]),
    )

    expect(result).toMatchObject({
      errors: {
        'regel-1-toelichting': 'Schrijf hoogstens 200 tekens.',
        'regel-3-seizoen': 'De start moet na de start van de regel erboven liggen.',
      },
    })
    expect(await stored()).toHaveLength(3)
    expect(await log()).toHaveLength(1)
  })

  it('does not count a line nobody filled in, and asks for at least one line', async () => {
    expect(await submit(form([row(), { ...emptyNameRow }]))).toEqual({
      redirect: '/beheer/clubnamen/oefenstad-az?gedaan=opgeslagen',
    })
    expect(await stored()).toHaveLength(1)
    expect(await submit(form([{ ...emptyNameRow }]))).toMatchObject({
      errors: { regels: expect.any(String) },
      values: [],
    })
  })

  it('shows the note as it was typed, and keeps markup as text', async () => {
    await submit(form([row({ toelichting: '<script>alert(1)</script>' })]))

    expect((await stored())[0]?.note).toBe('<script>alert(1)</script>')
  })

  it('adds a line with the values kept, and puts the focus on its name, and saves nothing', async () => {
    const result = await submit(form([row(), row({ naam: 'Tweede', seizoen: '2020/21' })], 'regel-toevoegen'))

    expect(result).toMatchObject({
      errors: {},
      focus: 'regel-3-naam',
      values: [{ naam: 'Naam Test' }, { naam: 'Tweede', seizoen: '2020/21' }, emptyNameRow],
    })
    expect(await stored()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('removes the line of the button, puts the focus on the line that took its place, and saves nothing', async () => {
    const lines = [
      row({ naam: 'Een' }),
      row({ naam: 'Twee', seizoen: '2019/20' }),
      row({ naam: 'Drie', seizoen: '2020/21' }),
    ]

    expect(await submit(form(lines, 'regel-weghalen-2'))).toMatchObject({
      focus: 'regel-2-naam',
      values: [{ naam: 'Een' }, { naam: 'Drie' }],
    })
    expect(await submit(form(lines, 'regel-weghalen-3'))).toMatchObject({
      focus: 'regel-toevoegen',
      values: [{ naam: 'Een' }, { naam: 'Twee' }],
    })
    expect(await stored()).toEqual([])
  })

  it('refuses a name of another club at its field, and stores nothing', async () => {
    await database.db.insert(clubs).values({ name: 'Oefenstad NAC', slug: 'oefenstad-nac' })

    const result = await submit(
      form([row({ naam: 'Oefen AZ' }), row({ naam: 'oefenstad n.a.c.', seizoen: '2020/21' })]),
    )

    expect(result).toMatchObject({
      errors: { 'regel-2-naam': expect.stringContaining('hoort al bij Oefenstad NAC') },
      values: [{ naam: 'Oefen AZ' }, { naam: 'oefenstad n.a.c.' }],
    })
    expect(await stored()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('ends on the list with a notice for a club that does not exist', async () => {
    expect(await submit(form(azList), 'bestaat-niet')).toEqual({ redirect: '/beheer/clubnamen?fout=weg' })
    expect(await submit(form(azList), 42)).toEqual({ redirect: '/beheer/clubnamen?fout=weg' })
    expect(await log()).toEqual([])
  })

  it('is for the beheerder: a moderator is told the page does not exist, and nothing is stored', async () => {
    jar.set(sessionCookieName, await startSession(database.db, moderatorId))

    await expect(submit(form(azList))).rejects.toThrow('not found')
    expect(await stored()).toEqual([])
  })

  it('sends somebody without a session to the login page', async () => {
    jar.clear()

    expect(await submit(form(azList))).toEqual({ redirect: '/beheer/inloggen' })
    expect(await stored()).toEqual([])
  })
})

describe('submitReset', () => {
  it('takes the whole list away, writes a row in the log and ends on the page of the club', async () => {
    await submit(form(azList))

    expect(await reset()).toEqual({ redirect: '/beheer/clubnamen/oefenstad-az?gedaan=weggehaald' })
    expect(await stored()).toEqual([])
    expect((await log()).map((entry) => [entry.action, entry.detail])).toEqual([
      ['club-name.save', '3 regels, 1 met toelichting, 2 namen erbij voor de import'],
      ['club-name.reset', '3 regels weggehaald'],
    ])
  })

  it('tells a club without a list that there was none, and writes nothing', async () => {
    expect(await reset()).toEqual({ redirect: '/beheer/clubnamen/oefenstad-az?gedaan=geen-lijst' })
    expect(await log()).toEqual([])
  })

  it('ends on the list with a notice for a club that does not exist', async () => {
    expect(await reset('bestaat-niet')).toEqual({ redirect: '/beheer/clubnamen?fout=weg' })
  })

  it('is for the beheerder, and sends somebody without a session to the login page', async () => {
    await submit(form(azList))
    jar.set(sessionCookieName, await startSession(database.db, moderatorId))
    await expect(reset()).rejects.toThrow('not found')

    jar.clear()
    expect(await reset()).toEqual({ redirect: '/beheer/inloggen' })
    expect(await stored()).toHaveLength(3)
  })
})
