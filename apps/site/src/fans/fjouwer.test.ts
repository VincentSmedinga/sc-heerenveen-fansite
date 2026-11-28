import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, fantasyPicks, fantasyPlayerLines, matches, players, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { fjouwerData, fjouwerMatch, fjouwerSquad, fjouwerState, saveFjouwer } from './fjouwer'

// Writing checks the deadline with the clock of the database too, so everything takes the
// real time as now.
const now = new Date()
const hour = 60 * 60 * 1000
const at = (hours: number) => new Date(now.getTime() + hours * hour)

let database: TestDatabase
let clubId: number
let supporterId: number
let rounds = 0
let ids: Record<string, number> = {}

beforeAll(async () => {
  database = await createTestDatabase()
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  clubId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente')))[0]?.id ?? 0
})

afterAll(async () => {
  await database?.drop()
})

const squadRows = [
  ['Noppert', 'doelman'],
  ['Wolters', 'doelman'],
  ['Hilgers', 'verdediger'],
  ['Van Beek', 'verdediger'],
  ['Sauer', 'verdediger'],
  ['Proper', 'middenvelder'],
  ['Smans', 'middenvelder'],
  ['Vente', 'aanvaller'],
  ['Trenskow', 'aanvaller'],
] as const

beforeEach(async () => {
  await database.db.delete(fantasyPicks)
  await database.db.delete(fantasyPlayerLines)
  await database.db.delete(players)
  await database.db.delete(matches)
  await database.db.delete(supporters)
  rounds = 0
  await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.test', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })
  supporterId = (await database.db.select().from(supporters))[0]?.id ?? 0
  await database.db.insert(players).values(
    squadRows.map(([name, position]) => ({
      position,
      searchTerm: name,
      season: '2026/27',
      sourceName: name,
    })),
  )
  ids = Object.fromEntries((await database.db.select().from(players)).map((row) => [row.sourceName, row.id]))
})

async function addMatch(kickoffAt: Date | null, extra: Partial<typeof matches.$inferInsert> = {}): Promise<number> {
  rounds += 1

  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    dateText: kickoffAt === null ? 'zaterdag 28 november' : null,
    home: true,
    kickoffAt,
    matchDate: (kickoffAt ?? at(72)).toISOString().slice(0, 10),
    opponent: 'FC Twente',
    round: `Speelronde ${rounds}`,
    season: '2026/27',
    status: 'scheduled',
    ...extra,
  })

  return result.insertId
}

const four = (...names: string[]) => names.map((name) => ids[name] as number)
const picks = async () => database.db.select().from(fantasyPicks)

describe('the match of the card', () => {
  it('is the first match that has not closed, in any competition', async () => {
    await addMatch(at(80))

    const cup = await addMatch(at(30), { competition: 'KNVB Beker' })

    expect((await fjouwerMatch(database.db, now))?.id).toBe(cup)
  })

  it('moves on to the next match at the kick-off of the one before it', async () => {
    await addMatch(at(-1))

    const after = await addMatch(at(80))

    expect((await fjouwerMatch(database.db, now))?.id).toBe(after)
  })

  it('skips a cancelled and a postponed match, and is undefined at the end of the season', async () => {
    await addMatch(at(10), { status: 'cancelled' })
    await addMatch(at(20), { status: 'postponed' })

    expect(await fjouwerMatch(database.db, now)).toBeUndefined()
  })

  it('closes a match without an hour at 00.00 on its day', async () => {
    const day = at(40).toISOString().slice(0, 10)
    const match = await addMatch(null, { matchDate: day })

    const before = new Date(`${day}T12:00:00Z`)

    before.setUTCDate(before.getUTCDate() - 1)

    expect((await fjouwerMatch(database.db, before))?.id).toBe(match)
    // 00.00 Dutch time is 22.00 or 23.00 UTC the evening before, so 00.00 UTC is past it.
    expect(await fjouwerMatch(database.db, new Date(`${day}T00:00:00Z`))).toBeUndefined()
  })
})

describe('the squad', () => {
  it('has the lines from the goal to the front, by surname without the prefix', async () => {
    const match = await addMatch(at(30))
    const squad = await fjouwerSquad(database.db, (await fjouwerMatch(database.db, now))!)

    expect(squad.map((player) => player.name)).toEqual([
      'Noppert',
      'Wolters',
      'Van Beek',
      'Hilgers',
      'Sauer',
      'Proper',
      'Smans',
      'Trenskow',
      'Vente',
    ])
    expect(match).toBeGreaterThan(0)
  })

  it('shortens a name for the strip, with a capital, and an initial for a shared surname', async () => {
    await addMatch(at(30))
    await database.db.insert(players).values(
      ['Thom van Testma', 'Tim van Testma', 'Bo van Testma', 'Sam da Proef'].map((sourceName) => ({
        position: 'aanvaller' as const,
        searchTerm: sourceName.slice(sourceName.indexOf(' ') + 1),
        season: '2026/27',
        source: 'selectie' as const,
        sourceName,
      })),
    )

    const squad = await fjouwerSquad(database.db, (await fjouwerMatch(database.db, now))!)
    const shortOf = (name: string) => squad.find((player) => player.name === name)?.shortName

    expect(['Thom van Testma', 'Tim van Testma', 'Bo van Testma', 'Sam da Proef'].map(shortOf)).toEqual([
      'Thom van Testma',
      'Tim van Testma',
      'B. van Testma',
      'Da Proef',
    ])
    expect(shortOf('Vente')).toBe('Vente')
  })

  it('keeps a player who left for matches before he left, and keeps the line from the first use', async () => {
    await addMatch(at(30))
    await database.db
      .update(players)
      .set({ inSquad: false, leftSquadAt: at(100) })
      .where(eq(players.sourceName, 'Sauer'))
    await database.db
      .update(players)
      .set({ inSquad: false, leftSquadAt: at(-5) })
      .where(eq(players.sourceName, 'Wolters'))
    await database.db.insert(fantasyPlayerLines).values({ line: 'aanvaller', playerId: ids['Proper'] as number })

    const squad = await fjouwerSquad(database.db, (await fjouwerMatch(database.db, now))!)

    expect(squad.map((player) => player.name)).toContain('Sauer')
    expect(squad.map((player) => player.name)).not.toContain('Wolters')
    expect(squad.find((player) => player.name === 'Proper')?.line).toBe('aanvaller')
  })
})

describe('saving', () => {
  it('stores the four, replaces an earlier choice and keeps one row', async () => {
    const match = await addMatch(at(30))
    const first = await saveFjouwer(database.db, {
      matchId: match,
      playerIds: four('Noppert', 'Hilgers', 'Proper', 'Vente'),
      supporterId,
    })

    expect(first.answer).toBe('saved')

    await saveFjouwer(database.db, {
      matchId: match,
      playerIds: four('Wolters', 'Hilgers', 'Smans', 'Trenskow'),
      supporterId,
    })

    const rows = await picks()

    expect(rows).toHaveLength(1)
    expect([rows[0]?.player1Id, rows[0]?.player2Id, rows[0]?.player3Id, rows[0]?.player4Id]).toEqual(
      four('Wolters', 'Hilgers', 'Smans', 'Trenskow'),
    )
  })

  it('refuses the rules: two of a line at most, four in all, a player once', async () => {
    const match = await addMatch(at(30))
    const send = (names: string[]) =>
      saveFjouwer(database.db, { matchId: match, playerIds: four(...names), supporterId })

    expect((await send(['Hilgers', 'Sauer', 'Van Beek', 'Vente'])).answer).toBe('invalid')
    expect((await send(['Hilgers', 'Sauer', 'Vente'])).answer).toBe('invalid')
    expect((await send(['Hilgers', 'Hilgers', 'Vente', 'Proper'])).answer).toBe('invalid')
    expect(await picks()).toHaveLength(0)
  })

  it('refuses a player who is not in the squad of the season', async () => {
    const match = await addMatch(at(30))
    const result = await saveFjouwer(database.db, {
      matchId: match,
      playerIds: [...four('Noppert', 'Hilgers', 'Vente'), 999_999],
      supporterId,
    })

    expect(result.answer).toBe('invalid')
  })

  it('refuses a match that is not the one of the card, and one that has closed', async () => {
    const closed = await addMatch(at(-1))
    const open = await addMatch(at(30))
    const later = await addMatch(at(60))
    const names = four('Noppert', 'Hilgers', 'Proper', 'Vente')

    expect((await saveFjouwer(database.db, { matchId: closed, playerIds: names, supporterId })).answer).toBe('closed')
    expect((await saveFjouwer(database.db, { matchId: later, playerIds: names, supporterId })).answer).toBe('closed')
    expect((await saveFjouwer(database.db, { matchId: open, playerIds: names, supporterId })).answer).toBe('saved')
  })

  it('keeps the line of a player from his first use', async () => {
    const match = await addMatch(at(30))

    await saveFjouwer(database.db, {
      matchId: match,
      playerIds: four('Noppert', 'Hilgers', 'Proper', 'Vente'),
      supporterId,
    })
    await database.db.update(players).set({ position: 'verdediger' }).where(eq(players.sourceName, 'Proper'))
    await saveFjouwer(database.db, {
      matchId: match,
      playerIds: four('Noppert', 'Hilgers', 'Proper', 'Vente'),
      supporterId,
    })

    const lines = await database.db
      .select()
      .from(fantasyPlayerLines)
      .where(eq(fantasyPlayerLines.playerId, ids['Proper'] as number))

    expect(lines.map((row) => row.line)).toEqual(['middenvelder'])
  })
})

describe('the four of a supporter', () => {
  it('is inherited over more matches in a row, and a new row replaces it', async () => {
    const one = await addMatch(at(-48))
    const two = await addMatch(at(-24))
    const three = await addMatch(at(-2))
    const open = await addMatch(at(30))

    await database.db.insert(fantasyPicks).values({
      matchId: one,
      player1Id: ids['Noppert'] as number,
      player2Id: ids['Hilgers'] as number,
      player3Id: ids['Proper'] as number,
      player4Id: ids['Vente'] as number,
      supporterId,
    })

    const match = (await fjouwerMatch(database.db, now))!
    const state = await fjouwerState(database.db, supporterId, match)

    expect(match.id).toBe(open)
    expect(state.four).toEqual(four('Noppert', 'Hilgers', 'Proper', 'Vente'))
    expect(state).toMatchObject({ inherited: true, saved: false })
    // Used in the three matches before this one, by inheritance.
    expect(state.uses.get(ids['Noppert'] as number)).toBe(3)
    expect([two, three]).toHaveLength(2)

    await database.db.insert(fantasyPicks).values({
      matchId: three,
      player1Id: ids['Wolters'] as number,
      player2Id: ids['Hilgers'] as number,
      player3Id: ids['Proper'] as number,
      player4Id: ids['Vente'] as number,
      supporterId,
    })

    const changed = await fjouwerState(database.db, supporterId, match)

    expect(changed.four[0]).toBe(ids['Wolters'])
    expect(changed.uses.get(ids['Noppert'] as number)).toBe(2)
  })

  it('is empty for a supporter who never chose, and nothing is written', async () => {
    await addMatch(at(30))

    const state = await fjouwerState(database.db, supporterId, (await fjouwerMatch(database.db, now))!)

    expect(state).toMatchObject({ four: [], inherited: false, saved: false })
    expect(await picks()).toHaveLength(0)
  })

  it('does not count a player in an inherited four who has his ten, and refuses him on a save', async () => {
    const first = await addMatch(at(-24 * 11))

    for (let day = 10; day >= 1; day -= 1) {
      await addMatch(at(-24 * day))
    }

    const open = await addMatch(at(30))

    await database.db.insert(fantasyPicks).values({
      matchId: first,
      player1Id: ids['Noppert'] as number,
      player2Id: ids['Hilgers'] as number,
      player3Id: ids['Proper'] as number,
      player4Id: ids['Vente'] as number,
      supporterId,
    })

    const match = (await fjouwerMatch(database.db, now))!
    const state = await fjouwerState(database.db, supporterId, match)

    expect(match.id).toBe(open)
    expect(state.inherited).toBe(true)
    expect(state.uses.get(ids['Proper'] as number)).toBe(10)
    expect(state.notCounting).toEqual(four('Noppert', 'Hilgers', 'Proper', 'Vente'))

    const result = await saveFjouwer(database.db, {
      matchId: open,
      playerIds: four('Wolters', 'Sauer', 'Proper', 'Trenskow'),
      supporterId,
    })

    expect(result).toMatchObject({ answer: 'invalid' })
  })
})

describe('what is kept of a supporter', () => {
  it('is empty without a choice and lists the matches with the four, newest first', async () => {
    expect(await fjouwerData(database.db, supporterId)).toBeUndefined()

    const older = await addMatch(at(-48), { home: false, matchDate: '2026-11-10', opponent: 'Ajax' })
    const newer = await addMatch(at(30), { matchDate: '2026-11-28' })

    for (const [matchId, names] of [
      [older, four('Noppert', 'Hilgers', 'Proper', 'Vente')],
      [newer, four('Wolters', 'Hilgers', 'Smans', 'Trenskow')],
    ] as const) {
      await database.db.insert(fantasyPicks).values({
        matchId,
        player1Id: names[0] as number,
        player2Id: names[1] as number,
        player3Id: names[2] as number,
        player4Id: names[3] as number,
        supporterId,
      })
    }

    const data = await fjouwerData(database.db, supporterId)

    expect(data?.summary).toBe('2 keer vier gekozen')
    expect(data?.columns).toEqual(['Wedstrijd', 'Jouw vier'])
    expect(data?.rows.map((row) => row.header)).toEqual([
      'sc Heerenveen – FC Twente, 28 nov',
      'Ajax – sc Heerenveen, 10 nov',
    ])
    expect(data?.rows[0]?.cells).toEqual(['Wolters, Hilgers, Smans, Trenskow'])
  })
})
