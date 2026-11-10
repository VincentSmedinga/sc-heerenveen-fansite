import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, auditLog, matches, matchGoals, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { emptyPlayerValues, type PlayerFormState, type PlayerValues } from '#src/beheer/player-fields'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitAddPlayer, submitPlayer, submitRemovePlayer } from './actions'

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

const season = '2019/20'

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  moderatorId =
    (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))
  await database.db.insert(matches).values(
    await withClubs(database.db, [
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: true,
        kickoffAt: new Date('2019-09-01T12:30:00Z'),
        matchDate: '2019-09-01',
        opponent: 'Oefenstad AZ',
        round: 'Speelronde 5',
        season,
        status: 'played',
      },
    ]),
  )
  matchId = (await database.db.select().from(matches))[0]?.id ?? 0
})

/** A form as the browser sends it. */
function form(values: Partial<PlayerValues> = {}, extra: Record<string, string> = {}) {
  const formData = new FormData()

  for (const [name, value] of Object.entries({
    ...emptyPlayerValues,
    achternaam: 'Amersfoort',
    positie: 'middenvelder',
    rugnummer: '14',
    tussenvoegsel: 'van',
    voornaam: 'Pelle',
    ...values,
    ...extra,
  })) {
    formData.set(name, value)
  }

  return formData
}

/** What an action did: the state it returned, or where it sent the editor. */
async function resultOf(run: () => Promise<unknown>) {
  try {
    return await run()
  } catch (error) {
    if (error instanceof Redirect) {
      return { redirect: error.url }
    }

    throw error
  }
}

const initial: PlayerFormState = { errors: {}, values: emptyPlayerValues }
const add = (formData: FormData, ofSeason: unknown = season, from?: unknown) =>
  resultOf(() => submitAddPlayer(ofSeason as string, from as number | undefined, initial, formData))
const edit = (id: unknown, formData: FormData) => resultOf(() => submitPlayer(id as number, initial, formData))
const remove = (id: unknown) => resultOf(() => submitRemovePlayer(id as number))
const stored = () => database.db.select().from(players).orderBy(asc(players.id))
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))
const firstId = async () => (await stored())[0]?.id ?? 0

describe('submitAddPlayer', () => {
  it('adds the player with a new person, writes the log, and ends on the list of the season', async () => {
    expect(await add(form())).toEqual({ redirect: '/beheer/spelers?seizoen=2019-20&gedaan=toegevoegd' })

    expect(await stored()).toMatchObject([
      { name: 'Pelle van Amersfoort', position: 'middenvelder', season, shirtNumber: 14, source: 'redactie' },
    ])
    expect(await database.db.select().from(persons)).toMatchObject([{ nameSource: 'redactie', wikipediaPage: null }])
    expect(await log()).toMatchObject([{ action: 'player.add', itemId: await firstId(), userId }])
  })

  it('ends on the form of the match the editor came from, with a notice', async () => {
    expect(await add(form(), season, matchId)).toEqual({
      redirect: `/beheer/wedstrijden/${matchId}?gedaan=speler-toegevoegd`,
    })
    expect(await stored()).toMatchObject([{ name: 'Pelle van Amersfoort', season }])
  })

  it('ends on the list for a match of another season, a match that is gone and something that is no number', async () => {
    const [{ insertId: other }] = await database.db.insert(matches).values(
      await withClubs(database.db, [
        {
          competition: 'Eredivisie',
          goalsAgainst: 0,
          goalsFor: 1,
          home: true,
          kickoffAt: new Date('2018-09-01T12:30:00Z'),
          matchDate: '2018-09-01',
          opponent: 'Oefenstad AZ',
          round: 'Speelronde 4',
          season: '2018/19',
          status: 'played',
        },
      ]),
    )
    const onList = { redirect: '/beheer/spelers?seizoen=2019-20&gedaan=toegevoegd' }

    expect(await add(form(), season, other)).toEqual(onList)
    expect(await add(form({ achternaam: 'Twee' }), season, 999_999)).toEqual(onList)
    expect(await add(form({ achternaam: 'Drie' }), season, '//example.org')).toEqual(onList)
  })

  it('adds the player with a person from the list', async () => {
    const [{ insertId }] = await database.db
      .insert(persons)
      .values({ familyName: 'Oyen', givenName: 'Luca', name: 'Luca Oyen', wikipediaPage: 'Luca Oyen' })

    expect(
      await add(form({ achternaam: '', persoon: String(insertId), tussenvoegsel: '', voornaam: '' })),
    ).toMatchObject({ redirect: expect.stringContaining('gedaan=toegevoegd') })
    expect(await stored()).toMatchObject([{ name: 'Luca Oyen', personId: insertId, wikipediaPage: 'Luca Oyen' }])
    expect(await database.db.select().from(persons)).toHaveLength(1)
  })

  it('takes the account from the session and never from the form', async () => {
    await add(form({}, { userId: String(moderatorId) }))

    expect(await log()).toMatchObject([{ userId }])
  })

  it('returns the form with the errors at their fields and the values, and stores nothing', async () => {
    expect(await add(form({ achternaam: '', rugnummer: '100' }))).toEqual({
      errors: {
        achternaam: 'Vul de achternaam in. Heeft de speler één naam, zoals Dinho? Vul die dan hier in.',
        rugnummer: 'Vul een getal van 1 tot en met 99 in, of laat het veld leeg.',
      },
      values: {
        ...emptyPlayerValues,
        positie: 'middenvelder',
        rugnummer: '100',
        tussenvoegsel: 'van',
        voornaam: 'Pelle',
      },
    })
    expect(await stored()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('refuses the same name and the same Wikipedia page in the season, each with its sentence', async () => {
    await add(form({ wikipedia: 'Pelle van Amersfoort' }))

    expect(await add(form())).toMatchObject({
      errors: { achternaam: expect.stringContaining('heeft al een speler met de naam Pelle van Amersfoort') },
    })
    expect(await add(form({ voornaam: 'P.', wikipedia: 'Pelle van Amersfoort' }))).toMatchObject({
      errors: { wikipedia: expect.stringContaining('Deze persoon staat al in het seizoen 2019/20') },
    })
    expect(await stored()).toHaveLength(1)
    expect(await database.db.select().from(persons)).toHaveLength(1)
  })

  it('ends on the list with a notice for a season we do not have, and stores nothing', async () => {
    expect(await add(form(), '1901/02')).toEqual({ redirect: '/beheer/spelers?fout=seizoen' })
    expect(await add(form(), 42)).toEqual({ redirect: '/beheer/spelers?fout=seizoen' })
    expect(await stored()).toEqual([])
  })

  it('is for the beheerder: a moderator is told the page does not exist, and nothing is stored', async () => {
    jar.set(sessionCookieName, await startSession(database.db, moderatorId))

    await expect(add(form())).rejects.toThrow('not found')
    expect(await stored()).toEqual([])
  })

  it('sends somebody without a session to the login page, and stores nothing', async () => {
    jar.clear()

    expect(await add(form())).toEqual({ redirect: '/beheer/inloggen' })
    expect(await stored()).toEqual([])
  })
})

describe('submitPlayer', () => {
  beforeEach(async () => {
    await add(form())
    await database.pool.query('DELETE FROM audit_log')
  })

  it('changes the player, writes the log, and ends on his form with a notice', async () => {
    const id = await firstId()

    expect(await edit(id, form({ positie: 'aanvaller', rugnummer: '9' }))).toEqual({
      redirect: `/beheer/spelers/${id}?gedaan=opgeslagen`,
    })
    expect(await stored()).toMatchObject([{ position: 'aanvaller', shirtNumber: 9 }])
    expect(await log()).toMatchObject([{ action: 'player.edit', itemId: id, userId }])
  })

  it('says so when nothing changed, and writes nothing', async () => {
    const id = await firstId()

    expect(await edit(id, form())).toEqual({ redirect: `/beheer/spelers/${id}?gedaan=ongewijzigd` })
    expect(await log()).toEqual([])
  })

  it('returns the form with the error at its field, and keeps the player', async () => {
    expect(await edit(await firstId(), form({ rugnummer: 'tien' }))).toMatchObject({
      errors: { rugnummer: expect.any(String) },
      values: { rugnummer: 'tien' },
    })
    expect(await stored()).toMatchObject([{ shirtNumber: 14 }])
  })

  it('ends on the list with a notice for a player that does not exist', async () => {
    expect(await edit((await firstId()) + 100, form())).toEqual({ redirect: '/beheer/spelers?fout=weg' })
    expect(await edit('abc', form())).toEqual({ redirect: '/beheer/spelers?fout=weg' })
  })

  it('is for the beheerder, and sends somebody without a session to the login page', async () => {
    const id = await firstId()

    jar.set(sessionCookieName, await startSession(database.db, moderatorId))
    await expect(edit(id, form({ rugnummer: '9' }))).rejects.toThrow('not found')

    jar.clear()
    expect(await edit(id, form({ rugnummer: '9' }))).toEqual({ redirect: '/beheer/inloggen' })
    expect(await stored()).toMatchObject([{ shirtNumber: 14 }])
  })
})

describe('submitRemovePlayer', () => {
  beforeEach(async () => {
    await add(form())
    await database.pool.query('DELETE FROM audit_log')
  })

  it('takes the player out of the squad, writes the log, and ends on the list of his season', async () => {
    const id = await firstId()

    expect(await remove(id)).toEqual({ redirect: '/beheer/spelers?seizoen=2019-20&gedaan=weggehaald' })
    expect(await stored()).toMatchObject([{ inSquad: false, leftSquadAt: expect.any(Date) }])
    expect(await log()).toMatchObject([{ action: 'player.remove', itemId: id, userId }])
    expect(await remove(id)).toEqual({ redirect: `/beheer/spelers/${id}?gedaan=was-al-weg` })
  })

  it('keeps a player with a goal, and ends on his form, which says why', async () => {
    const id = await firstId()

    await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 12, ours: true, player: 'Van Amersfoort', playerId: id })

    expect(await remove(id)).toEqual({ redirect: `/beheer/spelers/${id}?gedaan=blijft` })
    expect(await stored()).toMatchObject([{ inSquad: true }])
    expect(await log()).toEqual([])
  })

  it('ends on the list with a notice for a player that does not exist', async () => {
    expect(await remove((await firstId()) + 100)).toEqual({ redirect: '/beheer/spelers?fout=weg' })
    expect(await remove('abc')).toEqual({ redirect: '/beheer/spelers?fout=weg' })
  })

  it('is for the beheerder, and sends somebody without a session to the login page', async () => {
    const id = await firstId()

    jar.set(sessionCookieName, await startSession(database.db, moderatorId))
    await expect(remove(id)).rejects.toThrow('not found')

    jar.clear()
    expect(await remove(id)).toEqual({ redirect: '/beheer/inloggen' })
    expect(await stored()).toMatchObject([{ inSquad: true }])
  })
})
