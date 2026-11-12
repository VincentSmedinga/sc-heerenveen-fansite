import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { submitPerson } from '#src/app/beheer/personen/actions'
import { createAccount } from '#src/beheer/accounts'
import { letterFromSlug, letterTablePath, readPersonGaps } from '#src/beheer/person-table'

import LetterPage, { metadata as letterMetadata } from './[letter]/page'
import PersonQualityPage, { metadata } from './page'

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
const ids: Record<string, number> = {}

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

/** Made-up persons: two under B with gaps, one under B without, and one with one name. */
const made = [
  {
    key: 'berg',
    person: {
      country: 'NL',
      familyName: 'Berg',
      familyNamePrefix: 'van den',
      givenName: 'Pieter',
      name: 'Pieter van den Berg',
    },
    seasons: ['2004/05', '2005/06', '2006/07'],
  },
  {
    key: 'bos',
    person: {
      birthDate: '1980-01-01',
      birthDatePrecision: 'year' as const,
      country: 'NL',
      familyName: 'Bos',
      givenName: 'Tom',
      line: 'doelman' as const,
      name: 'Tom Bos',
      wikipediaPage: 'Tom Bos (voetballer)',
    },
    seasons: ['2001/02'],
  },
  {
    key: 'bakker',
    person: { familyName: 'Bakker', givenName: 'Jan', line: 'aanvaller' as const, name: 'Jan Bakker' },
    seasons: ['1991/92', '1992/93'],
  },
  { key: 'dinho', person: { familyName: 'Dinho', name: 'Dinho' }, seasons: ['1999/00'] },
]

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')

  const userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })

  for (const { key, person, seasons } of made) {
    const [{ insertId }] = await database.db.insert(persons).values(person)

    ids[key] = insertId
    await database.db
      .insert(players)
      .values(
        seasons.map((season) => ({ name: person.name, personId: insertId, searchTerm: person.familyName, season })),
      )
  }

  // A person who never stood in our squad does not count.
  await database.db.insert(persons).values({ familyName: 'Buiten', name: 'Karel Buiten' })
})

const overview = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await PersonQualityPage({ searchParams: Promise.resolve(searchParams) })).replaceAll(
    '<!-- -->',
    '',
  )
const letterPage = async (letter: string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await LetterPage({ params: Promise.resolve({ letter }), searchParams: Promise.resolve(searchParams) }),
  ).replaceAll('<!-- -->', '')

/** The row of a letter or a person in a table, from its row header to the end of the row. */
const rowOf = (html: string, header: string) =>
  new RegExp(`<tr><th scope="row">(?:<a [^>]*>)?${header}.*?</tr>`, 'u').exec(html)?.[0] ?? ''

/** The signs of a row, in the order of the columns, with an empty string for an empty cell. */
const signsOf = (row: string) =>
  [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gu)].map(
    ([, cell]) => /class="hf-data-table-mark">([^<]*?) ?</u.exec(cell ?? '')?.[1] ?? '',
  )

describe('the gaps of the persons', () => {
  it('puts a person under the letter of his family name without the prefix, and leaves out who never played', async () => {
    const rows = await readPersonGaps(database.db, new Date('2026-11-12T12:00:00Z'))

    expect(rows.map(({ letter, name, years }) => [letter, name, years])).toEqual([
      ['B', 'Bakker, Jan', '1991–1993'],
      ['B', 'Berg, Pieter van den', '2004–2007'],
      ['B', 'Bos, Tom', '2001/02'],
      ['D', 'Dinho', '1999/00'],
    ])
    expect(rows.map((row) => Object.keys(row.gaps))).toEqual([
      ['wikipedia', 'geboren', 'land'],
      ['wikipedia', 'geboren', 'linie'],
      [],
      ['naam', 'wikipedia', 'geboren', 'land', 'linie'],
    ])
  })

  it('reads a letter from an address and makes the address of a letter', () => {
    expect(letterFromSlug('b')).toBe('B')
    expect(letterFromSlug('overig')).toBe('#')
    expect(letterFromSlug('B')).toBeUndefined()
    expect(letterFromSlug('bb')).toBeUndefined()
    expect(letterTablePath('B', 'land')).toBe('/beheer/kwaliteit/personen/b?kolom=land')
    expect(letterTablePath('#')).toBe('/beheer/kwaliteit/personen/overig')
  })
})

describe('the overview of the persons (#1165)', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    await overview()

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(letterMetadata.robots).toEqual({ follow: false, index: false })
  })

  it('has the switch with the persons as the current choice, and the links to the quick list and the names', async () => {
    const html = await overview()

    expect(html).toContain('<a aria-current="page" href="/beheer/kwaliteit/personen">')
    expect(html).toContain('<a href="/beheer/kwaliteit/personen/snel">Linie en land snel aanvullen</a>')
    expect(html).toContain('<a href="/beheer/kwaliteit/namen">Namen die op elkaar lijken en de lijst van Wikipedia</a>')
    expect(html).toContain('N Naam, P Wikipedia, B Geboren, L Land, I Linie. ?: ontbreekt. Leeg: compleet.')
  })

  it('counts the persons of a letter with a gap in each column, each a link to the letter with that column', async () => {
    const html = await overview()
    const row = rowOf(html, 'B')

    expect(row).toContain('<span class="hf-data-table-secondary">3 personen</span>')
    expect(signsOf(row)).toEqual(['', '2', '2', '1', '1'])
    expect(row).toContain(
      '<a href="/beheer/kwaliteit/personen/b?kolom=wikipedia" class="hf-data-table-mark">2 <span class="hf-visually-hidden">personen met een gat in Wikipedia bij de letter B</span></a>',
    )
    expect(html).toContain('Nog 11 gaten bij 3 personen van de 4.')
  })

  it('says a letter without gaps is complete', async () => {
    await database.pool.query(
      "UPDATE persons SET given_name = 'Dino', wikipedia_page = 'Dinho', birth_date = '1980-01-01', country = 'BR', line = 'aanvaller' WHERE family_name = 'Dinho'",
    )

    const row = rowOf(await overview(), 'D')

    expect(row).toContain('1 persoon, alles compleet')
    expect(signsOf(row)).toEqual(['', '', '', '', ''])
  })

  it('sends an old address of the quick list there', async () => {
    await expect(overview({ deel: '2', lijst: 'land' })).rejects.toThrow(
      'redirect to /beheer/kwaliteit/personen/snel?lijst=land&deel=2',
    )
  })
})

describe('the table of a letter (#1165)', () => {
  it('has a row for each person with a gap, on family name, with a sign that leads to the part of the person', async () => {
    const html = await letterPage('b')
    const row = rowOf(html, 'Berg, Pieter van den')

    expect([...html.matchAll(/<tr><th scope="row">/gu)]).toHaveLength(2)
    expect(html.indexOf('Bakker, Jan')).toBeLessThan(html.indexOf('Berg, Pieter van den'))
    expect(html).not.toContain('Bos, Tom')
    expect(row).toContain('<span class="hf-data-table-secondary">2004–2007</span>')
    expect(signsOf(row)).toEqual(['', '?', '?', '', '?'])
    expect(row).toContain(
      `href="/beheer/personen/${ids['berg']}/naam?terug=%2Fbeheer%2Fkwaliteit%2Fpersonen%2Fb&amp;kolom=wikipedia" class="hf-data-table-mark">? <span class="hf-visually-hidden">Wikipedia-pagina ontbreekt bij Berg, Pieter van den</span>`,
    )
    expect(row).toContain(`href="/beheer/personen/${ids['berg']}/leven?`)
    expect(row).toContain(`href="/beheer/personen/${ids['berg']}/linie?`)
  })

  it('has every letter, the current one bold with aria-current, and a letter without persons as text', async () => {
    const html = await letterPage('b')

    expect(html).toMatch(
      /<a [^>]*aria-current="page"[^>]*href="\/beheer\/kwaliteit\/personen\/b"[^>]*><strong[^>]*>B<\/strong><\/a>/u,
    )
    expect(html).toContain('<a href="/beheer/kwaliteit/personen/d">D</a>')
    expect(html).toMatch(/<\/a> C <a /u)
  })

  it('keeps only the persons with a gap in one column, and links to all columns', async () => {
    const html = await letterPage('b', { kolom: 'land' })

    expect([...html.matchAll(/<tr><th scope="row">/gu)]).toHaveLength(1)
    expect(html).toContain('Bakker, Jan')
    expect(html).toContain('<a href="/beheer/kwaliteit/personen/b">Alle kolommen</a>')
    expect(html).toContain('1 persoon van de 3 heeft een gat in de kolom Land.')
  })

  it('says when a letter or a column is complete', async () => {
    expect(await letterPage('a')).toContain('Alles compleet.')
    expect(await letterPage('b', { gedaan: 'kolom-compleet', kolom: 'naam' })).toContain(
      'Er is geen andere persoon bij B met een gat in deze kolom.',
    )
  })

  it.each(['bb', 'B', '1', 'snel'])('is not found for %s', async (letter) => {
    await expect(letterPage(letter)).rejects.toThrow('not found')
  })
})

describe('Opslaan en volgende on a part of a person (#1165)', () => {
  const form = (values: Record<string, string>) => {
    const data = new FormData()

    for (const [name, value] of Object.entries(values)) {
      data.set(name, value)
    }

    return data
  }
  const empty = { errors: {}, values: {} } as never
  const back = '/beheer/kwaliteit/personen/b?kolom=wikipedia'

  it('goes on to the next person of the letter with a gap in the column', async () => {
    await expect(
      submitPerson(
        ids['bakker'] ?? 0,
        'naam',
        back,
        'wikipedia',
        empty,
        form({ achternaam: 'Bakker', knop: 'volgende', reden: 'Clubblad', voornaam: 'Jan', wikipedia: 'Jan Bakker' }),
      ),
    ).rejects.toThrow(
      `redirect to /beheer/personen/${ids['berg']}/naam?gedaan=volgende-opgeslagen&terug=%2Fbeheer%2Fkwaliteit%2Fpersonen%2Fb%3Fkolom%3Dwikipedia&kolom=wikipedia`,
    )
  })

  it('goes back to the letter when no other person has a gap in the column', async () => {
    await expect(
      submitPerson(
        ids['bakker'] ?? 0,
        'land',
        back,
        'land',
        empty,
        form({ knop: 'volgende', land: 'NL', reden: 'Clubblad' }),
      ),
    ).rejects.toThrow('redirect to /beheer/kwaliteit/personen/b?gedaan=kolom-compleet')
  })

  it('saves and stays without the button, or with a column of another part', async () => {
    await expect(
      submitPerson(
        ids['bakker'] ?? 0,
        'land',
        back,
        'land',
        empty,
        form({ knop: 'opslaan', land: 'NL', reden: 'Clubblad' }),
      ),
    ).rejects.toThrow(`redirect to /beheer/personen/${ids['bakker']}/land?gedaan=opgeslagen`)
    await expect(
      submitPerson(
        ids['bakker'] ?? 0,
        'land',
        back,
        'linie',
        empty,
        form({ knop: 'volgende', land: 'BE', reden: 'Clubblad' }),
      ),
    ).rejects.toThrow(`redirect to /beheer/personen/${ids['bakker']}/land?gedaan=opgeslagen`)
  })
})
