import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { readPersonMarks } from '@fansite/db/unavailable-marks'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { submitPerson } from '#src/app/beheer/personen/actions'
import { PersonForm } from '#src/app/beheer/personen/PersonForm'
import { createAccount } from '#src/beheer/accounts'
import { personValuesOf } from '#src/beheer/person-form'
import { countPersonGapsByLetter, readPersonGaps } from '#src/beheer/person-table'

import { submitRemoveMark, submitRenewMark } from './marks-actions'
import PersonQualityPage from './page'

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
let personId = 0
let userId = 0

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM unavailable_marks')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })
  ;[{ insertId: personId }] = await database.db
    .insert(persons)
    .values({ country: 'NL', familyName: 'Bos', givenName: 'Tom', line: 'doelman', name: 'Tom Bos' })
  await database.db.insert(players).values({ name: 'Tom Bos', personId, searchTerm: 'Bos', season: '2001/02' })
})

const empty = { errors: {}, values: {} } as never

const form = (values: Record<string, string>) => {
  const data = new FormData()

  for (const [name, value] of Object.entries({ achternaam: 'Bos', voornaam: 'Tom', ...values })) {
    data.set(name, value)
  }

  return data
}

const save = (part: 'leven' | 'naam', values: Record<string, string>) =>
  submitPerson(personId, part, undefined, undefined, empty, form(values)).catch((error: unknown) => error)

const actions = async () => (await database.db.select().from(auditLog)).map((row) => row.action)
const now = new Date('2026-11-16T12:00:00Z')
const gaps = async () => (await readPersonGaps(database.db, now))[0]?.gaps

describe('the box Niet beschikbaar of the form', () => {
  it('marks the Wikipedia page and the birth date, each with a row in the log', async () => {
    expect(await gaps()).toEqual({ geboren: true, wikipedia: true })

    await save('naam', { 'wikipedia-niet-beschikbaar': '1' })
    await save('leven', { 'geboren-niet-beschikbaar': '1' })

    expect(Object.keys(await readPersonMarks(database.db, personId)).toSorted()).toEqual(['geboren', 'wikipedia'])
    expect(await gaps()).toEqual({})
    expect(await actions()).toEqual(['gap.mark', 'gap.mark'])
  })

  it('leaves the sign and the count of the table out for a marked gap, and keeps the other gap', async () => {
    await save('naam', { 'wikipedia-niet-beschikbaar': '1' })

    const counts = countPersonGapsByLetter(await readPersonGaps(database.db, now))

    expect(counts.get('B')?.columns).toMatchObject({ geboren: 1, wikipedia: 0 })
  })

  it('takes the mark away when the box is unchecked, and leaves a part that is not on the page alone', async () => {
    await save('naam', { 'wikipedia-niet-beschikbaar': '1' })
    await save('leven', {})

    expect(Object.keys(await readPersonMarks(database.db, personId))).toEqual(['wikipedia'])

    await save('naam', {})

    expect(await readPersonMarks(database.db, personId)).toEqual({})
    expect(await gaps()).toEqual({ geboren: true, wikipedia: true })
    expect(await actions()).toEqual(['gap.mark', 'gap.unmark'])
  })

  it('saves nothing and logs nothing when the box stays as it was', async () => {
    await save('naam', { 'wikipedia-niet-beschikbaar': '1' })

    const error = await save('naam', { 'wikipedia-niet-beschikbaar': '1' })

    expect(String(error)).toContain('gedaan=ongewijzigd')
    expect(await actions()).toEqual(['gap.mark'])
  })

  it('ignores the box when the editor fills in the field in the same save, and removes the mark', async () => {
    await save('leven', { 'geboren-niet-beschikbaar': '1' })

    const error = await save('leven', { geboren: '1980' })

    expect(String(error)).toContain('gedaan=opgeslagen')
    expect(await readPersonMarks(database.db, personId)).toEqual({})
    expect(await actions()).toEqual(['gap.mark', 'gap.unmark', 'person.edit'])
  })

  it('takes a mark away when the editor fills in a Wikipedia page by hand', async () => {
    await save('naam', { 'wikipedia-niet-beschikbaar': '1' })
    await save('naam', { wikipedia: 'Tom Bos (voetballer)', 'wikipedia-niet-beschikbaar': '1' })

    expect(await readPersonMarks(database.db, personId)).toEqual({})
  })

  it('ignores a mark on a field that has a value', async () => {
    await save('naam', { 'wikipedia-niet-beschikbaar': '1' })
    await database.db.update(persons).set({ birthDate: '1980-01-01', birthDatePrecision: 'year' })
    await database.pool.query(
      "INSERT INTO unavailable_marks (subject, subject_id, field, checked_on) VALUES ('person', ?, 'geboren', '2026-11-01')",
      [personId],
    )

    expect(await gaps()).toEqual({})
  })
})

describe('the card Niet beschikbaar', () => {
  const page = async (searchParams: Record<string, string> = {}) =>
    renderToStaticMarkup(await PersonQualityPage({ searchParams: Promise.resolve(searchParams) })).replaceAll(
      '<!-- -->',
      '',
    )

  it('is not there without marks', async () => {
    expect(await page()).not.toContain('Niet beschikbaar')
  })

  it('lists each mark with the person, the field and the day, and buttons that name the person', async () => {
    await database.pool.query(
      "INSERT INTO unavailable_marks (subject, subject_id, field, checked_on) VALUES ('person', ?, 'wikipedia', '2026-03-02')",
      [personId],
    )

    const html = await page()

    expect(html).toContain('Niet beschikbaar')
    expect(html).toContain(`href="/beheer/personen/${personId}/naam"`)
    expect(html).toContain('Wikipedia-pagina, laatst gecontroleerd op 2 maart 2026')
    expect(html).toContain('aria-label="Nog steeds niet beschikbaar: Wikipedia-pagina van Tom Bos"')
    expect(html).toContain('aria-label="Markering weghalen: Wikipedia-pagina van Tom Bos"')
    expect(html).toMatch(/aria-labelledby="niet-beschikbaar-kop"/u)
  })

  it('says what a button did', async () => {
    expect(await page({ gedaan: 'vernieuwd' })).toContain('Nog steeds niet beschikbaar.')
  })
})

describe('the buttons of the card', () => {
  it('set the day to today and take the mark away, each with the editor in the log', async () => {
    await save('naam', { 'wikipedia-niet-beschikbaar': '1' })
    await database.pool.query("UPDATE unavailable_marks SET checked_on = '2026-01-01'")

    await expect(submitRenewMark(personId, 'wikipedia')).rejects.toThrow('gedaan=vernieuwd')
    expect((await readPersonMarks(database.db, personId)).wikipedia).toBe(new Date().toISOString().slice(0, 10))
    await expect(submitRemoveMark(personId, 'wikipedia')).rejects.toThrow('gedaan=weggehaald')
    expect(await readPersonMarks(database.db, personId)).toEqual({})
    expect(await actions()).toEqual(['gap.mark', 'gap.renew', 'gap.unmark'])
    expect((await database.db.select().from(auditLog)).map((row) => row.userId)).toEqual([userId, userId, userId])
  })

  it('refuse an author, a field that cannot be marked and a mark that is not there', async () => {
    requireRole.mockImplementation(() => {
      throw new Error('not found')
    })
    await expect(submitRenewMark(personId, 'wikipedia')).rejects.toThrow('not found')
    await expect(submitRemoveMark(personId, 'wikipedia')).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')

    requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })
    await expect(submitRenewMark(personId, 'land')).rejects.toThrow('gedaan=markering-weg')
    await expect(submitRemoveMark(personId, 'geboren')).rejects.toThrow('gedaan=markering-weg')
    expect(await actions()).toEqual([])
  })
})

describe('the form of a person', () => {
  const render = (values: Parameters<typeof personValuesOf>[0]) =>
    renderToStaticMarkup(
      <PersonForm
        action={async () => ({ errors: {}, values: personValuesOf(values) })}
        cancelHref="/beheer"
        countries={[]}
        initial={personValuesOf(values)}
      />,
    ).replaceAll('<!-- -->', '')

  it('has a box for each empty field, with a visible label and a name that says which field', async () => {
    const [person] = await database.db.select().from(persons)

    expect(person).toBeDefined()

    const html = render({ marks: {}, person: person! })

    expect(html).toContain('<legend class="hf-heading-2">Wikipedia-pagina: niet te vinden?</legend>')
    expect(html).toContain('<legend class="hf-heading-2">Geboortedatum: niet te vinden?</legend>')
    expect(html.match(/<span>Niet beschikbaar<\/span>/gu)).toHaveLength(2)
    expect(html).toContain('name="wikipedia-niet-beschikbaar"')
  })

  it('shows the box checked for a mark, and no box for a field that has a value', async () => {
    const [person] = await database.db.select().from(persons)
    const html = render({
      marks: { wikipedia: '2026-11-16' },
      person: { ...person!, birthDate: '1980-01-01', birthDatePrecision: 'year' },
    })

    expect(html).toMatch(/name="wikipedia-niet-beschikbaar"[^>]*checked|checked[^>]*name="wikipedia-niet-beschikbaar"/u)
    expect(html).not.toContain('name="geboren-niet-beschikbaar"')
  })
})
