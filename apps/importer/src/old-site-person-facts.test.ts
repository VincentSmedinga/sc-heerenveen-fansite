import type { TestDatabase } from '@fansite/db/test-database'

import { persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { isCountryCode } from '@fansite/shared/countries'
import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteLineupEntry, OldSiteMatch, OldSitePlayer } from './old-site-file.ts'

import { readOldSiteData } from './old-site-file.ts'
import { importOldSitePersonFacts, oldSiteCountryCodes } from './old-site-person-facts.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(players)
  await database.db.delete(persons)
})

const starter = (code: string, order: number): OldSiteLineupEntry => ({
  minuteIn: 0,
  minuteOut: 90,
  order,
  playerCode: code,
  playerName: null,
})

/** A league match at home in 2001/02 with these players of ours in the line-up. */
const oldMatch = (codes: string[], season = '0102', dateTime = '2001-09-01 20:00:00'): OldSiteMatch => ({
  attendance: null,
  code: 'nec.thuis',
  competition: 1,
  dateTime,
  events: [],
  lineup: codes.map((code, index) => starter(code, index + 1)),
  note: null,
  referee: null,
  result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 1, note: null },
  round: 1,
  season,
  statistics: { awayCorners: 0, awayFouls: 0, awayOffside: 0, homeCorners: 0, homeFouls: 0, homeOffside: 0 },
})

const old = (
  code: string,
  firstName: string,
  lastName: string,
  line: OldSitePlayer['line'],
  country: null | string,
): OldSitePlayer => ({ code, country, firstName, infix: null, lastName, line })

/** A person with a row in `players` of 2001/02 under this name. Returns the person's id. */
async function addPerson(name: string, columns: Partial<typeof persons.$inferInsert> = {}, season = '2001/02') {
  const [inserted] = await database.db
    .insert(persons)
    .values({ name, ...columns })
    .$returningId()
  const id = inserted!.id

  await database.db.insert(players).values({ name, personId: id, searchTerm: name, season, source: 'verslag' })

  return id
}

const state = async () =>
  (await database.db.select().from(persons).orderBy(asc(persons.id))).map(
    (person) => `${person.name}: ${person.line} ${person.lineSource}, ${person.country} ${person.countrySource}`,
  )

const hans = old('hans.vonk', 'Hans', 'Vonk', 'doelman', 'ZA')

describe('the step linie en land', () => {
  it('gives a person without a line and a country those of his old player, with the source old-site', async () => {
    await addPerson('Hans Vonk')

    const report = await importOldSitePersonFacts(database.db, [oldMatch(['hans.vonk'])], [hans])

    expect(await state()).toEqual(['Hans Vonk: doelman old-site, ZA old-site'])
    expect(report).toEqual({
      changed: 1,
      created: 0,
      lines: ['1 line and 1 country filled in from the old fansite', 'persons without a line: 0, without a country: 0'],
      skipped: 0,
      unchanged: 0,
    })
  })

  it('changes nothing in a second run', async () => {
    await addPerson('Hans Vonk')
    await importOldSitePersonFacts(database.db, [oldMatch(['hans.vonk'])], [hans])

    const before = await database.db.select().from(persons)
    const report = await importOldSitePersonFacts(database.db, [oldMatch(['hans.vonk'])], [hans])

    expect(await database.db.select().from(persons)).toEqual(before)
    expect(report).toMatchObject({ changed: 0, skipped: 0, unchanged: 1 })
    expect(report.lines[0]).toBe('0 lines and 0 countries filled in from the old fansite')
  })

  it('replaces the squad, and never the editors, Wikidata or the list, also in a second run', async () => {
    const names = ['Van Squad', 'Van Redactie', 'Van Wikidata', 'Van Lijst']
    const sources = ['squad', 'manual', 'wikidata', 'list'] as const

    for (const [index, name] of names.entries()) {
      const source = sources[index]!

      await addPerson(name, {
        country: 'BE',
        countrySource: source,
        // The list of players gives no line.
        ...(source === 'list' ? {} : { line: 'aanvaller' as const, lineSource: source }),
      })
    }

    const oldPlayers = names.map((name) =>
      old(name.toLowerCase().replace(' ', '.'), 'Van', name.slice(4), 'doelman', 'NL'),
    )
    const matches = [oldMatch(oldPlayers.map((player) => player.code))]
    const expected = [
      'Van Squad: doelman old-site, NL old-site',
      'Van Redactie: aanvaller manual, BE manual',
      'Van Wikidata: aanvaller wikidata, BE wikidata',
      'Van Lijst: doelman old-site, BE list',
    ]

    expect(await importOldSitePersonFacts(database.db, matches, oldPlayers)).toMatchObject({ changed: 2, unchanged: 2 })
    expect(await state()).toEqual(expected)
    expect(await importOldSitePersonFacts(database.db, matches, oldPlayers)).toMatchObject({ changed: 0, unchanged: 4 })
    expect(await state()).toEqual(expected)
  })

  it('corrects a value of its own when the files change', async () => {
    await addPerson('Hans Vonk', {
      country: 'NL',
      countrySource: 'old-site',
      line: 'aanvaller',
      lineSource: 'old-site',
    })
    await importOldSitePersonFacts(database.db, [oldMatch(['hans.vonk'])], [hans])

    expect(await state()).toEqual(['Hans Vonk: doelman old-site, ZA old-site'])
  })

  it('skips and counts an old player without a person, and one that is in no match', async () => {
    await database.db
      .insert(players)
      .values({ name: 'Hans Vonk', searchTerm: 'Vonk', season: '2001/02', source: 'verslag' })
    // A namesake in another season is another row, and the old player is not in a match of it.
    await addPerson('Hans Vonk', {}, '2015/16')

    const never = old('nooit.gespeeld', 'Nooit', 'Gespeeld', 'aanvaller', 'NL')
    const report = await importOldSitePersonFacts(database.db, [oldMatch(['hans.vonk'])], [hans, never])

    expect(report).toMatchObject({ changed: 0, skipped: 2, unchanged: 0 })
    expect(report.lines).toEqual([
      '2 old players have no person, so nothing is filled in: hans.vonk, nooit.gespeeld',
      '0 lines and 0 countries filled in from the old fansite',
      'persons without a line: 1, without a country: 1',
    ])
    expect(await state()).toEqual(['Hans Vonk: null null, null null'])
  })

  it('skips an old player whose rows have two persons', async () => {
    await addPerson('Hans Vonk')
    await addPerson('Hans Vonk', {}, '2002/03')

    const report = await importOldSitePersonFacts(
      database.db,
      [oldMatch(['hans.vonk']), { ...oldMatch(['hans.vonk'], '0203', '2002-09-01 20:00:00'), code: 'ajax.thuis' }],
      [hans],
    )

    expect(report).toMatchObject({ changed: 0, skipped: 1 })
    expect(report.lines[0]).toBe('skipped hans.vonk: its rows in players have 2 persons')
  })

  it('leaves a country it does not know empty, with a line, and fills in the line', async () => {
    await addPerson('Radoslav Samardžić')

    const player = old('radoslav.samardzic', 'Radoslav', 'Samardžić', 'aanvaller', 'YU')
    const report = await importOldSitePersonFacts(database.db, [oldMatch([player.code])], [player])

    expect(await state()).toEqual(['Radoslav Samardžić: aanvaller old-site, null null'])
    expect(report.lines).toContain(
      'the country of 1 old player is not one we know, so it is left empty: radoslav.samardzic (YU)',
    )
  })

  it('reads the codes of the old site as the old site meant them', async () => {
    await addPerson('Danijel Pranjić')

    const player = old('danijel.pranjic', 'Danijel', 'Pranjić', 'middenvelder', 'CR')

    await importOldSitePersonFacts(database.db, [oldMatch([player.code])], [player])

    expect(await state()).toEqual(['Danijel Pranjić: middenvelder old-site, HR old-site'])
  })
})

describe('oldSiteCountryCodes', () => {
  it('gives every code a code of the list of countries', () => {
    expect([...oldSiteCountryCodes.values()].filter((code) => !isCountryCode(code))).toEqual([])
  })

  it('knows every country in the files but Yugoslavia', async () => {
    const { players: filed } = await readOldSiteData()
    const codes = new Set(filed.flatMap((player) => (player.country === null ? [] : [player.country])))

    expect([...codes].filter((code) => !oldSiteCountryCodes.has(code))).toEqual(['YU'])
    expect(filed.filter((player) => player.country !== null).length).toBeGreaterThan(160)
  })
})
