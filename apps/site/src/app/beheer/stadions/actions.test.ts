import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, auditLog, clubHomeGrounds, clubs, matches, type NewMatch, stadiums } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HomeGroundRowValues } from '#src/beheer/home-ground-fields'

import { createAccount } from '#src/beheer/accounts'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitClubWikidata, submitHomeGrounds } from './actions'

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
let authorId: number
let clubId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const visit = (matchDate: string, season: string, stadium: string): Omit<NewMatch, 'clubId'> => ({
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 1,
  home: false,
  kickoffAt: new Date(`${matchDate}T18:45:00Z`),
  matchDate,
  opponent: 'Oefenstad AZ',
  round: `Speelronde ${season}`,
  season,
  stadium,
  status: 'played',
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('UPDATE clubs SET home_grounds_source = NULL, wikidata_id = NULL')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  await createAccount(database.db, 'jelle@example.org', 'author', '')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  authorId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))

  const values = await withClubs(database.db, [
    visit('2024-11-10', '2024/25', 'Oud Stadion'),
    visit('2025-11-09', '2025/26', 'Nieuwe Arena'),
  ])

  await database.db.insert(matches).values(values)
  clubId = (await database.db.select().from(clubs))[0]?.id ?? 0
})

const slug = 'oefenstad-az'

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

const log = () => database.db.select().from(auditLog)

const emptyGround = { dag: '', seizoen: '', stadion: '', toelichting: '' }
const homeGrounds = (rows: Partial<HomeGroundRowValues>[], knop = 'thuis-opslaan') => {
  const formData = new FormData()

  rows.forEach((values, index) => {
    for (const [field, value] of Object.entries({ ...emptyGround, ...values })) {
      formData.set(`thuis-${index + 1}-${field}`, value)
    }
  })
  formData.set('knop', knop)

  return formData
}
const saveGrounds = (formData: FormData, clubSlug = slug) =>
  resultOf(() => submitHomeGrounds(clubSlug, { errors: {}, values: [] }, formData))

describe('submitHomeGrounds', () => {
  it('saves the grounds, sets the source of the club to manual so the import leaves them alone, and logs counts only', async () => {
    const [one, two] = (await database.db.select().from(stadiums)).map((stadium) => String(stadium.id)) as [
      string,
      string,
    ]

    expect(
      await saveGrounds(
        homeGrounds([{ stadion: one }, { seizoen: '2005/06', stadion: two, toelichting: 'Een geheime toelichting' }]),
      ),
    ).toEqual({ redirect: '/beheer/stadions/oefenstad-az?gedaan=thuisvelden-opgeslagen' })

    expect(
      (await database.db.select().from(clubHomeGrounds).where(eq(clubHomeGrounds.clubId, clubId))).map(
        (row) => row.stadiumId,
      ),
    ).toEqual([Number(one), Number(two)])
    expect((await database.db.select().from(clubs).where(eq(clubs.id, clubId)))[0]?.homeGroundsSource).toBe('manual')
    expect((await log()).map((entry) => [entry.action, entry.detail])).toEqual([
      ['home-ground.save', '2 thuisvelden, 1 met toelichting'],
    ])
  })

  it('says what is wrong at each field and saves nothing', async () => {
    const [one] = (await database.db.select().from(stadiums)).map((stadium) => String(stadium.id)) as [string]
    const answer = await saveGrounds(homeGrounds([{ stadion: 'onzin' }, { seizoen: '1999', stadion: one }]))

    expect(answer).toMatchObject({
      errors: {
        'thuis-1-stadion': 'Kies een stadion uit de lijst.',
        'thuis-2-seizoen': 'Schrijf het seizoen zoals 2019/20.',
      },
    })
    expect(await database.db.select().from(clubHomeGrounds)).toEqual([])
    expect((await database.db.select().from(clubs).where(eq(clubs.id, clubId)))[0]?.homeGroundsSource).toBeNull()
  })

  it('adds and removes a line without saving, and puts the focus where the editor was', async () => {
    expect(await saveGrounds(homeGrounds([{ stadion: '1' }], 'thuis-toevoegen'))).toMatchObject({
      focus: 'thuis-2-stadion',
      values: [{ stadion: '1' }, emptyGround],
    })
    expect(await saveGrounds(homeGrounds([{ stadion: '1' }, { stadion: '2' }], 'thuis-weghalen-1'))).toMatchObject({
      focus: 'thuis-1-stadion',
      values: [{ stadion: '2' }],
    })
    expect(await log()).toEqual([])
  })

  it('is for the editor, and ends on the list for a club that does not exist', async () => {
    expect(await saveGrounds(homeGrounds([]), 'bestaat-niet')).toEqual({ redirect: '/beheer/stadions/clubs?fout=weg' })

    jar.set(sessionCookieName, await startSession(database.db, authorId))
    await expect(saveGrounds(homeGrounds([]))).rejects.toThrow('not found')
  })
})

describe('submitClubWikidata', () => {
  const save = (value: string, clubSlug = slug) => {
    const formData = new FormData()

    formData.set('wikidata', value)

    return resultOf(() => submitClubWikidata(clubSlug, {}, formData))
  }

  it('saves a number, reads it case-insensitively, and writes it in the log', async () => {
    expect(await save(' q1234 ')).toEqual({ saved: 'Q1234', value: 'Q1234' })
    expect((await database.db.select().from(clubs).where(eq(clubs.id, clubId)))[0]?.wikidataId).toBe('Q1234')
    expect((await log()).map((entry) => entry.action)).toEqual(['club.edit'])
  })

  it('takes the number away with an empty field', async () => {
    await save('Q1234')
    expect(await save('')).toEqual({ saved: '', value: '' })
    expect((await database.db.select().from(clubs).where(eq(clubs.id, clubId)))[0]?.wikidataId).toBeNull()
  })

  it('says at the field when the number is wrong or belongs to another club', async () => {
    expect(await save('1234')).toMatchObject({ error: expect.stringContaining('Q1234') as string })
    await database.db.insert(clubs).values({ name: 'Oefenstad Andere', slug: 'oefenstad-andere', wikidataId: 'Q55' })

    expect(await save('Q55')).toMatchObject({ error: expect.stringContaining('hoort al bij') as string })
    expect(await log()).toEqual([])
  })
})
