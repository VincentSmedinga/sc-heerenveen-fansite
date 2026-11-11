import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { updatePlayerAddresses } from '@fansite/db/person-slugs'
import { listSeasonPlayers } from '@fansite/db/queries'
import {
  adminUsers,
  auditLog,
  matches,
  matchGoals,
  personPages,
  persons,
  personSlugs,
  players,
  playerSeasonStats,
  squadCompleteness,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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

// The real function, with a spy, so a test can make it fail once.
vi.mock('@fansite/db/person-slugs', async (importOriginal) => {
  const original = await importOriginal<{ updatePlayerAddresses: typeof updatePlayerAddresses }>()

  return { ...original, updatePlayerAddresses: vi.fn(original.updatePlayerAddresses) }
})

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
  await database.pool.query('DELETE FROM squad_completeness')
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
  country: null,
  line: null,
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

  it('understands the line and the country of the person, for a new person and for one from the list', () => {
    expect(validatePlayer(filled({ land: 'NL', linie: 'verdediger' }), 'edit').entry).toMatchObject({
      country: 'NL',
      line: 'verdediger',
      position: 'middenvelder',
    })
    expect(
      validatePlayer({ ...emptyPlayerValues, land: 'XK', linie: 'doelman', persoon: '7' }, 'add').entry,
    ).toMatchObject({ country: 'XK', line: 'doelman', name: null, personId: 7 })
    expect(validatePlayer(filled(), 'edit').entry).toMatchObject({ country: null, line: null })
  })

  it('gives each field that is wrong its own error', () => {
    const { errors } = validatePlayer(
      filled({
        achternaam: '',
        land: 'Nederland',
        linie: 'spits',
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
      'land',
      'linie',
      'positie',
      'rugnummer',
      'tussenvoegsel',
      'voornaam',
      'wikipedia',
    ])
    expect(errors?.rugnummer).toBe('Vul een getal van 1 tot en met 99 in, of laat het veld leeg.')
    expect(errors?.wikipedia).toContain('niet het adres')
    expect(errors?.linie).toBe('Kies een linie uit de lijst, of kies Onbekend.')
    expect(errors?.land).toBe('Kies een land uit de lijst, of kies Onbekend.')

    // A code is two capitals of the list: no small letters, and no country that is gone.
    for (const land of ['nl', 'YU', 'NLD', 'N']) {
      expect(validatePlayer(filled({ land }), 'edit').errors?.land).toBeDefined()
    }

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
        // The name and what the editor filled in are the editors' (#1022); the empty title
        // is not.
        editorsFields: ['name', 'shirt_number', 'position'],
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

  it('gives a new person the line and the country by hand, and leaves a person we know as he is for an empty one', async () => {
    await addPlayer(database.db, userId, season, entry({ country: 'SE', line: 'aanvaller' }), t0)

    expect((await allPersons())[0]).toMatchObject({
      country: 'SE',
      countrySource: 'manual',
      line: 'aanvaller',
      lineSource: 'manual',
    })
    expect((await log())[0]?.detail).toContain(
      '(nieuw), linie van de persoon: geen → aanvaller, land van de persoon: geen → SE',
    )

    // The same person in another season, with the fields left empty and then with a country.
    const personId = (await allPersons())[0]?.id ?? 0

    await addPlayer(database.db, userId, '2018/19', entry({ name: null, personId }), t0)

    expect((await allPersons())[0]).toMatchObject({ country: 'SE', line: 'aanvaller' })
    expect((await log())[1]?.detail).not.toContain('van de persoon')

    await addPlayer(database.db, userId, '2017/18', entry({ country: 'NO', name: null, personId }), t0)

    expect((await allPersons())[0]).toMatchObject({ country: 'NO', countrySource: 'manual', line: 'aanvaller' })
    expect((await log())[2]?.detail).toContain(', land van de persoon: SE → NO')
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

describe('the address of the page of a player (#1079)', () => {
  const slugs = async () =>
    (await database.db.select().from(personSlugs).orderBy(asc(personSlugs.slug))).map((row) => row.slug)

  it('gives a player the editors add the address of his name', async () => {
    await addPlayer(database.db, userId, season, entry(), t0)

    expect((await allPersons()).map((person) => person.slug)).toEqual(['pelle-van-amersfoort'])
    expect(await slugs()).toEqual(['pelle-van-amersfoort'])
  })

  it('gives a new name a new address, and keeps the old one', async () => {
    const outcome = await addPlayer(database.db, userId, season, entry(), t0)
    const id = 'id' in outcome ? outcome.id : 0

    await editPlayer(
      database.db,
      userId,
      id,
      entry({ name: { familyName: 'Amersfoort', familyNamePrefix: 'van', givenName: 'Pieter' } }),
      t0,
    )

    expect((await allPersons()).map((person) => person.slug)).toEqual(['pieter-van-amersfoort'])
    expect(await slugs()).toEqual(['pelle-van-amersfoort', 'pieter-van-amersfoort'])
  })

  it('keeps the player when the addresses cannot be updated, and says so in the log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.mocked(updatePlayerAddresses).mockRejectedValueOnce(new Error('connect ECONNREFUSED'))

    expect(await addPlayer(database.db, userId, season, entry(), t0)).toMatchObject({ status: 'added' })
    expect(await allPlayers()).toHaveLength(1)
    expect(warn).toHaveBeenCalledWith(
      'Could not update the addresses of the players after a change of a player',
      expect.any(Error),
    )
    warn.mockRestore()
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
    // A field the editor emptied is still the editors'.
    expect((await allPlayers())[0]?.editorsFields).toEqual(['name', 'shirt_number', 'position'])
    expect(await log()).toMatchObject([
      {
        action: 'player.edit',
        detail: 'Aangepast: Pelle van Amersfoort, 2019/20. rugnummer: 14 → geen; positie: middenvelder → aanvaller',
        itemId: id,
        userId,
      },
    ])
  })

  it('sets the line and the country of the person by hand, and writes them in the log (#1051)', async () => {
    const id = await added()
    const found = await findAdminPlayer(database.db, id)

    expect(found === undefined ? undefined : playerValuesOf(found)).toMatchObject({ land: '', linie: '' })
    expect(await editPlayer(database.db, userId, id, entry({ country: 'NL', line: 'verdediger' }), t0)).toEqual({
      status: 'changed',
    })
    expect((await allPersons())[0]).toMatchObject({
      country: 'NL',
      countrySource: 'manual',
      line: 'verdediger',
      lineSource: 'manual',
    })
    // The position of the season stays, and is not the editors' because of this.
    expect((await allPlayers())[0]).toMatchObject({
      editorsFields: ['name', 'shirt_number', 'position'],
      position: 'middenvelder',
    })
    expect(await log()).toMatchObject([
      {
        action: 'player.edit',
        detail:
          'Aangepast: Pelle van Amersfoort, 2019/20. linie van de persoon: geen → verdediger; land van de persoon: geen → NL',
        itemId: id,
      },
    ])

    const again = await findAdminPlayer(database.db, id)

    expect(again === undefined ? undefined : playerValuesOf(again)).toMatchObject({ land: 'NL', linie: 'verdediger' })
    // The same values again change nothing.
    expect(await editPlayer(database.db, userId, id, entry({ country: 'NL', line: 'verdediger' }), t0)).toEqual({
      status: 'unchanged',
    })
  })

  it('takes a line and a country away with their source, so the importer fills them in again', async () => {
    const id = await added({ country: 'NL', line: 'verdediger' })

    expect(await editPlayer(database.db, userId, id, entry({ country: 'NL' }), t0)).toEqual({ status: 'changed' })
    expect((await allPersons())[0]).toMatchObject({
      country: 'NL',
      countrySource: 'manual',
      line: null,
      lineSource: null,
    })
    expect((await log())[0]?.detail).toBe(
      'Aangepast: Pelle van Amersfoort, 2019/20. linie van de persoon: verdediger → geen',
    )

    await editPlayer(database.db, userId, id, entry(), t0)

    expect((await allPersons())[0]).toMatchObject({ country: null, countrySource: null })
  })

  it('leaves the source of a line and a country that the editor did not change', async () => {
    const id = await added()

    await database.pool.query(
      "UPDATE persons SET line = 'aanvaller', line_source = 'wikidata', country = 'BE', country_source = 'wikidata'",
    )

    // The form opens with what the person has, and the editor changes the number only.
    await editPlayer(database.db, userId, id, entry({ country: 'BE', line: 'aanvaller', shirtNumber: 9 }), t0)

    expect((await allPersons())[0]).toMatchObject({
      country: 'BE',
      countrySource: 'wikidata',
      line: 'aanvaller',
      lineSource: 'wikidata',
    })
    expect((await log())[0]?.detail).toBe('Aangepast: Pelle van Amersfoort, 2019/20. rugnummer: 14 → 9')
  })

  it('leaves the line and the country of a person the player gets in the same save', async () => {
    const personId = await knownPerson('Jan Vos', '2018/19')

    await database.pool.query("UPDATE persons SET line = 'doelman', line_source = 'wikidata' WHERE id = ?", [personId])

    const [{ insertId: id }] = await database.db
      .insert(players)
      .values({ name: 'Jan Vos', searchTerm: 'Vos', season, source: 'verslag' })

    // The form of a player without a person has no line and no country, so both are empty.
    await editPlayer(
      database.db,
      userId,
      id,
      entry({ name: { familyName: 'Vos', familyNamePrefix: null, givenName: 'Jan' }, page: 'Jan Vos' }),
    )

    expect((await allPlayers()).find((player) => player.id === id)?.personId).toBe(personId)
    expect((await allPersons())[0]).toMatchObject({ line: 'doelman', lineSource: 'wikidata' })
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
      // Only what the editor changed is the editors' (#1022): the importer keeps the rest.
      editorsFields: ['name'],
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

    const [pelle] = await allPersons()
    const own = (await allPlayers()).find((row) => row.id === id)?.personId

    // The refusal names the two persons, so the form can lead to the page that merges them.
    expect(await editPlayer(database.db, userId, id, entry({ name: jan, page: 'Pelle van Amersfoort' }))).toEqual({
      errors: {
        wikipedia:
          'Deze pagina hoort bij een andere persoon: Pelle van Amersfoort. Is dat dezelfde persoon? Voeg de twee dan samen met de link onder dit veld.',
      },
      merge: { label: 'Voeg Jan Vos samen met Pelle van Amersfoort', personId: own, withId: pelle?.id },
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

describe('the completeness of the season (#1040)', () => {
  const rows = () => database.db.select().from(squadCompleteness)

  it('gets a row when a player is added, and is worked out again after a second player and a removal', async () => {
    expect(await rows()).toEqual([])

    const outcome = await addPlayer(database.db, userId, season, entry(), t0)
    const id = 'id' in outcome ? outcome.id : 0

    expect(await rows()).toMatchObject([{ bestSource: 'redactie', playerCount: 1, season }])
    expect((await rows())[0]?.level).not.toBe('onbekend')

    await addPlayer(
      database.db,
      userId,
      season,
      entry({ name: { familyName: 'Tweede', familyNamePrefix: null, givenName: 'Piet' } }),
      t0,
    )
    expect(await rows()).toMatchObject([{ playerCount: 2 }])

    expect(await removePlayer(database.db, userId, id, t0)).toBe('done')
    // The row of the player stays in the table, so the list keeps its two players.
    expect(await rows()).toMatchObject([{ playerCount: 2, season }])
  })

  it('leaves the change of the player standing and logs a warning when the calculation fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await database.pool.query('RENAME TABLE squad_completeness TO squad_completeness_away')

    try {
      expect(await addPlayer(database.db, userId, season, entry(), t0)).toMatchObject({ status: 'added' })
      expect(await allPlayers()).toHaveLength(1)
      expect(warn).toHaveBeenCalledOnce()
    } finally {
      await database.pool.query('RENAME TABLE squad_completeness_away TO squad_completeness')
      warn.mockRestore()
    }
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
