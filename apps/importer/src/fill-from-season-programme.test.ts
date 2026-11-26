import type { NewMatch } from '@fansite/db/schema'
import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, clubs, matchEdits, matches, matchGoals, personPages, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Fetcher } from './fetcher.ts'

import { fillFromSeasonProgramme } from './fill-from-season-programme.ts'

const programme = readFileSync(new URL('./fixtures/wikipedia-season-programme-2006-07.wiki', import.meta.url), 'utf8')
const origin = 'https://nl.wikipedia.org'
const season = '2006/07'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

/** A fetcher with the page of the season, or without one, that keeps what was asked. */
function fetcherOf(text?: string) {
  const asked: string[] = []
  const fetcher: Fetcher = {
    fetch: async (input) => {
      const url = String(input)

      asked.push(url)

      return text === undefined
        ? { kind: 'error', message: 'HTTP 404', reason: 'http-status', status: 404, url }
        : {
            body: new TextEncoder().encode(text),
            contentType: 'text/x-wiki',
            etag: null,
            kind: 'fetched',
            lastModified: null,
            url,
          }
    },
  }

  return { asked, fetcher }
}

describe('fillFromSeasonProgramme', () => {
  let adminId = 0
  let ajax = 0
  let feyenoord = 0
  let testdorp = 0

  const blank: Omit<NewMatch, 'clubId' | 'matchDate' | 'opponent' | 'round'> = {
    competition: 'Eredivisie',
    dataSource: 'oude-fansite',
    goalsAgainst: null,
    goalsFor: null,
    home: true,
    season,
    status: 'result_unknown',
  }
  const fill = (text: null | string = programme) =>
    fillFromSeasonProgramme(database.db, fetcherOf(text ?? undefined).fetcher, season, { origin, pause: 0 })
  const everything = () => database.db.select().from(matches).orderBy(asc(matches.id))
  const rows = async () => (await everything()).filter((row) => row.competition === 'Eredivisie')
  const goalsOf = (matchId: number) =>
    database.db.select().from(matchGoals).where(eq(matchGoals.matchId, matchId)).orderBy(asc(matchGoals.id))
  const insert = (values: Partial<NewMatch> & Pick<NewMatch, 'clubId' | 'matchDate' | 'opponent' | 'round'>) =>
    database.db.insert(matches).values({ ...blank, ...values })

  beforeEach(async () => {
    for (const table of [
      'match_edits',
      'match_goals',
      'matches',
      'players',
      'persons',
      'club_names',
      'clubs',
      'admin_users',
    ]) {
      await database.pool.query(`DELETE FROM ${table}`)
    }
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'editor')")
    adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
    await database.db.insert(clubs).values([
      { name: 'Ajax', slug: 'ajax', wikipediaPage: 'AFC Ajax' },
      { name: 'Feyenoord', slug: 'feyenoord' },
      { name: 'Testdorp', slug: 'testdorp' },
    ])

    const found = await database.db.select().from(clubs)
    const id = (name: string) => found.find((row) => row.name === name)?.id ?? 0

    ;[ajax, feyenoord, testdorp] = [id('Ajax'), id('Feyenoord'), id('Testdorp')]
    await database.db.insert(players).values([
      { searchTerm: 'piet proef', season, source: 'verslag', sourceName: 'Piet Proef', wikipediaPage: null },
      { searchTerm: 'kees test', season, source: 'verslag', sourceName: 'Kees Test', wikipediaPage: null },
    ])
  })

  it('fills the result and the goals of a match without a record, and ties our scorers to players', async () => {
    await insert({ clubId: ajax, home: false, matchDate: '2006-08-19', opponent: 'Ajax', round: 'Speelronde 1' })

    const report = await fill()
    const [match] = await rows()

    expect(report.filled).toBe(1)
    // Five goals of the league match and the one of the first play-off match.
    expect(report.goals).toBe(6)
    expect(match).toMatchObject({ goalsAgainst: 2, goalsFor: 3, status: 'played' })

    const goals = await goalsOf(match!.id)
    const proef = (await database.db.select().from(players).where(eq(players.sourceName, 'Piet Proef')))[0]

    expect(goals.map((goal) => [goal.minute, goal.ours, goal.sourceName, goal.penalty, goal.stoppageMinutes])).toEqual([
      [40, false, 'Voorbeeld', false, null],
      [42, true, 'Piet Proef', false, null],
      [58, false, 'Test', true, null],
      [81, true, 'Proef', false, null],
      [90, true, 'Onbekend', false, 3],
    ])
    // Piet Proef by his full name, Proef by his surname; Onbekend is nobody of the season.
    expect(goals.map((goal) => goal.playerId)).toEqual([null, proef?.id, null, proef?.id, null])
    expect(report.lines.join('\n')).toContain("1 goal of ours without a player: Onbekend '90")
  })

  it('stores the result of a list that does not add up, and no goals, with a line', async () => {
    await insert({ clubId: feyenoord, matchDate: '2006-08-26', opponent: 'Feyenoord', round: 'Speelronde 2' })

    const report = await fill()
    const [match] = await rows()

    expect(match).toMatchObject({ goalsAgainst: 0, goalsFor: 2, status: 'played' })
    expect(await goalsOf(match!.id)).toHaveLength(0)
    expect(report.lines.join('\n')).toContain('no goals stored, the scorers add up to 1-0, the result is 2-0')
  })

  it('fills a goalless match with a result and no goals', async () => {
    await insert({
      clubId: testdorp,
      home: false,
      matchDate: '2006-09-09',
      opponent: 'Testdorp',
      round: 'Speelronde 3',
    })

    expect((await fill()).filled).toBe(1)
    expect((await rows())[0]).toMatchObject({ goalsAgainst: 0, goalsFor: 0, status: 'played' })
  })

  it('gives a goal with a page its person back, and a second run changes nothing (#1639)', async () => {
    await insert({ clubId: ajax, home: false, matchDate: '2006-08-19', opponent: 'Ajax', round: 'Speelronde 1' })
    await fill()

    const [match] = await rows()
    const [{ insertId }] = await database.db
      .insert(persons)
      .values({ name: 'Piet Voorbeeld', wikipediaPage: 'Piet Voorbeeld' })

    await database.db.insert(personPages).values({ page: 'Piet Voorbeeld', personId: insertId })
    const [against] = (await goalsOf(match!.id)).filter((goal) => !goal.ours)

    await database.db
      .update(matchGoals)
      .set({ personId: null, wikipediaPage: 'Piet Voorbeeld' })
      .where(eq(matchGoals.id, against!.id))

    const first = await fill()
    const second = await fill()

    expect((await goalsOf(match!.id)).find((goal) => goal.id === against!.id)).toMatchObject({ personId: insertId })
    expect(first.lines.join('\n')).toContain('is linked to his person again')
    expect(second.lines.join('\n')).not.toContain('is linked to his person again')
  })

  it('never overwrites a result or goals that are there', async () => {
    // A result that equals the programme, with a goal of its own, and a result that differs.
    const [{ insertId }] = await insert({
      clubId: ajax,
      goalsAgainst: 1,
      goalsFor: 1,
      matchDate: '2006-09-17',
      opponent: 'Ajax',
      round: 'Speelronde 4',
      status: 'played',
    })

    await database.db
      .insert(matchGoals)
      .values({ matchId: insertId, minute: 7, ours: true, ownGoal: false, penalty: false, sourceName: 'Iemand Anders' })
    await insert({
      clubId: feyenoord,
      goalsAgainst: 0,
      goalsFor: 2,
      home: false,
      matchDate: '2006-09-24',
      opponent: 'Feyenoord',
      round: 'Speelronde 5',
      status: 'played',
    })

    const report = await fill()

    expect(report.filled).toBe(0)
    expect(await rows()).toMatchObject([
      { goalsAgainst: 1, goalsFor: 1 },
      { goalsAgainst: 0, goalsFor: 2 },
    ])
    expect((await goalsOf(insertId)).map((goal) => goal.sourceName)).toEqual(['Iemand Anders'])
    expect(report.lines.join('\n')).toContain('left as it is, the database has 2-0 and the programme 0-1')
  })

  it('leaves a match whose goals or result the editors entered, and a match with a record', async () => {
    await insert({ clubId: ajax, home: false, matchDate: '2006-08-19', opponent: 'Ajax', round: 'Speelronde 1' })
    await insert({
      clubId: feyenoord,
      matchDate: '2006-08-26',
      opponent: 'Feyenoord',
      referee: 'Een Scheids',
      round: 'Speelronde 2',
    })
    await insert({
      clubId: testdorp,
      home: false,
      matchDate: '2006-09-09',
      opponent: 'Testdorp',
      round: 'Speelronde 3',
    })

    const [first, , third] = await rows()

    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date('2026-11-09T10:00:00Z'),
      editedBy: adminId,
      goalsEdited: true,
      matchId: first!.id,
    })
    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date('2026-11-09T10:00:00Z'),
      editedBy: adminId,
      matchId: third!.id,
      resultEdited: true,
    })
    await fill()

    const [one, two, three] = await rows()

    // The result of the first is filled and its goals stay with the editors; the second has a
    // record of the old fansite, so only its result is filled; the third has its result locked.
    expect(await goalsOf(one!.id)).toHaveLength(0)
    expect(one).toMatchObject({ goalsFor: 3, status: 'played' })
    expect(two).toMatchObject({ goalsFor: 2, status: 'played' })
    expect(await goalsOf(two!.id)).toHaveLength(0)
    expect(three).toMatchObject({ goalsFor: null, status: 'result_unknown' })
  })

  it('makes the two play-off matches, with goals, and the contradicting one with no goals and a line', async () => {
    await insert({ clubId: ajax, matchDate: '2006-08-19', opponent: 'Ajax', round: 'Speelronde 1' })

    const report = await fill()
    const made = (await everything()).filter((row) => row.competition === 'Play-offs Champions League')

    expect(report.made).toBe(2)
    expect(made).toMatchObject([
      {
        clubId: ajax,
        dataSource: 'wikipedia',
        dateText: '9 mei 2007',
        goalsAgainst: 0,
        goalsFor: 1,
        home: true,
        matchDate: '2007-05-09',
        opponent: 'Ajax',
        round: 'Eerste ronde, wedstrijd 1/2',
        status: 'played',
      },
      {
        dateText: '13 mei 2007',
        goalsAgainst: 4,
        goalsFor: 0,
        home: false,
        matchDate: '2007-05-13',
        round: 'Eerste ronde, wedstrijd 2/2',
      },
    ])
    expect((await goalsOf(made[0]!.id)).map((goal) => [goal.minute, goal.ours])).toEqual([[18, true]])
    expect(await goalsOf(made[1]!.id)).toHaveLength(0)
    expect(report.lines.join('\n')).toContain('no goals stored, the running score 4-1 does not follow 3-0')
  })

  describe('a result that is on the correction list', () => {
    const correction = {
      club: 'Ajax',
      competition: 'Eredivisie' as const,
      date: '2006-08-19',
      from: { against: 1, for: 0 },
      home: false,
      season,
      source: 'a made-up source',
      to: { against: 2, for: 3 },
    }
    const fillWith = () =>
      fillFromSeasonProgramme(database.db, fetcherOf(programme).fetcher, season, {
        corrections: [correction],
        origin,
        pause: 0,
      })
    const stored = (goalsFor: number, goalsAgainst: number) =>
      insert({
        clubId: ajax,
        goalsAgainst,
        goalsFor,
        home: false,
        matchDate: '2006-08-19',
        opponent: 'Ajax',
        round: 'Speelronde 1',
        status: 'played',
      })

    it('is put right while the match still has the wrong result, and a second run changes nothing', async () => {
      await stored(0, 1)

      const first = await fillWith()

      expect(first.corrected).toBe(1)
      expect(first.lines.join('\n')).toContain('result 0-1 corrected to 3-2')
      expect((await rows())[0]).toMatchObject({ goalsAgainst: 2, goalsFor: 3, status: 'played' })

      const before = await everything()
      const second = await fillWith()

      expect(second.corrected).toBe(0)
      expect(await everything()).toEqual(before)
    })

    it('stays as it is when the editors entered another result, or locked the result', async () => {
      await stored(5, 5)
      await fillWith()
      expect((await rows())[0]).toMatchObject({ goalsAgainst: 5, goalsFor: 5 })

      await database.pool.query('DELETE FROM matches')
      await stored(0, 1)

      const [match] = await rows()

      await database.db.insert(matchEdits).values({
        beforeGoals: '[]',
        beforeMatch: '{}',
        editedAt: new Date('2026-11-09T10:00:00Z'),
        editedBy: adminId,
        matchId: match!.id,
        resultEdited: true,
      })

      const report = await fillWith()

      expect(report.corrected).toBe(0)
      expect((await rows())[0]).toMatchObject({ goalsAgainst: 1, goalsFor: 0 })
    })

    it('is not applied to a match of another day', async () => {
      await insert({
        clubId: ajax,
        goalsAgainst: 1,
        goalsFor: 0,
        home: false,
        matchDate: '2006-08-20',
        opponent: 'Ajax',
        round: 'Speelronde 1',
        status: 'played',
      })
      expect((await fillWith()).corrected).toBe(0)
    })
  })

  it('changes nothing in a second run', async () => {
    await insert({ clubId: ajax, home: false, matchDate: '2006-08-19', opponent: 'Ajax', round: 'Speelronde 1' })
    await insert({ clubId: feyenoord, matchDate: '2006-08-26', opponent: 'Feyenoord', round: 'Speelronde 2' })
    await fill()

    const before = [await everything(), await database.db.select().from(matchGoals)]
    const second = await fill()

    expect([await everything(), await database.db.select().from(matchGoals)]).toEqual(before)
    expect(second).toMatchObject({ filled: 0, goals: 0, made: 0 })
  })

  it('reports a match of the programme that the archive does not have, and a club it does not know', async () => {
    await insert({ clubId: testdorp, matchDate: '2006-10-08', opponent: 'Testdorp', round: 'Speelronde 8' })

    const report = await fill()
    const text = report.lines.join('\n')

    expect(text).toContain('the archive has no match with this club on that day')
    expect(text).toContain('no club with that name in the database')
    expect(text).toContain('has no result we can read')
  })

  it('asks nothing for another season, and says so when the page cannot be read', async () => {
    const { asked, fetcher } = fetcherOf(programme)

    expect(await fillFromSeasonProgramme(database.db, fetcher, '2005/06', { origin, pause: 0 })).toMatchObject({
      filled: 0,
      lines: [],
    })
    expect(asked).toEqual([])
    expect((await fill(null)).lines[0]).toContain('not read from Wikipedia')
    expect(await rows()).toEqual([])
  })
})
