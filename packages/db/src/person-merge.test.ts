import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import {
  fillPlayerFrom,
  mergeChosenPersons,
  mergeEditorsPersonInto,
  mergePersons,
  planPersonMerge,
} from './person-merge.ts'
import { createPersonBook, type PersonName } from './persons.ts'
import {
  auditLog,
  matchAppearances,
  matches,
  matchGoals,
  matchReports,
  personNationalities,
  personPages,
  personPositions,
  persons,
  players,
  playerSeasonStats,
  playerStatDifferences,
  wikidataItems,
} from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['matches', 'players', 'persons', 'wikidata_items']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

// The four persons the owner decided on 10 November 2026, with the real characters. Every date
// of birth, Q-number and number of an article below is made up.
const ugur = { aliases: ['Ugur Yıldırım'], title: 'Uğur Yıldırım' }
const samardzic = { aliases: ['Radoslav Samardzic'], title: 'Radoslav Samardžić' }
const schippers = { aliases: ['Jan-Harm Schippers'], title: 'Jan Harm Schippers' }
const vanDenBerg = { aliases: ['Robert van der Berg'], title: 'Robert van den Berg' }
const list = [ugur, samardzic, schippers, vanDenBerg]

const match: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 2,
  home: true,
  kickoffAt: new Date('2004-10-24T18:45:00Z'),
  matchDate: '2004-10-24',
  opponent: 'Testdorp FC',
  round: 'Speelronde 1',
  season: '2004/05',
  status: 'played',
}

async function addMatch(matchDate: string): Promise<number> {
  const [values] = await withClubs(database.db, [
    { ...match, kickoffAt: new Date(`${matchDate}T18:45:00Z`), matchDate, round: `Wedstrijd van ${matchDate}` },
  ])
  const [{ insertId }] = await database.db.insert(matches).values(values!)

  return insertId
}

async function addPerson(values: typeof persons.$inferInsert): Promise<number> {
  const [{ insertId }] = await database.db.insert(persons).values(values)

  await database.db.insert(personPages).values({ page: values.wikipediaPage ?? '', personId: insertId })

  return insertId
}

async function addPlayer(values: Omit<typeof players.$inferInsert, 'searchTerm'>): Promise<number> {
  const [{ insertId }] = await database.db.insert(players).values({ ...values, searchTerm: 'x' })

  return insertId
}

const personRows = () => database.db.select().from(persons).orderBy(asc(persons.id))
const pageRows = async () =>
  (await database.db.select().from(personPages).orderBy(asc(personPages.page))).map((row) => [row.page, row.personId])
const playerRows = () => database.db.select().from(players).orderBy(asc(players.id))
const goalRows = () => database.db.select().from(matchGoals).orderBy(asc(matchGoals.id))

describe('mergePersons', () => {
  it('tells the two spellings apart as titles, while a player of a season cannot have both', async () => {
    // `wikipedia_page` of a person compares byte by byte, so both titles are a person.
    await addPerson({ wikipediaPage: 'Uğur Yıldırım' })
    await addPerson({ wikipediaPage: 'Ugur Yıldırım' })
    await addPerson({ wikipediaPage: 'Radoslav Samardžić' })
    await addPerson({ wikipediaPage: 'Radoslav Samardzic' })

    expect(await personRows()).toHaveLength(4)

    // The name of a player ignores accents (utf8mb4_unicode_ci): g and ğ, z and ž, c and ć are
    // the same there, so a season never has two rows that differ in those alone.
    await addPlayer({ name: 'Uğur Yıldırım', season: '2004/05' })
    await addPlayer({ name: 'Radoslav Samardžić', season: '2004/05' })
    await expect(addPlayer({ name: 'Ugur Yıldırım', season: '2004/05' })).rejects.toThrow()
    await expect(addPlayer({ name: 'Radoslav Samardzic', season: '2004/05' })).rejects.toThrow()
    // A dotless ı is not an i, and a hyphen is not a space: these are two names.
    await addPlayer({ name: 'Ugur Yildirim', season: '2004/05' })
    await addPlayer({ name: 'Jan Harm Schippers', season: '2004/05' })
    await addPlayer({ name: 'Jan-Harm Schippers', season: '2004/05' })
  })

  it('merges a pair that both exist, with their goals, players, titles and what Wikidata said', async () => {
    await database.db.insert(wikidataItems).values([
      { id: 'Q55', label: 'Nederland' },
      { id: 'Q43', label: 'Turkije' },
      { id: 'Q280658', label: 'aanvaller' },
      { id: 'Q9920', label: 'Haarlem' },
    ])

    const kept = await addPerson({
      familyName: 'Yıldırım',
      givenName: 'Uğur',
      name: 'Uğur Yıldırım',
      nameSource: 'sort_key',
      wikidataId: 'Q1000001',
      wikidataReadAt: new Date('2026-11-01T10:00:00Z'),
      wikipediaPage: 'Uğur Yıldırım',
      wikipediaPageId: 12345,
    })
    const other = await addPerson({
      birthDate: '1900-01-01',
      birthDatePrecision: 'day',
      birthPlaceId: 'Q9920',
      line: 'aanvaller',
      lineSource: 'squad',
      name: 'Ugur Yıldırım',
      nameSource: 'guess',
      wikipediaPage: 'Ugur Yıldırım',
    })

    await database.db.insert(personPages).values({ page: 'Ugur Yildirim (voetballer)', personId: other })
    await database.db.insert(personNationalities).values([
      { itemId: 'Q55', personId: kept, position: 0 },
      { itemId: 'Q55', personId: other, position: 0 },
      { itemId: 'Q43', personId: other, position: 1 },
    ])
    await database.db.insert(personPositions).values({ itemId: 'Q280658', personId: other, position: 0 })

    const squad = await addPlayer({
      name: 'Uğur Yıldırım',
      personId: kept,
      season: '2004/05',
      wikipediaPage: ugur.title,
    })
    const scorer = await addPlayer({
      name: 'Ugur Yıldırım',
      personId: other,
      season: '2005/06',
      source: 'doelpunten',
      wikipediaPage: 'Ugur Yıldırım',
    })
    const matchId = await addMatch('2004-10-24')

    await database.db.insert(matchGoals).values([
      { matchId, minute: 10, ours: true, personId: kept, player: 'Yıldırım', playerId: squad },
      { matchId, minute: 80, ours: true, personId: other, player: 'Yıldırım', playerId: scorer },
    ])

    const first = await mergePersons(database.db, list)

    expect(first).toEqual({ merged: ["'Ugur Yıldırım' is merged into 'Uğur Yıldırım'"], warnings: [] })
    expect(await personRows()).toMatchObject([
      {
        birthDate: '1900-01-01',
        birthDatePrecision: 'day',
        birthPlaceId: 'Q9920',
        id: kept,
        line: 'aanvaller',
        lineSource: 'squad',
        name: 'Uğur Yıldırım',
        nameSource: 'sort_key',
        wikidataId: 'Q1000001',
        wikipediaPage: 'Uğur Yıldırım',
        wikipediaPageId: 12345,
      },
    ])
    expect(await pageRows()).toEqual([
      ['Ugur Yildirim (voetballer)', kept],
      ['Ugur Yıldırım', kept],
      ['Uğur Yıldırım', kept],
    ])
    expect((await goalRows()).map((row) => [row.personId, row.playerId])).toEqual([
      [kept, squad],
      [kept, scorer],
    ])
    expect((await playerRows()).map((row) => [row.id, row.season, row.personId])).toEqual([
      [squad, '2004/05', kept],
      [scorer, '2005/06', kept],
    ])
    expect(
      (await database.db.select().from(personNationalities).orderBy(asc(personNationalities.position))).map((row) => [
        row.personId,
        row.position,
        row.itemId,
      ]),
    ).toEqual([
      [kept, 0, 'Q55'],
      [kept, 1, 'Q43'],
    ])
    expect(await database.db.select().from(personPositions)).toEqual([
      { itemId: 'Q280658', personId: kept, position: 0 },
    ])

    // A second run changes and says nothing.
    const before = [await personRows(), await pageRows(), await playerRows(), await goalRows()]

    expect(await mergePersons(database.db, list)).toEqual({ merged: [], warnings: [] })
    expect([await personRows(), await pageRows(), await playerRows(), await goalRows()]).toEqual(before)

    // A later import finds the person by the old title and makes no second one, with the list
    // and without it.
    const book = await createPersonBook(database.db, {
      aliases: new Map([['Ugur Yıldırım', 'Uğur Yıldırım']]),
      redirects: new Map([['Ugur Yıldırım', 'Ugur Yıldırım']]),
    })

    expect(await book.resolve('Ugur Yıldırım')).toBe(kept)
    expect(await (await createPersonBook(database.db)).resolve('Ugur Yıldırım')).toBe(kept)
    expect(await personRows()).toHaveLength(1)
  })

  it('keeps the line and the country the editors set, also on the person that goes (#1051)', async () => {
    await addPerson({
      country: 'NL',
      countrySource: 'wikidata',
      line: 'aanvaller',
      lineSource: 'wikidata',
      wikipediaPage: 'Uğur Yıldırım',
    })
    await addPerson({
      country: 'TR',
      countrySource: 'manual',
      line: 'middenvelder',
      lineSource: 'manual',
      wikipediaPage: 'Ugur Yıldırım',
    })
    // The person that stays has a country of the editors, and the other one from Wikidata.
    await addPerson({ country: 'RS', countrySource: 'manual', wikipediaPage: 'Radoslav Samardžić' })
    await addPerson({
      country: 'BA',
      countrySource: 'wikidata',
      line: 'doelman',
      lineSource: 'squad',
      wikipediaPage: 'Radoslav Samardzic',
    })

    await mergePersons(database.db, list)

    expect(
      (await personRows()).map(({ country, countrySource, line, lineSource }) => ({
        country,
        countrySource,
        line,
        lineSource,
      })),
    ).toEqual([
      { country: 'TR', countrySource: 'manual', line: 'middenvelder', lineSource: 'manual' },
      { country: 'RS', countrySource: 'manual', line: 'doelman', lineSource: 'squad' },
    ])
  })

  it('keeps a year of death the editors set, and fills a missing one from the other person (#1147)', async () => {
    await addPerson({
      deathDate: '2020-01-01',
      deathDatePrecision: 'year',
      deathDateSource: 'wikidata',
      wikipediaPage: 'Uğur Yıldırım',
    })
    await addPerson({
      deathDate: '2018-01-01',
      deathDatePrecision: 'year',
      deathDateSource: 'manual',
      wikipediaPage: 'Ugur Yıldırım',
    })
    await addPerson({ wikipediaPage: 'Radoslav Samardžić' })
    await addPerson({
      deathDate: '2019-05-06',
      deathDatePrecision: 'day',
      deathDateSource: 'wikidata',
      wikipediaPage: 'Radoslav Samardzic',
    })

    await mergePersons(database.db, list)

    expect(
      (await personRows()).map(({ deathDate, deathDatePrecision, deathDateSource }) => ({
        deathDate,
        deathDatePrecision,
        deathDateSource,
      })),
    ).toEqual([
      { deathDate: '2018-01-01', deathDatePrecision: 'year', deathDateSource: 'manual' },
      { deathDate: '2019-05-06', deathDatePrecision: 'day', deathDateSource: 'wikidata' },
    ])
  })

  it('keeps a birth date the editors set, and fills a missing one from the other person (#1164)', async () => {
    await addPerson({
      birthDate: '1990-03-04',
      birthDatePrecision: 'day',
      birthDateSource: 'wikidata',
      wikipediaPage: 'Uğur Yıldırım',
    })
    await addPerson({
      birthDate: '1991-01-01',
      birthDatePrecision: 'year',
      birthDateSource: 'manual',
      wikipediaPage: 'Ugur Yıldırım',
    })
    await addPerson({ wikipediaPage: 'Radoslav Samardžić' })
    await addPerson({
      birthDate: '1979-05-06',
      birthDatePrecision: 'day',
      birthDateSource: 'wikidata',
      wikipediaPage: 'Radoslav Samardzic',
    })

    await mergePersons(database.db, list)

    expect(
      (await personRows()).map(({ birthDate, birthDatePrecision, birthDateSource }) => ({
        birthDate,
        birthDatePrecision,
        birthDateSource,
      })),
    ).toEqual([
      { birthDate: '1991-01-01', birthDatePrecision: 'year', birthDateSource: 'manual' },
      { birthDate: '1979-05-06', birthDatePrecision: 'day', birthDateSource: 'wikidata' },
    ])
  })

  it('makes one row of the two rows of the person in a season, and loses no goal, line-up or number', async () => {
    const kept = await addPerson({ wikipediaPage: 'Jan Harm Schippers' })
    const other = await addPerson({ wikipediaPage: 'Jan-Harm Schippers' })
    const season = '1994/95'
    // The row of the transfers has the title that stays, the row of the statistics the other.
    const stays = await addPlayer({
      name: 'Jan Harm Schippers',
      personId: kept,
      season,
      source: 'transfers',
      wikipediaPage: 'Jan Harm Schippers',
    })
    const double = await addPlayer({
      country: 'NL',
      name: 'Jan-Harm Schippers',
      personId: other,
      position: 'aanvaller',
      season,
      shirtNumber: 9,
      source: 'statistieken',
      wikipediaPage: 'Jan-Harm Schippers',
    })
    const later = await addPlayer({ name: 'Jan-Harm Schippers', personId: other, season: '1995/96' })
    const one = await addMatch('1994-09-01')
    const two = await addMatch('1994-09-08')

    await database.db.insert(matchGoals).values([
      { matchId: one, minute: 10, ours: true, personId: other, player: 'Schippers', playerId: double },
      { matchId: two, minute: 20, ours: true, personId: kept, player: 'Schippers', playerId: stays },
    ])
    await database.db.insert(matchReports).values([
      { matchId: one, status: 'klaar' },
      { matchId: two, status: 'klaar' },
    ])
    // The first match has the other row only, so the line-up moves. The second has both: one
    // row for each player and match, so the other stays in the report without a player.
    await database.db.insert(matchAppearances).values([
      { matchId: one, name: 'Jan-Harm Schippers', ours: true, playerId: double, starter: true },
      { matchId: two, name: 'Jan-Harm Schippers', ours: true, playerId: double, starter: false },
      { matchId: two, name: 'Jan Harm Schippers', ours: true, playerId: stays, starter: true },
    ])
    await database.db.insert(playerSeasonStats).values([
      { appearances: 20, assists: 1, competition: 'Eredivisie', goals: 5, playerId: double, season },
      { appearances: 2, assists: 0, competition: 'KNVB Beker', goals: 1, playerId: double, season },
      { appearances: 21, assists: 1, competition: 'Eredivisie', goals: 5, playerId: stays, season },
    ])
    await database.db.insert(playerStatDifferences).values({
      comparedWith: 'matches',
      competition: 'KNVB Beker',
      firstSeenAt: new Date('2026-11-01T10:00:00Z'),
      lastSeenAt: new Date('2026-11-01T10:00:00Z'),
      otherGoals: 2,
      playerId: double,
      season,
      status: 'pending',
      tableGoals: 1,
    })

    const first = await mergePersons(database.db, list)

    expect(first.merged).toEqual(["'Jan-Harm Schippers' is merged into 'Jan Harm Schippers'"])
    expect(first.warnings).toEqual([
      "Persons: 'Jan-Harm Schippers' and 'Jan Harm Schippers' (1994/95) are one player now and had different numbers in Eredivisie; those of 'Jan Harm Schippers' stay, check which are right",
    ])
    expect(await playerRows()).toMatchObject([
      {
        country: 'NL',
        id: stays,
        name: 'Jan Harm Schippers',
        personId: kept,
        position: 'aanvaller',
        season,
        shirtNumber: 9,
        source: 'transfers',
        wikipediaPage: 'Jan Harm Schippers',
      },
      { id: later, personId: kept, season: '1995/96' },
    ])
    expect((await goalRows()).map((row) => [row.matchId, row.personId, row.playerId])).toEqual([
      [one, kept, stays],
      [two, kept, stays],
    ])
    expect(
      (await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id))).map((row) => [
        row.matchId,
        row.playerId,
      ]),
    ).toEqual([
      [one, stays],
      [two, null],
      [two, stays],
    ])
    expect(
      (await database.db.select().from(playerSeasonStats).orderBy(asc(playerSeasonStats.id))).map((row) => [
        row.playerId,
        row.competition,
        row.appearances,
      ]),
    ).toEqual([
      [stays, 'KNVB Beker', 2],
      [stays, 'Eredivisie', 21],
    ])
    expect(await database.db.select().from(playerStatDifferences)).toMatchObject([{ otherGoals: 2, playerId: stays }])
    expect(await mergePersons(database.db, list)).toEqual({ merged: [], warnings: [] })
    expect(await playerRows()).toHaveLength(2)
  })

  it('gives the one person of a pair the spelling that stays, and makes no second person', async () => {
    const name: PersonName = {
      familyName: 'Samardžić',
      familyNamePrefix: null,
      givenName: 'Radoslav',
      name: 'Radoslav Samardžić',
      source: 'guess',
    }
    const id = await addPerson({
      familyName: 'Samardzic',
      givenName: 'Radoslav',
      name: 'Radoslav Samardzic',
      nameSource: 'guess',
      wikipediaPage: 'Radoslav Samardzic',
    })
    const player = await addPlayer({ name: 'Radoslav Samardzic', personId: id, season: '1997/98' })
    const matchId = await addMatch('1997-09-01')

    await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 10, ours: true, personId: id, player: 'Samardzic', playerId: player })

    const first = await mergePersons(database.db, list, new Map([[samardzic.title, name]]))

    expect(first).toEqual({ merged: ["'Radoslav Samardzic' is now 'Radoslav Samardžić'"], warnings: [] })
    expect(await personRows()).toMatchObject([
      {
        familyName: 'Samardžić',
        givenName: 'Radoslav',
        id,
        name: 'Radoslav Samardžić',
        nameSource: 'guess',
        wikipediaPage: 'Radoslav Samardžić',
      },
    ])
    expect(await pageRows()).toEqual([
      ['Radoslav Samardzic', id],
      ['Radoslav Samardžić', id],
    ])
    expect(await goalRows()).toMatchObject([{ personId: id, playerId: player }])
    expect(await playerRows()).toMatchObject([{ personId: id }])
    expect(await mergePersons(database.db, list, new Map([[samardzic.title, name]]))).toEqual({
      merged: [],
      warnings: [],
    })

    // Both spellings lead to him from now on.
    const book = await createPersonBook(database.db)

    expect([await book.resolve('Radoslav Samardzic'), await book.resolve('Radoslav Samardžić')]).toEqual([id, id])
    expect(await personRows()).toHaveLength(1)
  })

  it('keeps a name from the list, and empties another when it has none for the title that stays', async () => {
    const manual = await addPerson({
      familyName: 'Berg',
      familyNamePrefix: 'van den',
      givenName: 'Rob',
      name: 'Rob van den Berg',
      nameSource: 'manual',
      wikipediaPage: 'Robert van der Berg',
    })
    const guessed = await addPerson({
      name: 'Jan-Harm Schippers',
      nameSource: 'guess',
      wikipediaPage: schippers.aliases[0]!,
    })

    await mergePersons(database.db, list)

    expect(await personRows()).toMatchObject([
      { id: manual, name: 'Rob van den Berg', nameSource: 'manual', wikipediaPage: 'Robert van den Berg' },
      { id: guessed, name: null, nameSource: null, wikipediaPage: 'Jan Harm Schippers' },
    ])
  })

  it('leaves a person of the editors without a title alone, and keeps a name of the editors', async () => {
    // His name is an alias of the list, but he has no title, so the list does not find him.
    const [{ insertId: untitled }] = await database.db
      .insert(persons)
      .values({ familyName: 'Schippers', name: schippers.aliases[0]!, nameSource: 'redactie' })
    const named = await addPerson({
      familyName: 'Berg',
      name: 'Rob Berg',
      nameSource: 'redactie',
      wikipediaPage: 'Robert van der Berg',
    })

    await mergePersons(database.db, list)

    expect(await personRows()).toMatchObject([
      { id: untitled, name: schippers.aliases[0], nameSource: 'redactie', wikipediaPage: null },
      { id: named, name: 'Rob Berg', nameSource: 'redactie', wikipediaPage: 'Robert van den Berg' },
    ])
  })

  it('renames the person when the title that stays is a title of his already', async () => {
    const id = await addPerson({ wikipediaPage: 'Robert van der Berg' })

    await database.db.insert(personPages).values({ page: 'Robert van den Berg', personId: id })

    expect((await mergePersons(database.db, list)).merged).toEqual([
      "'Robert van der Berg' is now 'Robert van den Berg'",
    ])
    expect(await personRows()).toMatchObject([{ id, wikipediaPage: 'Robert van den Berg' }])
    expect(await pageRows()).toEqual([
      ['Robert van den Berg', id],
      ['Robert van der Berg', id],
    ])
  })

  it('keeps the article and the date of birth of the title that stays, and warns when the other differs', async () => {
    const kept = await addPerson({
      birthDate: '1900-01-01',
      birthDatePrecision: 'day',
      wikidataId: 'Q111',
      wikipediaPage: 'Robert van den Berg',
      wikipediaPageId: 1,
    })

    await addPerson({
      birthDate: '1901-01-01',
      birthDatePrecision: 'year',
      wikidataId: 'Q222',
      wikipediaPage: 'Robert van der Berg',
      wikipediaPageId: 2,
    })

    const { merged, warnings } = await mergePersons(database.db, list)

    expect(merged).toEqual(["'Robert van der Berg' is merged into 'Robert van den Berg'"])
    expect(warnings).toEqual([
      "Persons: 'Robert van den Berg' and 'Robert van der Berg' are merged and have a different item on Wikidata (Q111 and Q222); the first stays, check which is right",
      "Persons: 'Robert van den Berg' and 'Robert van der Berg' are merged and have a different date of birth; the first stays, check which is right",
    ])
    expect(await personRows()).toMatchObject([
      {
        birthDate: '1900-01-01',
        birthDatePrecision: 'day',
        id: kept,
        wikidataId: 'Q111',
        wikipediaPage: 'Robert van den Berg',
        wikipediaPageId: 1,
      },
    ])
    expect(await mergePersons(database.db, list)).toEqual({ merged: [], warnings: [] })
  })

  it('warns about two articles when neither person has an item on Wikidata', async () => {
    await addPerson({ wikipediaPage: 'Robert van den Berg', wikipediaPageId: 1 })
    await addPerson({ wikipediaPage: 'Robert van der Berg', wikipediaPageId: 2 })

    expect((await mergePersons(database.db, list)).warnings).toEqual([
      "Persons: 'Robert van den Berg' and 'Robert van der Berg' are merged and have a different article on Wikipedia (1 and 2); the first stays, check which is right",
    ])
  })

  it('remembers the other title when the person had no row for it, so no import makes him again', async () => {
    const [{ insertId: kept }] = await database.db.insert(persons).values({ wikipediaPage: 'Uğur Yıldırım' })
    const [{ insertId: lone }] = await database.db.insert(persons).values({ wikipediaPage: 'Radoslav Samardzic' })

    await database.db.insert(persons).values({ wikipediaPage: 'Ugur Yıldırım' })
    await mergePersons(database.db, list)

    expect(await pageRows()).toEqual([
      ['Radoslav Samardzic', lone],
      ['Radoslav Samardžić', lone],
      ['Ugur Yıldırım', kept],
    ])
  })

  it('leaves two persons who are in no list alone, and asks nothing for an empty list', async () => {
    await addPerson({ wikipediaPage: 'Jordy Bruijn' })
    await addPerson({ wikipediaPage: 'Jordy Buijs' })

    expect(await mergePersons(database.db, list)).toEqual({ merged: [], warnings: [] })
    expect(await mergePersons(database.db, [])).toEqual({ merged: [], warnings: [] })
    expect((await personRows()).map((row) => row.wikipediaPage)).toEqual(['Jordy Bruijn', 'Jordy Buijs'])
    expect(await database.db.select().from(persons).where(eq(persons.wikipediaPage, 'Jordy Bruijn'))).toHaveLength(1)
  })

  it('keeps the row of the editors of the two rows of a season, with what they set, and fills in the rest', async () => {
    const kept = await addPerson({ wikipediaPage: schippers.title })
    const other = await addPerson({
      familyName: 'Schippers',
      name: 'J.H. Schippers',
      nameSource: 'redactie',
      wikipediaPage: schippers.aliases[0]!,
    })
    // The row of the table has the title that stays and the better source, and still goes.
    const ofTable = await addPlayer({
      country: 'NL',
      name: 'Jan Harm Schippers',
      personId: kept,
      position: 'aanvaller',
      season: '2004/05',
      shirtNumber: 11,
      source: 'selectie',
      wikipediaPage: schippers.title,
    })
    const ofEditors = await addPlayer({
      editorsFields: ['name', 'shirt_number', 'wikipedia_page'],
      name: 'J.H. Schippers',
      personId: other,
      season: '2004/05',
      shirtNumber: 7,
      source: 'redactie',
      wikipediaPage: schippers.aliases[0]!,
    })

    await mergePersons(database.db, list)

    expect(await playerRows()).toMatchObject([
      {
        country: 'NL',
        editorsFields: ['name', 'shirt_number', 'wikipedia_page'],
        id: ofEditors,
        name: 'J.H. Schippers',
        personId: kept,
        position: 'aanvaller',
        shirtNumber: 7,
        source: 'redactie',
        wikipediaPage: schippers.aliases[0],
      },
    ])
    expect(await playerRows()).not.toMatchObject([{ id: ofTable }])
    // The name the editors gave the person that went is the name of the person that stays.
    expect(await personRows()).toMatchObject([
      {
        familyName: 'Schippers',
        id: kept,
        name: 'J.H. Schippers',
        nameSource: 'redactie',
        wikipediaPage: schippers.title,
      },
    ])
  })
})

describe('mergeEditorsPersonInto', () => {
  it('makes a person of the editors without an article the person of the article, with their name', async () => {
    const [{ insertId: untitled }] = await database.db
      .insert(persons)
      .values({ familyName: 'Spits', givenName: 'Sanne', name: 'Sanne Spits', nameSource: 'redactie' })
    const titled = await addPerson({ birthDate: '1999-01-02', name: 'S. Spits', wikipediaPage: 'Sanne Spits (1999)' })
    const player = await addPlayer({ name: 'Sanne Spits', personId: untitled, season: '2004/05', source: 'redactie' })
    const earlier = await addPlayer({ name: 'Sanne Spits', personId: untitled, season: '2003/04', source: 'redactie' })

    expect(await mergeEditorsPersonInto(database.db, untitled, titled)).toBe(true)
    expect(await personRows()).toMatchObject([
      {
        birthDate: '1999-01-02',
        familyName: 'Spits',
        givenName: 'Sanne',
        id: titled,
        name: 'Sanne Spits',
        nameSource: 'redactie',
        wikipediaPage: 'Sanne Spits (1999)',
      },
    ])
    expect(await playerRows()).toMatchObject([
      { id: player, personId: titled },
      { id: earlier, personId: titled },
    ])
  })

  it('keeps the side the editors gave, of the person that stays or else of the other (#1194)', async () => {
    const untitled = await addPerson({ name: 'Sanne Spits', nameSource: 'redactie', side: 'links' })
    const titled = await addPerson({ name: 'S. Spits', wikipediaPage: 'Sanne Spits (1999)' })

    expect(await mergeEditorsPersonInto(database.db, untitled, titled)).toBe(true)
    expect(await personRows()).toMatchObject([{ id: titled, side: 'links' }])
  })

  it('leaves a person with an article of his own alone, and a person who is gone', async () => {
    const one = await addPerson({ wikipediaPage: 'Sanne Spits' })
    const two = await addPerson({ wikipediaPage: 'Sanne Spits (1999)' })

    expect(await mergeEditorsPersonInto(database.db, one, two)).toBe(false)
    expect(await mergeEditorsPersonInto(database.db, 0, two)).toBe(false)
    expect(await mergeEditorsPersonInto(database.db, two, two)).toBe(false)
    expect(await personRows()).toHaveLength(2)
  })
})

// A player who changed his name: one person under the old name with the squad of one season,
// and one under the new name with the seasons after it. All of it is made up.
describe('mergeChosenPersons', () => {
  const t0 = new Date('2026-11-10T12:00:00Z')
  const describePlan = () => 'what moved'

  beforeEach(async () => {
    await database.pool.query('DELETE FROM audit_log')
  })

  async function twoPersons() {
    const old = await addPerson({
      line: 'aanvaller',
      lineSource: 'manual',
      name: 'Oude Naam',
      wikidataId: 'Q900001',
      wikipediaPage: 'Oude Naam',
    })
    const renamed = await addPerson({
      country: 'NL',
      countrySource: 'wikidata',
      line: 'middenvelder',
      lineSource: 'wikidata',
      name: 'Nieuwe Naam',
      wikidataId: 'Q900002',
      wikipediaPage: 'Nieuwe Naam',
    })

    await database.db.insert(personPages).values({ page: 'Oude Naam (voetballer)', personId: old })

    return { old, renamed }
  }

  it('points everything at the person that stays, remembers the title and writes one row of the log', async () => {
    const { old, renamed } = await twoPersons()
    const first = await addPlayer({ name: 'Oude Naam', personId: old, season: '2003/04', wikipediaPage: 'Oude Naam' })
    const later = await addPlayer({ name: 'Nieuwe Naam', personId: renamed, season: '2004/05' })
    const matchId = await addMatch('2003-10-24')

    await database.db.insert(matchReports).values({ matchId, status: 'klaar' })
    await database.db
      .insert(matchAppearances)
      .values({ matchId, name: 'Oude Naam', ours: true, playerId: first, starter: true })
    await database.db.insert(matchGoals).values([
      { matchId, minute: 10, ours: true, personId: old, player: 'Oude Naam', playerId: first },
      { matchId, minute: 20, ours: true, personId: old, player: 'Oude Naam' },
    ])

    const plan = await mergeChosenPersons(
      database.db,
      { describe: describePlan, keptId: renamed, otherId: old, userId: null },
      t0,
    )

    expect(plan).toMatchObject({
      appearances: 1,
      doubles: [],
      editorsValues: 1,
      goals: 2,
      keptSeasons: ['2004/05'],
      pages: ['Oude Naam', 'Oude Naam (voetballer)'],
      rows: [{ id: first, name: 'Oude Naam', season: '2003/04' }],
    })
    // The line of the editors goes before that of Wikidata, the rest is of the one that stays.
    expect(await personRows()).toMatchObject([
      {
        country: 'NL',
        id: renamed,
        line: 'aanvaller',
        lineSource: 'manual',
        name: 'Nieuwe Naam',
        wikidataId: 'Q900002',
        wikipediaPage: 'Nieuwe Naam',
      },
    ])
    expect(await pageRows()).toEqual([
      ['Nieuwe Naam', renamed],
      ['Oude Naam', renamed],
      ['Oude Naam (voetballer)', renamed],
    ])
    expect(await playerRows()).toMatchObject([
      { id: first, personId: renamed, wikipediaPage: 'Oude Naam' },
      { id: later, personId: renamed },
    ])
    expect(await goalRows()).toMatchObject([{ personId: renamed }, { personId: renamed }])
    expect(await database.db.select().from(auditLog)).toMatchObject([
      { action: 'person.merge', createdAt: t0, detail: 'what moved', itemId: renamed, userId: null },
    ])

    // The book of the importer finds the person that stays by the old title, and makes nobody.
    const book = await createPersonBook(database.db)

    expect(await book.resolve('Oude Naam')).toBe(renamed)
    expect(book.counts).toEqual({ people: 0, titles: 0 })
  })

  it('makes the two rows of a season one row, and keeps the row of the editors', async () => {
    const { old, renamed } = await twoPersons()
    const ofImport = await addPlayer({ name: 'Nieuwe Naam', personId: renamed, season: '2004/05', shirtNumber: 9 })
    const ofEditors = await addPlayer({
      editorsFields: ['name'],
      name: 'O. Naam',
      personId: old,
      season: '2004/05',
    })

    expect(await planPersonMerge(database.db, old, renamed)).toMatchObject({
      doubles: [
        { gone: { id: ofImport, name: 'Nieuwe Naam' }, season: '2004/05', stays: { id: ofEditors, name: 'O. Naam' } },
      ],
      editorsValues: 2,
    })
    // The plan changes nothing.
    expect(await personRows()).toHaveLength(2)

    await mergeChosenPersons(database.db, { describe: describePlan, keptId: renamed, otherId: old, userId: null })

    expect(await playerRows()).toMatchObject([
      { editorsFields: ['name'], id: ofEditors, name: 'O. Naam', personId: renamed, shirtNumber: 9 },
    ])
  })

  it('keeps the name of the editors, and gives a person without a title the title of the other', async () => {
    const [{ insertId: untitled }] = await database.db
      .insert(persons)
      .values({ familyName: 'Naam', givenName: 'Nieuwe', name: 'Nieuwe Naam', nameSource: 'redactie' })
    const titled = await addPerson({ englishTitle: true, name: 'Oude Naam', wikipediaPage: 'Oude Naam' })

    await mergeChosenPersons(database.db, { describe: describePlan, keptId: untitled, otherId: titled, userId: null })

    expect(await personRows()).toMatchObject([
      { englishTitle: true, id: untitled, name: 'Nieuwe Naam', nameSource: 'redactie', wikipediaPage: 'Oude Naam' },
    ])
    expect(await pageRows()).toEqual([['Oude Naam', untitled]])
  })

  it('does nothing for one person twice and for a person who is gone', async () => {
    const { old, renamed } = await twoPersons()

    expect(
      await mergeChosenPersons(database.db, { describe: describePlan, keptId: old, otherId: old, userId: null }),
    ).toBe('same')
    expect(
      await mergeChosenPersons(database.db, { describe: describePlan, keptId: renamed, otherId: 0, userId: null }),
    ).toBe('missing')
    expect(await planPersonMerge(database.db, old, 0)).toBe('missing')
    expect(await personRows()).toHaveLength(2)
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})

describe('fillPlayerFrom (#1076)', () => {
  const rowOf = async (id: number) => (await database.db.select().from(players).where(eq(players.id, id)))[0]!

  it('takes the previous number and its day along with the number it fills in', async () => {
    const stays = await addPlayer({ name: 'Testspeler Blijft', season: '2004/05' })
    const gone = await addPlayer({
      name: 'Testspeler Weg',
      previousShirtNumber: 29,
      season: '2004/05',
      shirtNumber: 9,
      shirtNumberFrom: '2004-10-01',
    })

    await fillPlayerFrom(database.db, await rowOf(stays), await rowOf(gone))

    expect(await rowOf(stays)).toMatchObject({
      previousShirtNumber: 29,
      shirtNumber: 9,
      shirtNumberFrom: '2004-10-01',
    })
  })

  it('keeps its own previous number and day when it has a number already', async () => {
    const stays = await addPlayer({
      name: 'Testspeler Blijft',
      previousShirtNumber: 3,
      season: '2004/05',
      shirtNumber: 4,
      shirtNumberFrom: '2004-11-01',
    })
    const gone = await addPlayer({
      name: 'Testspeler Weg',
      previousShirtNumber: 29,
      season: '2004/05',
      shirtNumber: 9,
      shirtNumberFrom: '2004-10-01',
    })

    await fillPlayerFrom(database.db, await rowOf(stays), await rowOf(gone))

    expect(await rowOf(stays)).toMatchObject({
      previousShirtNumber: 3,
      shirtNumber: 4,
      shirtNumberFrom: '2004-11-01',
    })
  })
})
