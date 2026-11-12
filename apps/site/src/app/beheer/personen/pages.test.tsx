import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'

import PersonPage, { generateMetadata } from './[id]/[[...deel]]/page'
import { submitPerson } from './actions'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
let personId: number
let playerIds: number[]

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')

  const userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })

  const [{ insertId }] = await database.db.insert(persons).values({
    familyName: 'Verzonnen',
    givenName: 'Jan',
    name: 'Jan Verzonnen',
    nameSource: 'sort_key',
  })

  personId = insertId
  await database.db.insert(players).values([
    { name: 'Jan Verzonnen', personId, searchTerm: 'Verzonnen', season: '2005/06' },
    { name: 'Jan Verzonnen', personId, searchTerm: 'Verzonnen', season: '2004/05' },
  ])
  playerIds = (await database.db.select({ id: players.id }).from(players).orderBy(players.season)).map((row) => row.id)
})

const page = async (id: number | string, deel?: string[], searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PersonPage({
      params: Promise.resolve({ id: String(id), ...(deel === undefined ? {} : { deel }) }),
      searchParams: Promise.resolve(searchParams),
    }),
  ).replaceAll('<!-- -->', '')

const headings = (html: string) =>
  [...html.matchAll(/<h([12])[^>]*>(.*?)<\/h\1>/gu)].map(([, level, text]) => `${level} ${text}`)

describe('the page of a person', () => {
  it('tells search engines to stay away, and names the part in the tab', async () => {
    expect(await generateMetadata({ params: Promise.resolve({ deel: ['leven'], id: '1' }) })).toEqual({
      robots: { follow: false, index: false },
      title: 'Persoon bewerken: leven',
    })
  })

  it('is for the editor and not for the author', async () => {
    requireRole.mockRejectedValue(new Error('not found'))

    await expect(page(personId)).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
  })

  it('has one h1 with the name, the seasons as links, the parts and every card', async () => {
    const html = await page(personId)

    expect(headings(html)).toEqual(['1 Jan Verzonnen', '2 Naam', '2 Leven', '2 Land', '2 Linie', '2 Opslaan'])
    expect(html).toContain(`In onze selectie: <a href="/beheer/spelers/${playerIds[0]}"`)
    expect(html).toMatch(new RegExp(`href="/beheer/spelers/${playerIds[1]}"[^>]*>2005/06</a>`, 'u'))
    expect(html).toMatch(/<nav[^>]*aria-label="Delen van de persoon"/u)
    expect(html).toMatch(new RegExp(`<a[^>]*aria-current="page"[^>]*href="/beheer/personen/${personId}"`, 'u'))
    expect(html).not.toContain('Hele persoon bewerken')
  })

  it('shows one part with the card Opslaan and the way to the whole person', async () => {
    const html = await page(personId, ['leven'], { terug: `/beheer/spelers/${playerIds[0]}` })

    expect(headings(html)).toEqual(['1 Jan Verzonnen', '2 Leven', '2 Opslaan'])
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Leven<\/a>/u)
    expect(html).toContain(
      `href="/beheer/personen/${personId}?terug=%2Fbeheer%2Fspelers%2F${playerIds[0]}">Hele persoon bewerken`,
    )
    expect(html).toContain('id="geboren"')
    expect(html).not.toContain('id="achternaam"')
  })

  it.each([
    ['an unknown part', () => page(personId, ['geboorte'])],
    ['a name of an object', () => page(personId, ['constructor'])],
    ['two parts', () => page(personId, ['naam', 'leven'])],
    ['an unknown person', () => page(999_999)],
    ['no number', () => page('abc')],
  ])('is not found for %s', async (_name, render) => {
    await expect(render()).rejects.toThrow('not found')
  })

  it('has Opslaan en volgende only for a column of the table that leads to this part', async () => {
    const from = { kolom: 'wikipedia', terug: '/beheer/kwaliteit/personen/v?kolom=wikipedia' }

    expect(await page(personId, ['naam'], from)).toContain('value="volgende"')
    expect(await page(personId, ['naam'], { ...from, gedaan: 'volgende-opgeslagen' })).toContain(
      'De vorige persoon is opgeslagen. Dit is de volgende persoon met een gat in deze kolom.',
    )
    expect(await page(personId, ['leven'], from)).not.toContain('value="volgende"')
    expect(await page(personId, undefined, from)).not.toContain('value="volgende"')
    expect(await page(personId, ['naam'], { kolom: 'onbekend' })).not.toContain('value="volgende"')
  })

  it('says what the last save did', async () => {
    expect(await page(personId, undefined, { gedaan: 'opgeslagen' })).toContain('Opgeslagen.')
  })
})

describe('submitPerson', () => {
  const form = (values: Record<string, string>) => {
    const data = new FormData()

    for (const [name, value] of Object.entries(values)) {
      data.set(name, value)
    }

    return data
  }
  const empty = { errors: {}, values: {} } as never

  it('saves a part and ends on that part, with the way back kept', async () => {
    await expect(
      submitPerson(personId, 'land', '/beheer/spelers', undefined, empty, form({ land: 'BE', reden: 'Clubblad' })),
    ).rejects.toThrow(`redirect to /beheer/personen/${personId}/land?gedaan=opgeslagen&terug=%2Fbeheer%2Fspelers`)
    expect((await database.db.select().from(persons).where(eq(persons.id, personId)))[0]?.country).toBe('BE')
  })

  it('comes back with the errors and the values', async () => {
    const state = await submitPerson(
      personId,
      'land',
      undefined,
      undefined,
      empty,
      form({ land: 'XX', reden: 'x'.repeat(301) }),
    )

    expect(state.errors).toEqual({
      land: 'Kies een land uit de lijst, of kies Onbekend.',
      reden: 'Schrijf hoogstens 300 tekens.',
    })
    expect(state.values.land).toBe('XX')
  })

  it('drops a way back that leaves the admin', async () => {
    await expect(
      submitPerson(
        personId,
        undefined,
        'https://example.org',
        undefined,
        empty,
        form({ ...whole(), reden: 'Clubblad' }),
      ),
    ).rejects.toThrow(`redirect to /beheer/personen/${personId}?gedaan=ongewijzigd`)
  })

  it('sends a person who is gone, or an unknown part, to the list of the players', async () => {
    await expect(submitPerson(999_999, undefined, undefined, undefined, empty, form({}))).rejects.toThrow(
      'redirect to /beheer/spelers?fout=persoon-weg',
    )
    await expect(submitPerson(personId, 'constructor', undefined, undefined, empty, form({}))).rejects.toThrow(
      'redirect to /beheer/spelers?fout=persoon-weg',
    )
  })
})

/** The fields of the whole form as the person has them. */
function whole() {
  return { achternaam: 'Verzonnen', voornaam: 'Jan' }
}
