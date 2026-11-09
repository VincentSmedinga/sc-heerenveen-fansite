import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { listEditorSources } from '@fansite/db/queries'
import { adminUsers, auditLog, clubs, matches, matchGoals, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { emptyAddValues } from './match-add-fields'
import {
  type AddEntry,
  addMatch,
  deleteAddedMatch,
  listClubChoices,
  readAddValues,
  validateAdd,
} from './match-additions'

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM clubs')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const t0 = new Date('2026-11-09T12:00:00Z')
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))

const choices = [{ id: 7, name: 'FC Groningen' }]

/** A complete form for a cup match of 2008/09 against FC Groningen. */
const filled = (overrides: Partial<typeof emptyAddValues> = {}) => ({
  ...emptyAddValues,
  'aftrap-datum': '2009-05-12',
  bron: 'Leeuwarder Courant, 12 mei 2009',
  competitie: 'KNVB Beker',
  ronde: 'Finale',
  seizoen: '2008/09',
  status: 'played',
  tegenstander: '7',
  thuis: 'uit',
  'uitslag-wij': '2',
  'uitslag-zij': '1',
  ...overrides,
})

const entry = (overrides: Partial<AddEntry> = {}): AddEntry => ({
  club: { name: 'FC Groningen' },
  competition: 'KNVB Beker',
  home: false,
  kickoff: { dateText: null, kickoffAt: null, matchDate: '2009-05-12' },
  result: {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    extraTime: false,
    goalsAgainst: 1,
    goalsFor: 2,
    penaltiesAgainst: null,
    penaltiesFor: null,
    status: 'played',
  },
  round: 'Finale',
  season: '2008/09',
  sourceLine: 'Leeuwarder Courant, 12 mei 2009',
  ...overrides,
})

describe('validateAdd', () => {
  it('understands a played match without a time: the day alone is fine', () => {
    const checked = validateAdd(filled(), choices)

    expect(checked.errors).toBeUndefined()
    expect(checked.entry).toMatchObject({
      club: { id: 7 },
      competition: 'KNVB Beker',
      home: false,
      kickoff: { dateText: null, kickoffAt: null, matchDate: '2009-05-12' },
      result: { goalsAgainst: 1, goalsFor: 2, status: 'played' },
      round: 'Finale',
      season: '2008/09',
      sourceLine: 'Leeuwarder Courant, 12 mei 2009',
    })
  })

  it('takes a new club by its name', () => {
    expect(validateAdd(filled({ 'nieuwe-club': 'Be Quick 1887', tegenstander: 'nieuw' }), choices).entry?.club).toEqual(
      {
        name: 'Be Quick 1887',
      },
    )
  })

  it('has an error at each field that is empty or wrong, and none without a field', () => {
    const checked = validateAdd(
      {
        ...emptyAddValues,
        bron: '',
        competitie: 'Zaalvoetbal',
        seizoen: '2008-09',
        status: 'played',
        tegenstander: 'nieuw',
        thuis: '',
      },
      choices,
    )

    expect(Object.keys(checked.errors ?? {}).sort()).toEqual([
      'aftrap-datum',
      'bron',
      'competitie',
      'nieuwe-club',
      'ronde',
      'seizoen',
      'thuis',
      'uitslag-wij',
      'uitslag-zij',
    ])
    expect(checked.errors?.bron).toContain('Leeuwarder Courant')
  })

  it('refuses a source line that is too long, a club that is not in the list, and a day outside the season', () => {
    const checked = validateAdd(
      filled({ 'aftrap-datum': '2009-08-01', bron: 'x'.repeat(256), tegenstander: '99' }),
      choices,
    )

    expect(checked.errors).toMatchObject({
      'aftrap-datum': expect.stringContaining('niet in het seizoen 2008/09'),
      bron: 'Schrijf hoogstens 255 tekens.',
      tegenstander: expect.stringContaining('Kies de tegenstander'),
    })
  })

  it('reads the form of a request, trimmed, and an empty string for what is missing', () => {
    const formData = new FormData()

    formData.set('ronde', '  Finale ')

    expect(readAddValues(formData)).toMatchObject({ bron: '', ronde: 'Finale' })
  })
})

describe('addMatch', () => {
  it('adds a match from the editors with its source, its club and one line in the log', async () => {
    const outcome = await addMatch(database.db, userId, entry(), t0)

    expect(outcome.status).toBe('added')

    const [row] = await database.db.select().from(matches)

    expect(row).toMatchObject({
      competition: 'KNVB Beker',
      dataSource: 'redactie',
      goalsAgainst: 1,
      goalsFor: 2,
      home: false,
      kickoffAt: null,
      opponent: 'FC Groningen',
      resultSetAt: t0,
      round: 'Finale',
      season: '2008/09',
      sourceLine: 'Leeuwarder Courant, 12 mei 2009',
      status: 'played',
    })
    expect(await database.db.select().from(clubs)).toHaveLength(1)
    expect(await log()).toMatchObject([
      {
        action: 'match.add',
        createdAt: t0,
        itemId: row?.id,
        reason: 'Leeuwarder Courant, 12 mei 2009',
        userId,
      },
    ])
    expect((await log())[0]?.detail).toContain('Toegevoegd: 2008/09 KNVB Beker Finale: FC Groningen - sc Heerenveen')
  })

  it('uses a club that exists, by its number', async () => {
    await addMatch(database.db, userId, entry(), t0)

    const [club] = await listClubChoices(database.db)

    await addMatch(
      database.db,
      userId,
      entry({
        club: { id: club!.id },
        kickoff: { dateText: null, kickoffAt: null, matchDate: '2009-03-01' },
        round: 'Halve finale',
      }),
      t0,
    )

    expect(await database.db.select().from(clubs)).toHaveLength(1)
    expect(await database.db.select().from(matches)).toHaveLength(2)
  })

  it('refuses a match that is there already on the season, the competition, the club and the day, whatever its source', async () => {
    const [existing] = await withClubs(database.db, [
      {
        competition: 'KNVB Beker',
        dataSource: 'wikipedia',
        home: false,
        kickoffAt: new Date('2009-05-12T18:00:00Z'),
        matchDate: '2009-05-12',
        opponent: 'FC Groningen',
        round: 'Eindstrijd',
        season: '2008/09',
        status: 'scheduled',
      } satisfies Omit<NewMatch, 'clubId'>,
    ])

    await database.db.insert(matches).values(existing!)

    // The day after counts as the same match: the function of issue 968 has a day of slack.
    const outcome = await addMatch(
      database.db,
      userId,
      entry({ club: { id: existing!.clubId }, kickoff: { dateText: null, kickoffAt: null, matchDate: '2009-05-13' } }),
      t0,
    )

    expect(outcome).toMatchObject({
      errors: { 'aftrap-datum': expect.stringContaining('staat er al: Eindstrijd') },
      status: 'refused',
    })
    expect(await database.db.select().from(matches)).toHaveLength(1)
    expect(await log()).toEqual([])
  })

  it('refuses a round that is taken in the season and the competition', async () => {
    await addMatch(database.db, userId, entry(), t0)

    const outcome = await addMatch(
      database.db,
      userId,
      entry({
        club: { name: 'Ajax' },
        kickoff: { dateText: null, kickoffAt: null, matchDate: '2009-05-02' },
      }),
      t0,
    )

    expect(outcome).toMatchObject({ errors: { ronde: expect.stringContaining('al een wedstrijd') }, status: 'refused' })
    expect(await database.db.select().from(matches)).toHaveLength(1)
  })

  it('stores nothing, not even the club, when the match is refused', async () => {
    await addMatch(database.db, userId, entry(), t0)
    await addMatch(database.db, userId, entry({ club: { name: 'Nieuwe Club' } }), t0)

    expect((await database.db.select().from(clubs)).map((club) => club.name)).toEqual(['FC Groningen'])
  })
})

describe('deleteAddedMatch', () => {
  it('deletes a match the editors added, with its goals, and writes one line in the log', async () => {
    const outcome = await addMatch(database.db, userId, entry(), t0)
    const id = outcome.status === 'added' ? outcome.id : 0

    await database.db
      .insert(matchGoals)
      .values({ matchId: id, minute: 12, ours: true, player: 'Oyen', stoppageMinutes: null })

    expect(await deleteAddedMatch(database.db, userId, id, 'Dubbel', t0)).toBe('done')
    expect(await database.db.select().from(matches)).toEqual([])
    expect(await database.db.select().from(matchGoals)).toEqual([])
    expect((await log())[1]).toMatchObject({ action: 'match.delete', itemId: id, reason: 'Dubbel' })
    expect((await log())[1]?.detail).toContain('bron: Leeuwarder Courant, 12 mei 2009')
  })

  it('never deletes a match of an import, and says so', async () => {
    const [imported] = await withClubs(database.db, [
      {
        competition: 'Eredivisie',
        dataSource: 'wikipedia',
        home: true,
        kickoffAt: new Date('2026-10-31T17:45:00Z'),
        matchDate: '2026-10-31',
        opponent: 'N.E.C.',
        round: 'Speelronde 11',
        season: '2026/27',
        status: 'scheduled',
      },
    ])
    const [{ insertId }] = await database.db.insert(matches).values(imported!)

    expect(await deleteAddedMatch(database.db, userId, insertId, 'Waarom', t0)).toBe('not-ours')
    expect(await deleteAddedMatch(database.db, userId, 99_999, 'Waarom', t0)).toBe('missing')
    expect(await database.db.select().from(matches)).toHaveLength(1)
    expect(await log()).toEqual([])
  })
})

describe('listEditorSources', () => {
  it('lists the matches of a season that the editors added, with the source, and no others', async () => {
    await addMatch(database.db, userId, entry(), t0)
    await database.db.insert(matches).values({
      ...(await database.db.select().from(matches).where(eq(matches.round, 'Finale')))[0]!,
      dataSource: 'wikipedia',
      id: undefined,
      kickoffAt: new Date('2009-05-01T18:00:00Z'),
      round: 'Halve finale',
      sourceLine: null,
    })

    expect(await listEditorSources(database.db, '2008/09')).toEqual([
      expect.objectContaining({
        opponent: 'FC Groningen',
        round: 'Finale',
        sourceLine: 'Leeuwarder Courant, 12 mei 2009',
      }),
    ])
    expect(await listEditorSources(database.db, '2009/10')).toEqual([])
  })
})
