import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { clearParts, markedParts } from '@fansite/db/match-edits'
import {
  adminUsers,
  auditLog,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  type NewMatch,
  persons,
  players,
  wikipediaPages,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { MatchEntry } from './match-form'

import { createAccount } from './accounts'
import {
  countHeldChanges,
  countMatchesWithoutResult,
  countWaitingDifferences,
  decideHeldChange,
  findHeldChange,
  findMatch,
  listAdminMatches,
  saveEntry,
  undoEntry,
} from './match-entries'

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
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const t0 = new Date('2026-11-01T12:00:00Z')
const t1 = new Date('2026-11-01T13:00:00Z')

const scheduled: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  home: true,
  kickoffAt: new Date('2026-10-31T17:45:00Z'),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season: '2026/27',
  status: 'scheduled',
}

/** A match, or a match with these values. Returns its number. */
async function addMatch(overrides: Partial<Omit<NewMatch, 'clubId'>> = {}) {
  const [values] = await withClubs(database.db, [{ ...scheduled, ...overrides }])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  return inserted?.id ?? 0
}

const entry = (overrides: Partial<MatchEntry> = {}): MatchEntry => ({
  facts: { attendance: null, note: null, referee: null, stadium: null },
  goals: [],
  kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T17:45:00Z'), matchDate: '2026-10-31' },
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
  ...overrides,
})

const goal = (overrides: Partial<MatchEntry['goals'][number]> = {}): MatchEntry['goals'][number] => ({
  minute: 12,
  ours: true,
  ownGoal: false,
  penalty: false,
  player: 'Oyen',
  playerId: null,
  stoppageMinutes: null,
  wikipediaPage: null,
  ...overrides,
})

const stored = async (id: number) => (await database.db.select().from(matches).where(eq(matches.id, id)))[0]
const goalsOf = (id: number) =>
  database.db.select().from(matchGoals).where(eq(matchGoals.matchId, id)).orderBy(asc(matchGoals.id))
const edit = async (id: number) => (await database.db.select().from(matchEdits).where(eq(matchEdits.matchId, id)))[0]
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))

describe('saveEntry', () => {
  it('stores the result and the goals in the tables, marks the parts and keeps the match as it was', async () => {
    const id = await addMatch()
    const goals = [goal({ minute: 12 }), goal({ minute: 40, ours: false, player: 'Sibbing' }), goal({ minute: 77 })]

    expect(await saveEntry(database.db, userId, id, entry({ goals }), 'Wikipedia is achter', t0)).toEqual({
      parts: ['result', 'goals'],
      status: 'saved',
    })
    expect(await stored(id)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, resultSetAt: t0, status: 'played' })
    expect((await goalsOf(id)).map((row) => [row.minute, row.player, row.ours])).toEqual([
      [12, 'Oyen', true],
      [40, 'Sibbing', false],
      [77, 'Oyen', true],
    ])

    const marker = await edit(id)

    expect(marker).toMatchObject({
      editedAt: t0,
      editedBy: userId,
      goalsEdited: true,
      kickoffEdited: false,
      reason: 'Wikipedia is achter',
      resultEdited: true,
    })
    expect(JSON.parse(marker?.beforeMatch ?? '')).toMatchObject({
      goalsFor: null,
      resultSetAt: null,
      status: 'scheduled',
    })
    expect(JSON.parse(marker?.beforeGoals ?? '')).toEqual([])
  })

  it('writes match.edit in the log with who, why and the values before and after, and nothing else', async () => {
    const id = await addMatch()

    await saveEntry(database.db, userId, id, entry(), 'Wikipedia is achter', t0)

    expect(await log()).toEqual([
      {
        action: 'match.edit',
        createdAt: t0,
        detail: 'Uitslag: gepland → sc Heerenveen 2–1 N.E.C.',
        id: expect.any(Number),
        itemId: id,
        reason: 'Wikipedia is achter',
        userId,
      },
    ])
  })

  it('marks the kick-off as a part of its own', async () => {
    const id = await addMatch()

    expect(
      await saveEntry(
        database.db,
        userId,
        id,
        entry({
          kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T18:00:00Z'), matchDate: '2026-10-31' },
          result: { ...entry().result, goalsAgainst: null, goalsFor: null, status: 'scheduled' },
        }),
        'De tijd is veranderd',
        t0,
      ),
    ).toEqual({ parts: ['kickoff'], status: 'saved' })
    expect(markedParts((await edit(id))!)).toEqual(['kickoff'])
    expect(await stored(id)).toMatchObject({ kickoffAt: new Date('2026-10-31T18:00:00Z'), resultSetAt: null })
  })

  describe('a goal that the import stored', () => {
    /** A played match with two goals as the import keeps them, with links and short names. */
    async function importedMatch() {
      const id = await addMatch({ goalsAgainst: 1, goalsFor: 1, status: 'played' })
      const [{ id: playerId }] = await database.db
        .insert(players)
        .values({
          name: 'Luca Oyen',
          position: 'aanvaller',
          searchTerm: 'oyen',
          season: '2026/27',
          wikipediaPage: 'Luca Oyen',
        })
        .$returningId()
        .then((rows) => rows as [{ id: number }])

      const [{ id: personId }] = await database.db
        .insert(persons)
        .values({ wikipediaPage: 'Luca Oyen' })
        .$returningId()
        .then((rows) => rows as [{ id: number }])

      await database.db.insert(matchGoals).values([
        { matchId: id, minute: 12, ours: true, personId, player: 'Oyen', playerId, wikipediaPage: 'Luca Oyen' },
        { matchId: id, minute: 40, ours: false, player: 'Sibbing', wikipediaPage: 'Sven Sibbing' },
      ])

      // What the form gives back for those goals: the name of the player table, and no link
      // for a player of the opponent.
      const asEntered = [
        goal({ minute: 12, player: 'Luca Oyen', playerId, wikipediaPage: 'Luca Oyen' }),
        goal({ minute: 40, ours: false, player: 'Sibbing' }),
      ]

      return { asEntered, id, personId, playerId }
    }

    const sameResult = { ...entry().result, goalsAgainst: 1, goalsFor: 1 }

    it('is no change when the form gives back the same goals without the links', async () => {
      const { asEntered, id } = await importedMatch()

      expect(
        await saveEntry(
          database.db,
          userId,
          id,
          entry({
            goals: asEntered,
            kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T18:00:00Z'), matchDate: '2026-10-31' },
            result: sameResult,
          }),
          'Alleen de aftrap',
          t0,
        ),
      ).toEqual({ parts: ['kickoff'], status: 'saved' })
      expect(markedParts((await edit(id))!)).toEqual(['kickoff'])
      expect(await goalsOf(id)).toMatchObject([
        { player: 'Oyen', wikipediaPage: 'Luca Oyen' },
        { player: 'Sibbing', wikipediaPage: 'Sven Sibbing' },
      ])
      expect((await log())[0]?.detail).not.toContain('Doelpunten')
    })

    it('keeps the link and the name of the goals that did not change when one goal does', async () => {
      const { asEntered, id } = await importedMatch()

      await saveEntry(
        database.db,
        userId,
        id,
        entry({ goals: [asEntered[0]!, goal({ minute: 41, ours: false, player: 'Sibbing' })], result: sameResult }),
        'Een minuut later',
        t0,
      )

      expect(markedParts((await edit(id))!)).toEqual(['goals'])
      expect((await goalsOf(id)).map((row) => [row.minute, row.player, row.ours])).toEqual([
        [12, 'Oyen', true],
        [41, 'Sibbing', false],
      ])
      expect(
        (await database.db.select().from(matchGoals).orderBy(asc(matchGoals.id))).map((row) => row.wikipediaPage),
      ).toEqual(['Luca Oyen', null])
    })

    it('keeps the person of a goal that did not change, and puts it back with an undo', async () => {
      const { asEntered, id, personId } = await importedMatch()

      await saveEntry(
        database.db,
        userId,
        id,
        entry({ goals: [asEntered[0]!, goal({ minute: 41, ours: false, player: 'Sibbing' })], result: sameResult }),
        'Een minuut later',
        t0,
      )

      expect((await goalsOf(id)).map((row) => row.personId)).toEqual([personId, null])

      await undoEntry(database.db, userId, id, 'Terug', t1)

      expect((await goalsOf(id)).map((row) => row.personId)).toEqual([personId, null])
    })
  })

  it('sees no change in a kick-off that has seconds the form can not show', async () => {
    const id = await addMatch({ kickoffAt: new Date('2026-10-31T17:45:30Z') })

    expect(
      await saveEntry(
        database.db,
        userId,
        id,
        entry({ result: { ...entry().result, goalsAgainst: 1, goalsFor: 2 } }),
        'Alleen de uitslag',
        t0,
      ),
    ).toEqual({ parts: ['result'], status: 'saved' })
    expect((await stored(id))?.kickoffAt).toEqual(new Date('2026-10-31T17:45:30Z'))
  })

  it('stores and logs nothing for a save that changes nothing', async () => {
    const id = await addMatch()

    expect(
      await saveEntry(
        database.db,
        userId,
        id,
        entry({ result: { ...entry().result, goalsAgainst: null, goalsFor: null, status: 'scheduled' } }),
        'Niets',
        t0,
      ),
    ).toEqual({ status: 'unchanged' })
    expect(await edit(id)).toBeUndefined()
    expect(await log()).toEqual([])
  })

  it('keeps the match as it was before the first entry through a second one, and moves the other fields along', async () => {
    const id = await addMatch()

    await saveEntry(database.db, userId, id, entry(), 'Eerst', t0)
    await saveEntry(
      database.db,
      userId,
      id,
      entry({ goals: [goal(), goal({ minute: 50, ours: false, player: 'Sibbing' }), goal({ minute: 80 })] }),
      'Daarna de doelpunten',
      t1,
    )

    const marker = await edit(id)

    expect(marker).toMatchObject({
      editedAt: t1,
      goalsEdited: true,
      reason: 'Daarna de doelpunten',
      resultEdited: true,
    })
    expect(JSON.parse(marker?.beforeMatch ?? '')).toMatchObject({ status: 'scheduled' })
    expect((await stored(id))?.resultSetAt).toEqual(t0)
    expect((await log()).map((line) => line.reason)).toEqual(['Eerst', 'Daarna de doelpunten'])
  })

  it('takes a part that comes back after Wikipedia took it over as Wikipedia has it, when the entry is taken away', async () => {
    const id = await addMatch()
    const goals = [goal(), goal({ minute: 50, ours: false }), goal({ minute: 80 })]

    await saveEntry(database.db, userId, id, entry({ goals }), 'Eerst', t0)
    // Wikipedia took over the result, and the importer cleared its marker: 3-1 is Wikipedia's.
    await database.db.update(matches).set({ goalsAgainst: 1, goalsFor: 3 }).where(eq(matches.id, id))
    await clearParts(database.db, (await edit(id))!, ['result'])
    await saveEntry(
      database.db,
      userId,
      id,
      entry({ goals, result: { ...entry().result, goalsAgainst: 1, goalsFor: 4 } }),
      'Wikipedia heeft het mis',
      t1,
    )

    expect(await stored(id)).toMatchObject({ goalsFor: 4 })
    expect(await undoEntry(database.db, userId, id, 'Toch niet', t1)).toBe('done')
    expect(await stored(id)).toMatchObject({ goalsAgainst: 1, goalsFor: 3, status: 'played' })
    // The goals were never taken over: they go back to what they were before the first entry.
    expect(await goalsOf(id)).toEqual([])
  })

  it('forgets what Wikipedia was reported to say about a part that is entered again', async () => {
    const id = await addMatch()

    await saveEntry(database.db, userId, id, entry(), 'Eerst', t0)
    await database.db
      .update(matchEdits)
      .set({ reportedGoals: 'x', reportedResult: 'sc Heerenveen 1-1 N.E.C.' })
      .where(eq(matchEdits.matchId, id))
    await saveEntry(
      database.db,
      userId,
      id,
      entry({ result: { ...entry().result, goalsAgainst: 1, goalsFor: 3 } }),
      'Nog een doelpunt',
      t1,
    )

    expect(await edit(id)).toMatchObject({ reportedGoals: 'x', reportedResult: null })
  })

  it('lets a change of Wikipedia that waited for the match go, since the entry replaces it', async () => {
    const id = await addMatch()

    await database.db.insert(matchChanges).values({
      changed: 'result',
      class: 'suspicious',
      competition: 'Eredivisie',
      firstSeenAt: t0,
      lastSeenAt: t0,
      matchId: id,
      oldValue: 'a',
      reason: 'x',
      round: 'Speelronde 11',
      season: '2026/27',
      status: 'pending',
    })
    await saveEntry(database.db, userId, id, entry(), 'Wij weten het beter', t1)

    expect((await database.db.select().from(matchChanges))[0]).toMatchObject({
      decidedAt: t1,
      resolution: 'replaced',
      status: 'rejected',
    })
  })

  it('takes a played match back to a match without a result, and clears the spectators of a match not played', async () => {
    const id = await addMatch({ attendance: 20_000, goalsAgainst: 0, goalsFor: 1, status: 'played' })

    await saveEntry(
      database.db,
      userId,
      id,
      entry({ result: { ...entry().result, goalsAgainst: null, goalsFor: null, status: 'postponed' } }),
      'Uitgesteld',
      t0,
    )

    expect(await stored(id)).toMatchObject({ attendance: null, goalsFor: null, resultSetAt: null, status: 'postponed' })
  })

  it('keeps a cancelled match without a result, and clears the spectators', async () => {
    const id = await addMatch({ attendance: 20_000, goalsAgainst: 0, goalsFor: 1, status: 'played' })

    await saveEntry(
      database.db,
      userId,
      id,
      entry({ result: { ...entry().result, goalsAgainst: null, goalsFor: null, status: 'cancelled' } }),
      'Geannuleerd',
      t0,
    )

    expect(await stored(id)).toMatchObject({ attendance: null, goalsFor: null, resultSetAt: null, status: 'cancelled' })
  })

  it('says a match is missing, and writes nothing', async () => {
    expect(await saveEntry(database.db, userId, 99_999, entry(), 'Wie weet', t0)).toEqual({ status: 'missing' })
    expect(await log()).toEqual([])
  })

  it('writes nothing to the log when the save fails', async () => {
    const id = await addMatch()

    await expect(
      saveEntry(database.db, userId, id, entry({ goals: [goal({ player: 'x'.repeat(200) })] }), 'Te lang', t0),
    ).rejects.toBeDefined()
    expect(await log()).toEqual([])
    expect(await edit(id)).toBeUndefined()
    expect(await stored(id)).toMatchObject({ goalsFor: null, status: 'scheduled' })
  })
})

describe('the facts of a match', () => {
  const facts = { attendance: 21_022, note: 'Begon later door file', referee: 'Bas Nijhuis', stadium: 'Abe Lenstra' }

  it('stores them, marks them as a part of their own and writes one line in the log', async () => {
    const id = await addMatch()

    expect(await saveEntry(database.db, userId, id, entry({ facts }), 'Uit het archief', t0)).toEqual({
      parts: ['result', 'facts'],
      status: 'saved',
    })
    expect(await stored(id)).toMatchObject(facts)
    expect(await edit(id)).toMatchObject({ factsEdited: true, resultEdited: true })
    expect(await log()).toHaveLength(1)
    expect((await log())[0]?.detail).toContain('Gegevens: toeschouwers geen, scheidsrechter geen')
    expect((await log())[0]?.detail).toContain('→ toeschouwers 21.022, scheidsrechter Bas Nijhuis')

    // The same facts again are no change.
    expect(await saveEntry(database.db, userId, id, entry({ facts }), 'Nog eens', t1)).toEqual({ status: 'unchanged' })
    expect(await log()).toHaveLength(1)
  })

  it('marks the facts alone when only they change', async () => {
    const id = await addMatch({ goalsAgainst: 1, goalsFor: 2, status: 'played' })

    expect(await saveEntry(database.db, userId, id, entry({ facts }), 'Uit het archief', t0)).toEqual({
      parts: ['facts'],
      status: 'saved',
    })
    expect(await edit(id)).toMatchObject({ factsEdited: true, goalsEdited: false, resultEdited: false })
  })

  it('puts the four fields back as they were when the entry is taken away', async () => {
    const id = await addMatch({ goalsAgainst: 1, goalsFor: 2, referee: 'Piet Fluit', status: 'played' })
    const before = await stored(id)

    await saveEntry(database.db, userId, id, entry({ facts }), 'Uit het archief', t0)

    expect(await undoEntry(database.db, userId, id, 'Vergissing', t1)).toBe('done')
    expect(await stored(id)).toEqual(before)
    expect(await edit(id)).toBeUndefined()
    expect((await log())[1]?.detail).toBe('Teruggezet: gegevens')
  })

  it('lets a change of Wikipedia for the facts go when they are entered again', async () => {
    const id = await addMatch({ goalsAgainst: 1, goalsFor: 2, status: 'played' })

    await saveEntry(database.db, userId, id, entry({ facts }), 'Eerst', t0)
    await database.db.insert(matchChanges).values({
      changed: 'gegevens',
      class: 'suspicious',
      competition: 'Eredivisie',
      firstSeenAt: t0,
      lastSeenAt: t0,
      matchId: id,
      newValue: 'toeschouwers 20.000',
      oldValue: 'x',
      part: 'facts',
      reason: 'wijkt af van de invoer van de redactie',
      round: 'Speelronde 11',
      season: '2026/27',
      status: 'pending',
    })
    await saveEntry(database.db, userId, id, entry({ facts: { ...facts, attendance: 22_000 } }), 'Opnieuw', t1)

    expect(await database.db.select().from(matchChanges)).toMatchObject([
      { resolution: 'replaced', status: 'rejected' },
    ])
  })
})

describe('undoEntry', () => {
  it('puts the match and the goals back, removes the row and writes match.undo with the reason', async () => {
    const id = await addMatch()
    const before = await stored(id)

    await saveEntry(
      database.db,
      userId,
      id,
      entry({ goals: [goal(), goal({ minute: 50, ours: false }), goal({ minute: 80 })] }),
      'Eerst',
      t0,
    )

    expect(await undoEntry(database.db, userId, id, 'Het was een vergissing', t1)).toBe('done')
    expect(await stored(id)).toEqual(before)
    expect(await goalsOf(id)).toEqual([])
    expect(await edit(id)).toBeUndefined()
    expect((await log())[1]).toMatchObject({
      action: 'match.undo',
      createdAt: t1,
      detail: 'Teruggezet: uitslag, doelpunten',
      itemId: id,
      reason: 'Het was een vergissing',
      userId,
    })
  })

  it('says there is no entry, or no match, and writes nothing', async () => {
    const id = await addMatch()

    expect(await undoEntry(database.db, userId, id, 'Waarom', t1)).toBe('none')
    expect(await undoEntry(database.db, userId, 99_999, 'Waarom', t1)).toBe('missing')
    expect(await log()).toEqual([])
  })
})

describe('countMatchesWithoutResult', () => {
  it('counts the matches of the season that have begun and have no result, as the list does', async () => {
    await addMatch({
      goalsAgainst: 0,
      goalsFor: 1,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      matchDate: '2026-08-09',
      round: 'Speelronde 1',
      status: 'played',
    })
    await addMatch({ kickoffAt: new Date('2026-10-31T17:45:00Z'), round: 'Speelronde 11' })
    await addMatch({ kickoffAt: new Date('2026-11-01T09:00:00Z'), matchDate: '2026-11-01', round: 'Speelronde 12' })
    // Still being played, in the future and in another season: not counted.
    await addMatch({ kickoffAt: new Date('2026-11-01T11:00:00Z'), matchDate: '2026-11-01', round: 'Speelronde 13' })
    await addMatch({ kickoffAt: new Date('2026-12-05T17:45:00Z'), matchDate: '2026-12-05', round: 'Speelronde 15' })
    await addMatch({ season: '2025/26' })

    expect(await countMatchesWithoutResult(database.db, '2026/27', new Date('2026-11-01T12:00:00Z'))).toBe(2)
    expect(await countMatchesWithoutResult(database.db, '2024/25', t0)).toBe(0)
  })
})

describe('listAdminMatches and findMatch', () => {
  it('puts the matches without a result first, labels the entries, and keeps the order of the season otherwise', async () => {
    const played = await addMatch({
      goalsAgainst: 0,
      goalsFor: 1,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      matchDate: '2026-08-09',
      round: 'Speelronde 1',
      status: 'played',
    })
    const noResult = await addMatch({ kickoffAt: new Date('2026-10-31T17:45:00Z'), round: 'Speelronde 11' })
    const future = await addMatch({
      kickoffAt: new Date('2026-12-05T17:45:00Z'),
      matchDate: '2026-12-05',
      round: 'Speelronde 15',
    })
    const soon = await addMatch({
      kickoffAt: new Date('2026-11-01T09:00:00Z'),
      matchDate: '2026-11-01',
      round: 'Speelronde 12',
    })

    await saveEntry(database.db, userId, noResult, entry(), 'Wikipedia is achter', t0)

    const { rows } = await listAdminMatches(database.db, '2026/27', new Date('2026-11-01T12:00:00Z'))

    expect(rows.map((row) => [row.id, row.lacksResult, row.edited])).toEqual([
      [soon, true, []],
      [played, false, []],
      [noResult, false, ['result']],
      [future, false, []],
    ])
  })

  it('finds a match with its goals, its marker with the email of the editor, and the squad of its season', async () => {
    const id = await addMatch()

    await database.db.insert(players).values([
      { name: 'Bernt Klaverboer', position: 'aanvaller', searchTerm: 'klaverboer', season: '2026/27' },
      { name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season: '2026/27' },
      { name: 'Vorig Jaar', position: 'aanvaller', searchTerm: 'vorig', season: '2025/26' },
    ])
    await saveEntry(
      database.db,
      userId,
      id,
      entry({ goals: [goal(), goal({ minute: 50, ours: false }), goal({ minute: 80 })] }),
      'Eerst',
      t0,
    )

    const found = await findMatch(database.db, id)

    expect(found?.match).toMatchObject({ id, round: 'Speelronde 11' })
    expect(found?.goals).toHaveLength(3)
    expect(found?.edit).toMatchObject({ editedByEmail: 'sanne@example.org', resultEdited: true })
    expect(found?.squad.map((player) => player.name)).toEqual(['Bernt Klaverboer', 'Luca Oyen'])
    expect(await findMatch(database.db, 99_999)).toBeUndefined()
  })
})

describe('countWaitingDifferences', () => {
  /** A difference of a match, waiting for a decision unless the values say otherwise. */
  async function addDifference(matchId: null | number, overrides: Partial<typeof matchChanges.$inferInsert> = {}) {
    await database.db.insert(matchChanges).values({
      changed: 'uitslag',
      class: 'suspicious',
      competition: 'Eredivisie',
      firstSeenAt: t0,
      lastSeenAt: t0,
      matchId,
      oldValue: 'a',
      part: 'result',
      reason: 'x',
      round: 'Speelronde 11',
      season: '2026/27',
      status: 'pending',
      ...overrides,
    })
  }

  it('counts nothing, and names no season, when no difference waits', async () => {
    expect(await countWaitingDifferences(database.db)).toEqual({ seasons: [], total: 0 })
  })

  it('counts the differences in all seasons and names the seasons, the newest first', async () => {
    const now = await addMatch()
    const before = await addMatch({ season: '2024/25' })
    const older = await addMatch({ season: '2023/24' })

    await addDifference(before, { season: '2024/25' })
    await addDifference(older, { season: '2023/24' })
    await addDifference(now, { part: 'goals' })
    await addDifference(now)

    expect(await countWaitingDifferences(database.db)).toEqual({
      seasons: ['2026/27', '2024/25', '2023/24'],
      total: 4,
    })
  })

  it('leaves out what does not wait for a decision: a decided difference, a change of Wikipedia and a deleted match', async () => {
    const id = await addMatch()

    await addDifference(id, { status: 'rejected' })
    await addDifference(id, { part: null })
    await addDifference(null)

    expect(await countWaitingDifferences(database.db)).toEqual({ seasons: [], total: 0 })
  })
})

describe('the changes of Wikipedia that are held back', () => {
  /** A change of Wikipedia that waits for a decision, unless the values say otherwise. */
  async function addHeld(matchId: null | number, overrides: Partial<typeof matchChanges.$inferInsert> = {}) {
    const [inserted] = await database.db
      .insert(matchChanges)
      .values({
        changed: 'goals',
        class: 'suspicious',
        competition: 'Eredivisie',
        firstSeenAt: t0,
        lastSeenAt: t1,
        matchId,
        newValue: 'b',
        oldValue: 'a',
        reason: 'the season is over, and its matches do not change',
        round: 'Speelronde 11',
        season: '2026/27',
        status: 'pending',
        timesSeen: 3,
        ...overrides,
      })
      .$returningId()

    return inserted?.id ?? 0
  }

  it('counts nothing, and names no season, when no change is held back', async () => {
    expect(await countHeldChanges(database.db)).toEqual({ seasons: [], total: 0 })
  })

  it('counts the held changes in all seasons and names the seasons, the newest first', async () => {
    const now = await addMatch()
    const before = await addMatch({ round: 'Achtste finales', season: '2013/14' })

    await addHeld(before, { round: 'Achtste finales', season: '2013/14' })
    await addHeld(now)
    await addHeld(now, { newValue: null })

    expect(await countHeldChanges(database.db)).toEqual({ seasons: ['2026/27', '2013/14'], total: 3 })
  })

  it('leaves out what is not a held change: a decided one, a difference with an entry and a deleted match', async () => {
    const id = await addMatch()

    await addHeld(id, { status: 'accepted' })
    await addHeld(id, { part: 'result' })
    await addHeld(null)

    expect(await countHeldChanges(database.db)).toEqual({ seasons: [], total: 0 })
    // The other kind still counts its own.
    expect(await countWaitingDifferences(database.db)).toEqual({ seasons: ['2026/27'], total: 1 })
  })

  it('tells the list which matches have a held change, and the form of the match its changes and pages', async () => {
    const held = await addMatch()
    const quiet = await addMatch({ opponent: 'Ajax', round: 'Speelronde 12' })
    const id = await addHeld(held)

    await addHeld(held, { status: 'rejected' })
    await database.db.insert(wikipediaPages).values([
      { kind: 'programme', readAt: t1, season: '2026/27', title: 'Eredivisie 2026/27' },
      { kind: 'cup', readAt: t1, season: '2026/27', title: 'KNVB Beker 2026/27' },
    ])

    const { rows } = await listAdminMatches(database.db, '2026/27', t1)
    const found = await findMatch(database.db, held)

    expect(rows.find((row) => row.id === held)).toMatchObject({ differs: 0, held: 1 })
    expect(rows.find((row) => row.id === quiet)).toMatchObject({ held: 0 })
    expect(found?.held).toMatchObject([{ id, matchId: held, part: null, timesSeen: 3 }])
    expect(found?.pages.map((page) => page.title)).toEqual(['Eredivisie 2026/27', 'KNVB Beker 2026/27'])
    expect((await findMatch(database.db, quiet))?.held).toEqual([])
  })

  it('finds a held change that waits, and nothing else', async () => {
    const matchId = await addMatch()
    const id = await addHeld(matchId)
    const decided = await addHeld(matchId, { status: 'rejected' })
    const difference = await addHeld(matchId, { part: 'result' })

    expect(await findHeldChange(database.db, id)).toMatchObject({ id, matchId, part: null })
    expect(await findHeldChange(database.db, decided)).toBeUndefined()
    expect(await findHeldChange(database.db, difference)).toBeUndefined()
    expect(await findHeldChange(database.db, 99_999)).toBeUndefined()
  })

  it('decides a held change in one transaction with its line in the log', async () => {
    const matchId = await addMatch()
    const id = await addHeld(matchId, { newValue: null })

    expect(await decideHeldChange(database.db, userId, id, 'keep', 'Het blijft staan', t1)).toBe('done')
    expect(await decideHeldChange(database.db, userId, id, 'take-over', 'Te laat', t1)).toBe('not-waiting')
    expect(await database.db.select().from(matches)).toHaveLength(1)
    expect(await database.db.select().from(auditLog)).toMatchObject([
      { action: 'match.keep', itemId: matchId, reason: 'Het blijft staan', userId },
    ])
  })
})
