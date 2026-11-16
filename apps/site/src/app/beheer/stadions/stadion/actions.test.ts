import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, stadiumNames, stadiums } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { groundFieldNames, type GroundFormState } from '#src/beheer/ground-fields'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitGround, submitGroundReset } from './actions'

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

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('UPDATE matches SET stadium_id = NULL')
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  await createAccount(database.db, 'jelle@example.org', 'author', '')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  authorId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const empty: GroundFormState = { errors: {}, values: { ...blank(), rows: [] } }

function blank() {
  return Object.fromEntries(groundFieldNames.map((name) => [name, ''])) as Record<
    (typeof groundFieldNames)[number],
    string
  >
}

/** A form as the browser sends it: the fields, the first name, and the button. */
function form(fields: Record<string, string> = {}, knop = 'opslaan') {
  const formData = new FormData()

  formData.set('regel-1-naam', 'Oefenpark')
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }
  formData.set('knop', knop)

  return formData
}

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

const submit = (formData: FormData, id: string = 'nieuw') => resultOf(() => submitGround(id, empty, formData))
const log = () => database.db.select().from(auditLog)
const one = async () => (await database.db.select().from(stadiums))[0]

describe('submitGround', () => {
  it('makes a stadium with its name, marks a place from the editors as manual, and logs without any text', async () => {
    const result = await submit(
      form({ breedtegraad: '52,9605', lengtegraad: '5,9396', plaats: 'Oefenstad', straat: 'Weg 1' }),
    )
    const made = await one()

    expect(result).toEqual({ redirect: `/beheer/stadions/stadion/${made?.id}?gedaan=gemaakt` })
    expect(made).toMatchObject({ latitude: '52.960500', place: 'Oefenstad', placeSource: 'manual', street: 'Weg 1' })
    expect((await database.db.select().from(stadiumNames)).map((row) => row.name)).toEqual(['Oefenpark'])
    expect((await log()).map((entry) => entry.action).toSorted()).toEqual(['ground-name.save', 'ground.create'])
  })

  it('says at each field what is wrong, keeps what was filled in and saves nothing', async () => {
    const result = await submit(form({ breedtegraad: '52,9', plaats: 'Oefenstad' }))

    expect(result).toMatchObject({
      errors: { lengtegraad: expect.stringContaining('lengtegraad') as string },
      values: { breedtegraad: '52,9', plaats: 'Oefenstad' },
    })
    expect(await one()).toBeUndefined()
  })

  it('saves an existing stadium and ends on its page, and ends on the list for one that does not exist', async () => {
    await submit(form())

    const { id } = (await one())!

    expect(await submit(form({ postcode: '1234 AB' }), String(id))).toEqual({
      redirect: `/beheer/stadions/stadion/${id}?gedaan=opgeslagen`,
    })
    expect((await one())?.postcode).toBe('1234 AB')
    expect(await submit(form(), '999999')).toEqual({ redirect: '/beheer/stadions?fout=weg' })
    expect(await submit(form(), 'onzin')).toEqual({ redirect: '/beheer/stadions?fout=weg' })
  })

  it('adds and removes a line without saving anything', async () => {
    expect(await submit(form({}, 'regel-toevoegen'))).toMatchObject({ focus: 'regel-2-naam' })
    expect(await submit(form({ 'regel-2-naam': 'Twee' }, 'regel-weghalen-1'))).toMatchObject({
      focus: 'regel-1-naam',
      values: { rows: [{ naam: 'Twee' }] },
    })
    expect(await one()).toBeUndefined()
  })

  it('is for the editor, and sends somebody without a session to the login page', async () => {
    jar.set(sessionCookieName, await startSession(database.db, authorId))
    await expect(submit(form())).rejects.toThrow('not found')

    jar.clear()
    expect(await submit(form())).toEqual({ redirect: '/beheer/inloggen' })
    expect(await one()).toBeUndefined()
  })
})

describe('the address button', () => {
  const found = {
    response: {
      docs: [{ huisnummer: 5, postcode: '8448GK', straatnaam: 'Domela Nieuwenhuisweg', woonplaatsnaam: 'Heerenveen' }],
    },
  }

  it('fills in street, house number, postcode and place as a proposal, and saves nothing', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify(found))))

    vi.stubGlobal('fetch', fetcher)

    const result = await submit(form({ breedtegraad: '52,9607', lengtegraad: '5,9406' }, 'adres-invullen'))

    expect(result).toMatchObject({
      focus: 'straat',
      notice: expect.stringContaining('nog niet bewaard') as string,
      values: { plaats: 'Heerenveen', postcode: '8448 GK', straat: 'Domela Nieuwenhuisweg 5' },
    })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(await one()).toBeUndefined()
    expect(await log()).toEqual([])
  })

  it.each([
    ['no coordinates', {}],
    ['coordinates outside the Netherlands', { breedtegraad: '48,85', lengtegraad: '2,35' }],
    ['only one coordinate', { breedtegraad: '52,9' }],
  ])('does not ask PDOK for %s', async (_name, fields) => {
    const fetcher = vi.fn()

    vi.stubGlobal('fetch', fetcher)

    expect(await submit(form(fields, 'adres-invullen'))).toMatchObject({
      notice: expect.stringContaining('alleen bij coördinaten in Nederland') as string,
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('tells the editor when PDOK has no address or no answer, and keeps what was typed', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify({ response: { docs: [] } }))))
    expect(
      await submit(form({ breedtegraad: '52,9', lengtegraad: '5,9', straat: 'Eigen straat' }, 'adres-invullen')),
    ).toMatchObject({
      notice: expect.stringContaining('kent geen adres') as string,
      values: { straat: 'Eigen straat' },
    })

    vi.stubGlobal('fetch', () => Promise.reject(new Error('down')))
    expect(await submit(form({ breedtegraad: '52,9', lengtegraad: '5,9' }, 'adres-invullen'))).toMatchObject({
      notice: expect.stringContaining('geen bruikbaar antwoord') as string,
    })
  })
})

describe('submitGroundReset', () => {
  it('puts the place back to Wikidata and says so on the page of the stadium', async () => {
    await database.db
      .insert(stadiums)
      .values({ latitude: '52.000000', longitude: '5.000000', place: 'Eigen', placeSource: 'manual', wikidataId: 'Q9' })

    const { id } = (await one())!

    expect(await resultOf(() => submitGroundReset(String(id)))).toEqual({
      redirect: `/beheer/stadions/stadion/${id}?gedaan=teruggezet-zonder-import`,
    })
    expect(await one()).toMatchObject({ latitude: null, place: null, placeSource: null })
    expect((await log()).map((entry) => entry.action)).toEqual(['ground.edit'])
  })

  it('ends on the list for a stadium that does not exist, and for a new one', async () => {
    expect(await resultOf(() => submitGroundReset('999999'))).toEqual({ redirect: '/beheer/stadions?fout=weg' })
    expect(await resultOf(() => submitGroundReset('nieuw'))).toEqual({ redirect: '/beheer/stadions?fout=weg' })
  })
})
