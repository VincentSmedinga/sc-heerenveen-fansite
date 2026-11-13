import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import {
  adminUsers,
  auditLog,
  matchAppearances,
  matches,
  matchReports,
  type NewMatch,
  persons,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { parseSkipped, readNextQuestion, sideQuizAddress } from '#src/beheer/side-quiz'

import { submitSide } from './actions'
import SideQuizPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: database.db }) }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))

let database: TestDatabase
let rounds = 0
let personIds: Record<string, number>

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '2005-08-13',
  opponent: 'Testdorp FC',
  round: '1',
  season: '2005/06',
  status: 'played',
}

const eleven = (swap: Record<number, string> = {}) =>
  Array.from({ length: 11 }, (_nothing, index) => swap[index] ?? `Speler ${index + 1}`)

/** A match in a 4-3-3 with these starters, each linked to the player of that name. */
async function addMatch(starters: string[]) {
  const [row] = await withClubs(database.db, [{ ...base, round: String(++rounds) }])
  const [{ insertId }] = await database.db.insert(matches).values(row!)
  const found = await database.db.select({ id: players.id, name: players.name }).from(players)
  const idOf = new Map(found.map((one) => [one.name, one.id]))

  await database.db.insert(matchReports).values({ formationOurs: '4-3-3', matchId: insertId, status: 'klaar' })
  await database.db.insert(matchAppearances).values(
    starters.map((name) => ({
      matchId: insertId,
      name,
      ours: true,
      playerId: idOf.get(name) ?? null,
      starter: true,
    })),
  )
}

beforeEach(async () => {
  rounds = 0
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')

  const userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  requireRole.mockReset()
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')

  // Eleven persons, each with a player in 2005/06, and a user for the log.
  personIds = {}

  for (const name of eleven()) {
    const [{ insertId }] = await database.db.insert(persons).values({ line: 'aanvaller', name, nameSource: 'manual' })

    personIds[name] = insertId
    await database.db
      .insert(players)
      .values({ name, personId: insertId, searchTerm: name, season: '2005/06', wikipediaPage: null })
  }

  // Ten matches of the same line-up, one with players 2 and 3 swapped: everybody has ten
  // matches, and player 2 and 3 stood in their slot nine times, the others every time.
  for (let index = 0; index < 9; index++) {
    await addMatch(eleven())
  }

  await addMatch(eleven({ 1: 'Speler 3', 2: 'Speler 2' }))
})

const page = async (query: Record<string, string> = {}) =>
  renderToStaticMarkup(await SideQuizPage({ searchParams: Promise.resolve(query) }))

describe('the addresses of the quiz', () => {
  it('reads the skipped players as numbers and nothing else', () => {
    expect(parseSkipped('3,x,5,-2,0,7.5,')).toEqual([3, 5])
    expect(parseSkipped(undefined)).toEqual([])
  })

  it('keeps the skipped players and the answered one in the address', () => {
    expect(sideQuizAddress([])).toBe('/beheer/kwaliteit/plaatsen/vragen')
    expect(sideQuizAddress([4, 9], 12)).toBe('/beheer/kwaliteit/plaatsen/vragen?over=4%2C9&gedaan=12')
  })
})

describe('the next question', () => {
  it('is the player who stood in the same slot every time, and counts those who are left', async () => {
    const next = await readNextQuestion(database.db, [])

    expect(next?.left).toBe(11)
    expect(next?.question).toMatchObject({ matches: 10, percentage: 100, years: '2005/06' })
    expect(next?.question.name).not.toBe('Speler 2')
    expect(next?.question.name).not.toBe('Speler 3')
  })

  it('leaves out a player who was skipped and a person who has a side already', async () => {
    const first = (await readNextQuestion(database.db, []))!.question

    expect((await readNextQuestion(database.db, [first.personId]))?.left).toBe(10)

    await database.db.update(persons).set({ side: 'links' }).where(eq(persons.id, first.personId))

    expect((await readNextQuestion(database.db, []))?.left).toBe(10)
  })

  it('puts the players who stood in the same slot every time before the others', async () => {
    const skipAll = async (skipped: number[]): Promise<number[]> => {
      const next = await readNextQuestion(database.db, skipped)

      return next === undefined ? skipped : skipAll([...skipped, next.question.personId])
    }
    const order = await skipAll([])
    const shares = await Promise.all(
      order.map(
        async (_id, index) => (await readNextQuestion(database.db, order.slice(0, index)))!.question.percentage,
      ),
    )

    expect(shares).toEqual(shares.toSorted((a, b) => b - a))
    expect(shares.at(-1)).toBe(90)
  })
})

describe('the page of the quiz', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    await page()

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it('asks about one player, with buttons that name him, and says how many are left', async () => {
    const html = await page()
    const name = (await readNextQuestion(database.db, []))!.question.name

    expect(html).toContain(`>${name}</h2>`)
    expect(html).toContain('autofocus')
    expect(html).toContain('tabindex="-1"')

    for (const answer of ['links', 'midden', 'rechts', 'overslaan']) {
      expect(html).toContain(`${name}: ${answer}`)
      expect(html).toContain(`value="${answer}"`)
    }

    expect(html).toContain('Nog 11 spelers te gaan.')
  })

  it('says what was saved after an answer, in a status', async () => {
    await database.db.update(persons).set({ side: 'rechts' }).where(eq(persons.id, personIds['Speler 4']!))

    const html = await page({ gedaan: String(personIds['Speler 4']) })

    expect(html).toContain('Speler 4: rechts opgeslagen.')
    expect(html).toContain('role="status"')
  })

  it('says everybody has a side when nobody is left, and where to go', async () => {
    await database.db.update(persons).set({ side: 'midden' })

    const html = await page()

    expect(html).toContain('Alle spelers hebben een kant.')
    expect(html).toContain('href="/beheer/kwaliteit/plaatsen"')
  })
})

describe('the answer to a question', () => {
  const answer = async (person: number, over: string, knop: string) => {
    const formData = new FormData()

    formData.set('knop', knop)

    try {
      await submitSide(person, over, formData)
    } catch (error) {
      if (error instanceof Redirect) {
        return error.url
      }

      throw error
    }

    return undefined
  }

  it('gives the person the side, writes it in the log and goes on with the skipped players kept', async () => {
    const id = personIds['Speler 4']!

    expect(await answer(id, '3,5', 'links')).toBe(`/beheer/kwaliteit/plaatsen/vragen?over=3%2C5&gedaan=${id}`)
    expect((await database.db.select().from(persons).where(eq(persons.id, id)))[0]?.side).toBe('links')
    expect((await database.db.select().from(auditLog).orderBy(asc(auditLog.id))).map((row) => row.detail)).toEqual([
      'Aangepast: Speler 4. kant: geen → links.',
    ])
  })

  it('skips a player without saving, and keeps him out of the quiz for now', async () => {
    const id = personIds['Speler 5']!

    expect(await answer(id, '', 'overslaan')).toBe(`/beheer/kwaliteit/plaatsen/vragen?over=${id}`)
    expect((await database.db.select().from(persons).where(eq(persons.id, id)))[0]?.side).toBeNull()
    expect(await database.db.select().from(auditLog)).toHaveLength(0)
  })

  it('refuses a word that is not a side, a player that is not there, and a call without an editor', async () => {
    const id = personIds['Speler 6']!

    expect(await answer(id, '', 'boven')).toBe(`/beheer/kwaliteit/plaatsen/vragen?over=${id}`)
    expect(await answer(999_999, '', 'links')).toBe('/beheer/kwaliteit/plaatsen/vragen?over=999999')
    expect(await answer(Number.NaN, '', 'links')).toBe('/beheer/kwaliteit/plaatsen/vragen')
    expect((await database.db.select().from(persons).where(eq(persons.id, id)))[0]?.side).toBeNull()

    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))
    await expect(answer(id, '', 'links')).rejects.toThrow('redirect to /beheer/inloggen')
  })
})
