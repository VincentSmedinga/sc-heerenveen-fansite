import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { listSeasonPlayers } from '@fansite/db/queries'
import {
  adminUsers,
  auditLog,
  matches,
  matchGoals,
  personPages,
  persons,
  players,
  playerSeasonStats,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { findMatch, saveEntry } from './match-entries'
import { emptyPlayerValues, type PlayerValues } from './player-fields'
import {
  addPlayer,
  editPlayer,
  findAdminPlayer,
  listAdminPlayers,
  listPlayerSeasons,
  type PlayerEntry,
  playerValuesOf,
  readPlayerValues,
  removePlayer,
  searchPersons,
  validatePlayer,
} from './players'

let database: TestDatabase
let userId: number
let matchId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const season = '2019/20'
const t0 = new Date('2026-11-10T12:00:00Z')

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
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

const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))
const allPlayers = () => database.db.select().from(players).orderBy(asc(players.id))
const allPersons = () => database.db.select().from(persons).orderBy(asc(persons.id))

const filled = (overrides: Partial<PlayerValues> = {}): PlayerValues => ({
  ...emptyPlayerValues,
  achternaam: 'Amersfoort',
  positie: 'middenvelder',
  rugnummer: '14',
  tussenvoegsel: 'van',
  voornaam: 'Pelle',
  ...overrides,
})

const entry = (overrides: Partial<PlayerEntry> = {}): PlayerEntry => ({
  name: { familyName: 'Amersfoort', familyNamePrefix: 'van', givenName: 'Pelle' },
  page: null,
  personId: null,
  position: 'middenvelder',
  shirtNumber: 14,
  ...overrides,
})

/** A person the importer made, with a name, and a player of him in another season. */
async function knownPerson(page = 'Pelle van Amersfoort', otherSeason = '2018/19') {
  const [{ insertId }] = await database.db.insert(persons).values({
    familyName: 'Amersfoort',
    familyNamePrefix: 'van',
    givenName: 'Pelle',
    name: 'Pelle van Amersfoort',
    nameSource: 'sort_key',
    wikipediaPage: page,
  })

  await database.db.insert(personPages).values({ page, personId: insertId })
  await database.db.insert(players).values({
    name: 'Pelle van Amersfoort',
    personId: insertId,
    searchTerm: 'van Amersfoort',
    season: otherSeason,
    wikipediaPage: page,
  })

  return insertId
}

describe('validatePlayer', () => {
  it('understands a new person, with an empty number, line and title as none', () => {
    expect(validatePlayer(filled({ positie: '', rugnummer: '', wikipedia: 'Pelle_van_Amersfoort' }), 'add')).toEqual({
      entry: entry({ page: 'Pelle van Amersfoort', position: null, shirtNumber: null }),
    })
    expect(validatePlayer(filled({ tussenvoegsel: '', voornaam: '' }), 'edit').entry?.name).toEqual({
      familyName: 'Amersfoort',
      familyNamePrefix: null,
      givenName: null,
    })
  })

  it('gives each field that is wrong its own error', () => {
    const { errors } = validatePlayer(
      filled({
        achternaam: '',
        positie: 'spits',
        rugnummer: '100',
        tussenvoegsel: 'x'.repeat(31),
        voornaam: 'x'.repeat(101),
        wikipedia: 'https://nl.wikipedia.org/wiki/Pelle_van_Amersfoort',
      }),
      'add',
    )

    expect(Object.keys(errors ?? {}).sort()).toEqual([
      'achternaam',
      'positie',
      'rugnummer',
      'tussenvoegsel',
      'voornaam',
      'wikipedia',
    ])
    expect(errors?.rugnummer).toBe('Vul een getal van 1 tot en met 99 in, of laat het veld leeg.')
    expect(errors?.wikipedia).toContain('niet het adres')

    for (const rugnummer of ['0', '1,5', '-3', 'tien', '007']) {
      expect(validatePlayer(filled({ rugnummer }), 'add').errors?.rugnummer).toBeDefined()
    }

    expect(validatePlayer(filled({ wikipedia: 'Pelle [[van]] Amersfoort' }), 'add').errors?.wikipedia).toBeDefined()
    expect(validatePlayer(filled({ wikipedia: 'x'.repeat(256) }), 'add').errors?.wikipedia).toBeDefined()
    expect(validatePlayer(filled({ achternaam: 'x'.repeat(95) }), 'add').errors?.achternaam).toContain('100 tekens')
  })

  it('takes a person from the list, and wants the fields of a new person empty then', () => {
    const empty = { achternaam: '', tussenvoegsel: '', voornaam: '' }

    expect(validatePlayer(filled({ ...empty, persoon: '12' }), 'add')).toEqual({
      entry: entry({ name: null, personId: 12 }),
    })
    expect(
      Object.keys(validatePlayer(filled({ persoon: '12', wikipedia: 'Iemand' }), 'add').errors ?? {}).sort(),
    ).toEqual(['achternaam', 'tussenvoegsel', 'voornaam', 'wikipedia'])
    expect(validatePlayer(filled({ ...empty, persoon: 'twaalf' }), 'add').errors?.persoon).toBeDefined()
    // The form that changes a player has no list: a value for it means nothing.
    expect(validatePlayer(filled({ persoon: '12' }), 'edit').entry?.personId).toBeNull()
  })

  it('reads the request as text, with a new person when the form has no list', () => {
    const formData = new FormData()

    formData.set('achternaam', '  van   Amersfoort ')
    formData.set('rugnummer', new File([], 'x'))

    expect(readPlayerValues(formData)).toEqual({ ...emptyPlayerValues, achternaam: 'van Amersfoort' })
  })
})

describe('addPlayer', () => {
  it('adds a player with a new person without a title, with the source redactie, and writes the log', async () => {
    const outcome = await addPlayer(database.db, userId, season, entry(), t0)
    const [person] = await allPersons()

    expect(outcome).toMatchObject({ status: 'added' })
    expect(person).toMatchObject({
      familyName: 'Amersfoort',
      familyNamePrefix: 'van',
      givenName: 'Pelle',
      name: 'Pelle van Amersfoort',
      nameSource: 'redactie',
      wikipediaPage: null,
    })
    expect(await allPlayers()).toMatchObject([
      {
        inSquad: true,
        name: 'Pelle van Amersfoort',
        personId: person?.id,
        position: 'middenvelder',
        searchTerm: 'van Amersfoort',
        season,
        shirtNumber: 14,
        source: 'redactie',
        wikipediaPage: null,
      },
    ])
    expect(await log()).toMatchObject([
      {
        action: 'player.add',
        createdAt: t0,
        detail: `Toegevoegd: Pelle van Amersfoort, 2019/20, rugnummer: 14, positie: middenvelder, Wikipedia: geen, persoon ${person?.id} (nieuw)`,
        itemId: 'id' in outcome ? outcome.id : 0,
        userId,
      },
    ])
  })

  it('adds a player with a person we know: the same person, with his name and title', async () => {
    const personId = await knownPerson()
    const outcome = await addPlayer(database.db, userId, season, entry({ name: null, personId }), t0)

    expect(outcome).toMatchObject({ status: 'added' })
    expect(await allPersons()).toHaveLength(1)
    expect((await allPersons())[0]).toMatchObject({ nameSource: 'sort_key' })
    expect((await allPlayers()).at(-1)).toMatchObject({
      name: 'Pelle van Amersfoort',
      personId,
      searchTerm: 'van Amersfoort',
      season,
      source: 'redactie',
      wikipediaPage: 'Pelle van Amersfoort',
    })
    expect((await log())[0]?.detail).toContain(`persoon ${personId}`)
    expect((await log())[0]?.detail).not.toContain('nieuw')
  })

  it('makes no second person for a title that belongs to a person: the player becomes that person', async () => {
    const personId = await knownPerson()
    const outcome = await addPlayer(
      database.db,
      userId,
      season,
      entry({
        name: { familyName: 'Amersfoord', familyNamePrefix: null, givenName: 'P.' },
        page: 'Pelle van Amersfoort',
      }),
    )

    expect(outcome).toMatchObject({ status: 'added' })
    expect(await allPersons()).toHaveLength(1)
    expect((await allPlayers()).at(-1)).toMatchObject({ name: 'Pelle van Amersfoort', personId, season })
  })

  it('makes a person for a new title, and remembers the title', async () => {
    await addPlayer(database.db, userId, season, entry({ page: 'Pelle van Amersfoort' }))

    const [person] = await allPersons()

    expect(person).toMatchObject({ nameSource: 'redactie', wikipediaPage: 'Pelle van Amersfoort' })
    expect(await database.db.select().from(personPages)).toEqual([
      { page: 'Pelle van Amersfoort', personId: person?.id },
    ])
    expect((await allPlayers())[0]).toMatchObject({ wikipediaPage: 'Pelle van Amersfoort' })
  })

  it('refuses a name the season already has, with a sentence at the name, and keeps no person', async () => {
    await database.db.insert(players).values({ name: 'Pelle van Amersfoort', searchTerm: 'van Amersfoort', season })

    expect(await addPlayer(database.db, userId, season, entry())).toEqual({
      errors: {
        achternaam:
          'Het seizoen 2019/20 heeft al een speler met de naam Pelle van Amersfoort. Pas die speler aan, of geef deze een andere naam.',
      },
      status: 'refused',
    })
    expect(await allPersons()).toEqual([])
    expect(await allPlayers()).toHaveLength(1)
    expect(await log()).toEqual([])
  })

  it('refuses a title the season already has, with a sentence at the title', async () => {
    await database.db.insert(players).values({
      name: 'P. van Amersfoort',
      searchTerm: 'van Amersfoort',
      season,
      wikipediaPage: 'Pelle van Amersfoort',
    })

    expect(await addPlayer(database.db, userId, season, entry({ page: 'Pelle van Amersfoort' }))).toEqual({
      errors: {
        wikipedia:
          'Het seizoen 2019/20 heeft al een speler met deze Wikipedia-pagina: P. van Amersfoort. Pas die speler aan.',
      },
      status: 'refused',
    })
    expect(await allPersons()).toEqual([])
  })

  it('refuses a person who is in the season already, and a person who is gone, at the list', async () => {
    const personId = await knownPerson('Pelle van Amersfoort', season)

    expect(await addPlayer(database.db, userId, season, entry({ name: null, personId }))).toEqual({
      errors: {
        persoon: 'Deze persoon staat al in het seizoen 2019/20, als Pelle van Amersfoort. Pas die speler aan.',
      },
      status: 'refused',
    })
    expect(await addPlayer(database.db, userId, season, entry({ name: null, personId: personId + 100 }))).toMatchObject(
      {
        errors: { persoon: expect.stringContaining('bestaat niet meer') },
        status: 'refused',
      },
    )
  })

  it('puts the player in the list of a goal of his season and on the page Spelers, as redactie', async () => {
    const outcome = await addPlayer(database.db, userId, season, entry())
    const id = 'id' in outcome ? outcome.id : 0

    expect((await findMatch(database.db, matchId))?.squad).toEqual([
      { id, name: 'Pelle van Amersfoort', personId: (await allPersons())[0]?.id, wikipediaPage: null },
    ])
    expect(await listSeasonPlayers(database.db, season)).toMatchObject([
      {
        name: 'Pelle van Amersfoort',
        personFamilyName: 'Amersfoort',
        personFamilyNamePrefix: 'van',
        personGivenName: 'Pelle',
        position: 'middenvelder',
        shirtNumber: 14,
        source: 'redactie',
      },
    ])
    expect(await listAdminPlayers(database.db, season)).toMatchObject([{ id, inSquad: true, source: 'redactie' }])
  })
})

describe('a goal of a player the editors added', () => {
  const entryWith = (goals: Parameters<typeof saveEntry>[3]['goals']): Parameters<typeof saveEntry>[3] => ({
    facts: { attendance: null, note: null, referee: null, stadium: null },
    goals,
    kickoff: { dateText: null, kickoffAt: new Date('2019-09-01T12:30:00Z'), matchDate: '2019-09-01' },
    result: {
      afterNinetyAgainst: null,
      afterNinetyFor: null,
      extraTime: false,
      goalsAgainst: 0,
      goalsFor: 1,
      penaltiesAgainst: null,
      penaltiesFor: null,
      status: 'played',
    },
  })

  it('counts for his person, though he has no page, and keeps the person when the match is saved again', async () => {
    await addPlayer(database.db, userId, season, entry())

    const [chosen] = (await findMatch(database.db, matchId))?.squad ?? []
    const [person] = await allPersons()
    const goal = {
      minute: 12,
      ours: true,
      ownGoal: false,
      penalty: false,
      player: chosen?.name ?? '',
      playerId: chosen?.id ?? null,
      stoppageMinutes: null,
      wikipediaPage: null,
    }

    expect(chosen?.personId).toBe(person?.id)

    // The form gives the goal the person of the chosen player (`validate` in match-form.ts).
    await saveEntry(database.db, userId, matchId, entryWith([{ ...goal, personId: chosen?.personId ?? null }]), 'Krant')

    expect(await database.db.select().from(matchGoals)).toMatchObject([{ personId: person?.id, playerId: chosen?.id }])

    // A goal that was stored without a person gets the person of its player at the next save.
    await database.db.update(matchGoals).set({ personId: null })
    await saveEntry(
      database.db,
      userId,
      matchId,
      entryWith([
        { ...goal, personId: chosen?.personId ?? null },
        { ...goal, minute: 80, personId: chosen?.personId ?? null },
      ]),
      'Krant',
    )

    expect((await database.db.select().from(matchGoals)).map((row) => row.personId)).toEqual([person?.id, person?.id])
  })
})

describe('editPlayer', () => {
  const added = async (overrides: Partial<PlayerEntry> = {}) => {
    const outcome = await addPlayer(database.db, userId, season, entry(overrides), t0)

    await database.pool.query('DELETE FROM audit_log')

    return 'id' in outcome ? outcome.id : 0
  }

  it('changes the number and the line, and writes what changed', async () => {
    const id = await added()

    expect(await editPlayer(database.db, userId, id, entry({ position: 'aanvaller', shirtNumber: null }), t0)).toEqual({
      status: 'changed',
    })
    expect((await allPlayers())[0]).toMatchObject({ position: 'aanvaller', shirtNumber: null, source: 'redactie' })
    expect(await log()).toMatchObject([
      {
        action: 'player.edit',
        detail: 'Aangepast: Pelle van Amersfoort, 2019/20. rugnummer: 14 → geen; positie: middenvelder → aanvaller',
        itemId: id,
        userId,
      },
    ])
  })

  it('writes nothing for a save that changes nothing', async () => {
    const id = await added()

    expect(await editPlayer(database.db, userId, id, entry())).toEqual({ status: 'unchanged' })
    expect(await log()).toEqual([])
    expect(await editPlayer(database.db, userId, id + 100, entry())).toEqual({ status: 'missing' })
  })

  it('gives a new name to the row and to the person, with the source redactie, and keeps the source of the row', async () => {
    const personId = await knownPerson('Pelle van Amersfoort', season)
    const [player] = await allPlayers()

    await editPlayer(
      database.db,
      userId,
      player?.id ?? 0,
      entry({
        name: { familyName: 'Amersfoort', familyNamePrefix: 'van', givenName: 'Pelle Jan' },
        page: 'Pelle van Amersfoort',
        position: null,
        shirtNumber: null,
      }),
    )

    expect((await allPlayers())[0]).toMatchObject({
      name: 'Pelle Jan van Amersfoort',
      personId,
      searchTerm: 'van Amersfoort',
      source: 'selectie',
    })
    expect((await allPersons())[0]).toMatchObject({
      givenName: 'Pelle Jan',
      name: 'Pelle Jan van Amersfoort',
      nameSource: 'redactie',
    })
    expect((await log())[0]?.detail).toBe(
      'Aangepast: Pelle van Amersfoort, 2019/20. naam: Pelle van Amersfoort → Pelle Jan van Amersfoort',
    )
  })

  it('refuses the name or the title of another player of the season', async () => {
    const id = await added()

    await database.db
      .insert(players)
      .values({ name: 'Luca Oyen', searchTerm: 'Oyen', season, wikipediaPage: 'Luca Oyen' })

    expect(
      await editPlayer(
        database.db,
        userId,
        id,
        entry({ name: { familyName: 'Oyen', familyNamePrefix: null, givenName: 'Luca' } }),
      ),
    ).toMatchObject({ errors: { achternaam: expect.stringContaining('Luca Oyen') }, status: 'refused' })
    expect(await editPlayer(database.db, userId, id, entry({ page: 'Luca Oyen' }))).toMatchObject({
      errors: { wikipedia: expect.stringContaining('Luca Oyen') },
      status: 'refused',
    })
    expect((await allPlayers())[0]).toMatchObject({ name: 'Pelle van Amersfoort', wikipediaPage: null })
    expect((await allPersons())[0]).toMatchObject({ wikipediaPage: null })
    expect(await log()).toEqual([])
  })

  it('gives a person without a title the title of his article', async () => {
    const id = await added()

    expect(await editPlayer(database.db, userId, id, entry({ page: 'Pelle van Amersfoort' }))).toEqual({
      status: 'changed',
    })

    const [person] = await allPersons()

    expect(await allPersons()).toHaveLength(1)
    expect(person).toMatchObject({ wikipediaPage: 'Pelle van Amersfoort' })
    expect(await database.db.select().from(personPages)).toEqual([
      { page: 'Pelle van Amersfoort', personId: person?.id },
    ])
    expect((await allPlayers())[0]).toMatchObject({ personId: person?.id, wikipediaPage: 'Pelle van Amersfoort' })
  })

  it('refuses a title of another person, and another title for a person who has one', async () => {
    await knownPerson('Pelle van Amersfoort', '2018/19')

    const id = await added({ name: { familyName: 'Vos', familyNamePrefix: null, givenName: 'Jan' } })
    const jan = { familyName: 'Vos', familyNamePrefix: null, givenName: 'Jan' }

    expect(await editPlayer(database.db, userId, id, entry({ name: jan, page: 'Pelle van Amersfoort' }))).toEqual({
      errors: {
        wikipedia:
          'Deze pagina hoort bij een andere persoon: Pelle van Amersfoort. Twee personen samenvoegen kan hier niet.',
      },
      status: 'refused',
    })

    await editPlayer(database.db, userId, id, entry({ name: jan, page: 'Jan Vos' }))

    expect(await editPlayer(database.db, userId, id, entry({ name: jan, page: 'Jan Vos (1990)' }))).toEqual({
      errors: {
        wikipedia: 'Deze persoon heeft al een Wikipedia-pagina: Jan Vos. Een andere pagina geven kan hier niet.',
      },
      status: 'refused',
    })
    expect(await allPersons()).toHaveLength(2)
  })

  it('gives a player without a person the person of the title, and his goals too', async () => {
    const personId = await knownPerson('Pelle van Amersfoort', '2018/19')
    const [{ insertId: id }] = await database.db
      .insert(players)
      .values({ name: 'P. van Amersfoort', searchTerm: 'van Amersfoort', season, source: 'verslag' })

    await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 12, ours: true, player: 'Van Amersfoort', playerId: id })

    expect(
      await editPlayer(
        database.db,
        userId,
        id,
        entry({
          name: { familyName: 'Amersfoort', familyNamePrefix: 'van', givenName: 'P.' },
          page: 'Pelle van Amersfoort',
          position: null,
          shirtNumber: null,
        }),
      ),
    ).toEqual({ status: 'changed' })
    expect(await database.db.select().from(players).where(eq(players.id, id))).toMatchObject([
      { name: 'P. van Amersfoort', personId, source: 'verslag', wikipediaPage: 'Pelle van Amersfoort' },
    ])
    expect(await database.db.select().from(matchGoals)).toMatchObject([{ personId, playerId: id }])
    // The person keeps the name he had: the editor did not change the name of the row.
    expect((await allPersons())[0]).toMatchObject({ name: 'Pelle van Amersfoort', nameSource: 'sort_key' })
    expect((await log())[0]?.detail).toContain(`persoon: geen → ${personId}`)
  })

  it('leaves a player without a person without one while he has no title', async () => {
    const [{ insertId: id }] = await database.db
      .insert(players)
      .values({ name: 'Jan Willem van der Vos', searchTerm: 'van der Vos', season, source: 'verslag' })
    const found = await findAdminPlayer(database.db, id)

    expect(found === undefined ? undefined : playerValuesOf(found)).toMatchObject({
      achternaam: 'Vos',
      tussenvoegsel: 'van der',
      voornaam: 'Jan Willem',
    })

    await editPlayer(
      database.db,
      userId,
      id,
      entry({ name: { familyName: 'Vos', familyNamePrefix: 'van der', givenName: 'Jan Willem' }, shirtNumber: 3 }),
    )

    expect(await allPersons()).toEqual([])
    expect((await allPlayers())[0]).toMatchObject({ name: 'Jan Willem van der Vos', personId: null, shirtNumber: 3 })
  })
})

describe('removePlayer', () => {
  it('takes a player out of the squad with the moment, keeps the row, and writes the log', async () => {
    const outcome = await addPlayer(database.db, userId, season, entry(), t0)
    const id = 'id' in outcome ? outcome.id : 0
    const later = new Date('2026-11-10T13:00:00Z')

    expect(await removePlayer(database.db, userId, id, later)).toBe('done')
    expect(await allPlayers()).toMatchObject([{ id, inSquad: false, leftSquadAt: later }])
    expect((await log()).at(-1)).toMatchObject({
      action: 'player.remove',
      detail: 'Uit de selectie gehaald: Pelle van Amersfoort, 2019/20',
      itemId: id,
      userId,
    })
    expect(await removePlayer(database.db, userId, id)).toBe('unchanged')
    expect(await removePlayer(database.db, userId, id + 100)).toBe('missing')
    expect(await log()).toHaveLength(2)
  })

  it('keeps a player with a goal or with matches in the table, and says so', async () => {
    const scorer = await addPlayer(database.db, userId, season, entry())
    const counted = await addPlayer(
      database.db,
      userId,
      season,
      entry({ name: { familyName: 'Vos', familyNamePrefix: null, givenName: 'Jan' } }),
    )
    const scorerId = 'id' in scorer ? scorer.id : 0
    const countedId = 'id' in counted ? counted.id : 0

    await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 12, ours: true, player: 'Van Amersfoort', playerId: scorerId })
    await database.db
      .insert(playerSeasonStats)
      .values({ appearances: 3, assists: 0, competition: 'Eredivisie', goals: 0, playerId: countedId, season })

    expect(await removePlayer(database.db, userId, scorerId)).toBe('in-use')
    expect(await removePlayer(database.db, userId, countedId)).toBe('in-use')
    expect(await findAdminPlayer(database.db, scorerId)).toMatchObject({ appearances: 0, goals: 1 })
    expect(await findAdminPlayer(database.db, countedId)).toMatchObject({ appearances: 1, goals: 0 })
    expect((await allPlayers()).map((player) => player.inSquad)).toEqual([true, true])
  })
})

describe('the lists', () => {
  it('finds persons by a part of the name or the title, whatever the capitals and accents', async () => {
    const personId = await knownPerson()

    await database.db
      .insert(persons)
      .values([{ name: 'José Rodríguez', wikipediaPage: 'José Rodríguez' }, { wikipediaPage: 'Johnny Jansen (1975)' }])
    await addPlayer(
      database.db,
      userId,
      season,
      entry({ name: { familyName: 'Amersfoort', familyNamePrefix: null, givenName: 'Piet' } }),
    )

    expect(await searchPersons(database.db, '')).toEqual([])
    expect(await searchPersons(database.db, 'niemand')).toEqual([])
    expect(await searchPersons(database.db, 'AMERSFOORT pelle')).toEqual([
      { id: personId, label: 'Pelle van Amersfoort (2018/19)' },
    ])
    expect((await searchPersons(database.db, 'amersfoort')).map((person) => person.label)).toEqual([
      'Pelle van Amersfoort (2018/19)',
      'Piet Amersfoort (2019/20, geen Wikipedia-pagina)',
    ])
    expect((await searchPersons(database.db, 'jose rodriguez')).map((person) => person.label)).toEqual([
      'José Rodríguez (nog in geen seizoen)',
    ])
    expect((await searchPersons(database.db, 'jansen')).map((person) => person.label)).toEqual([
      'Johnny Jansen (1975) (nog in geen seizoen)',
    ])
  })

  it('lists the current season and every earlier season with a match, the newest first', async () => {
    expect(await listPlayerSeasons(database.db, new Date('2026-11-10T12:00:00Z'))).toEqual(['2026/27', '2019/20'])
  })

  it('lists the players of a season by number, those without one last', async () => {
    await database.db.insert(players).values([
      { name: 'Zonder Nummer', searchTerm: 'Nummer', season },
      { name: 'Luca Oyen', searchTerm: 'Oyen', season, shirtNumber: 7 },
      { name: 'Ander Seizoen', searchTerm: 'Seizoen', season: '2018/19', shirtNumber: 1 },
    ])

    expect((await listAdminPlayers(database.db, season)).map((player) => player.name)).toEqual([
      'Luca Oyen',
      'Zonder Nummer',
    ])
  })
})
