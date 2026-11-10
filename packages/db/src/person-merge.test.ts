import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { mergePersons } from './person-merge.ts'
import { createPersonBook, type PersonName } from './persons.ts'
import {
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

// The four persons the owner decided on 10 November 2026, with the real characters.
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

  await database.db.insert(personPages).values({ page: values.wikipediaPage, personId: insertId })

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
      wikidataId: 'Q2071468',
      wikidataReadAt: new Date('2026-11-01T10:00:00Z'),
      wikipediaPage: 'Uğur Yıldırım',
      wikipediaPageId: 12345,
    })
    const other = await addPerson({
      birthDate: '1982-05-08',
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
        birthDate: '1982-05-08',
        birthDatePrecision: 'day',
        birthPlaceId: 'Q9920',
        id: kept,
        line: 'aanvaller',
        lineSource: 'squad',
        name: 'Uğur Yıldırım',
        nameSource: 'sort_key',
        wikidataId: 'Q2071468',
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
      birthDate: '1975-03-01',
      birthDatePrecision: 'day',
      wikidataId: 'Q111',
      wikipediaPage: 'Robert van den Berg',
      wikipediaPageId: 1,
    })

    await addPerson({
      birthDate: '1976-01-01',
      birthDatePrecision: 'year',
      wikidataId: 'Q222',
      wikipediaPage: 'Robert van der Berg',
      wikipediaPageId: 2,
    })

    const { merged, warnings } = await mergePersons(database.db, list)

    expect(merged).toEqual(["'Robert van der Berg' is merged into 'Robert van den Berg'"])
    expect(warnings).toEqual([
      "Persons: 'Robert van den Berg' and 'Robert van der Berg' are merged and have a different item on Wikidata (Q111 and Q222); the first stays, check which is right",
      "Persons: 'Robert van den Berg' and 'Robert van der Berg' are merged and have a different date of birth (1975-03-01 and 1976-01-01); the first stays, check which is right",
    ])
    expect(await personRows()).toMatchObject([
      {
        birthDate: '1975-03-01',
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
})
