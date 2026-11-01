import type { TestDatabase } from '@fansite/db/test-database'

import { encodeGoals, encodeMatch, type MatchPart } from '@fansite/db/match-edits'
import { adminUsers, auditLog, matchEdits, matches, matchGoals, matchImports } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { importMatches, importPastSeason } from './import-matches.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

// What the import does with a match the editors filled in (issue 272). The pages of Wikipedia
// are served from this computer; the tests never ask the real site.

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Wed, 21 Oct 2026 14:40:44 GMT' }

const original = {
  cup: fixture('wikipedia-cup.wiki'),
  programme: fixture('wikipedia-programme.wiki'),
  standings: fixture('wikipedia-standings.wiki'),
}

const hours = (count: number) => count * 60 * 60 * 1000

/** Sunday 25 October 2026, after the table was updated for the 10th round. */
const first = new Date('2026-10-25T12:00:00Z')

/** The hour that passes between two runs, and then some. */
const later = (at: Date, count: number) => new Date(at.getTime() + hours(count))

let database: TestDatabase
let adminId: number
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of [
    'audit_log',
    'match_changes',
    'matches',
    'club_names',
    'clubs',
    'players',
    'standings',
    'wikipedia_pages',
    'match_imports',
    'admin_users',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }

  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

type Pages = typeof original

/** Serves the pages as Wikipedia does, from `current`, which a test can change between runs. */
async function serve() {
  const current: Pages = { ...original }
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }

  for (const season of ['2026/27']) {
    for (const kind of ['cup', 'playoffs', 'programme', 'standings'] as const) {
      routes[pageUrl('', pageTitles(season)[kind])] = (_request, response) => {
        const text = kind === 'playoffs' ? undefined : current[kind]

        response.writeHead(text === undefined ? 404 : 200, wiki)
        response.end(text ?? 'Niet gevonden')
      }
    }
  }

  const server = await startServer(routes)

  servers.push(server)

  return { pages: current, server }
}

const importAt = (server: TestServer, at: Date) =>
  importMatches(database.db, fetcherFor([server]), { clock: () => at, origin: server.origin })

/** Round 1: sc Heerenveen - FC Twente 1-0, with a goal of Oyen in minute 52. */
const roundOne = 'Speelronde 1'

/** Round 11: sc Heerenveen - N.E.C., which Wikipedia does not have a result for yet. */
const roundEleven = 'Speelronde 11'

const row = async (round: string) => (await database.db.select().from(matches).where(eq(matches.round, round)))[0]

const goalsOf = async (round: string) => {
  const found = await row(round)

  return (
    await database.db
      .select()
      .from(matchGoals)
      .where(eq(matchGoals.matchId, found?.id ?? 0))
      .orderBy(asc(matchGoals.id))
  ).map((goal) => [goal.minute, goal.player, goal.ours])
}

const edits = () => database.db.select().from(matchEdits)
const log = () => database.db.select().from(auditLog).orderBy(asc(auditLog.id))
const warningOf = async () => (await database.db.select().from(matchImports))[0]?.lastWarning

/**
 * What an editor does on the form, in the tables: the match gets these values, the goals are
 * replaced when they are given, and `match_edits` marks the parts, with the match as it was.
 */
async function enter(
  round: string,
  values: Partial<typeof matches.$inferInsert>,
  parts: MatchPart[],
  goals?: { minute: number; ours: boolean; player: string }[],
) {
  const before = await row(round)

  if (before === undefined) {
    throw new Error(`no match for ${round}`)
  }

  const beforeGoals = await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, before.id))

  if (Object.keys(values).length > 0) {
    await database.db.update(matches).set(values).where(eq(matches.id, before.id))
  }

  if (goals !== undefined) {
    await database.db.delete(matchGoals).where(eq(matchGoals.matchId, before.id))
    await database.db.insert(matchGoals).values(goals.map((goal) => ({ ...goal, matchId: before.id })))
  }

  await database.db.insert(matchEdits).values({
    beforeGoals: encodeGoals(beforeGoals),
    beforeMatch: encodeMatch(before),
    editedAt: first,
    editedBy: adminId,
    goalsEdited: parts.includes('goals'),
    kickoffEdited: parts.includes('kickoff'),
    matchId: before.id,
    reason: 'Wikipedia is achter',
    resultEdited: parts.includes('result'),
  })
}

/** The result the editors enter for round 11: they won 2-1. */
const wonTwoOne = { goalsAgainst: 1, goalsFor: 2, resultSetAt: first, status: 'played' } as const

const elevenGoals = [
  { minute: 12, ours: true, player: 'Oyen' },
  { minute: 40, ours: false, player: 'Sibbing' },
  { minute: 77, ours: true, player: 'Klaverboer' },
]

/** Round 1 ends 1-1 on Wikipedia instead of 1-0, with the table and the scorers to agree. */
function drawn(pages: Pages) {
  return {
    ...pages,
    programme: pages.programme
      .replace('|score = 1 – 0', '|score = 1 – 1')
      .replace('{{goal|52}}\n|goals2 =', '{{goal|52}}\n|goals2 = {{goal|88}} [[Test Speler|Speler]]'),
    standings: pages.standings
      .replace(
        '|win_HEE=4 |draw_HEE=3 |loss_HEE=3 |gf_HEE=18 |ga_HEE=13',
        '|win_HEE=3 |draw_HEE=4 |loss_HEE=3 |gf_HEE=18 |ga_HEE=14',
      )
      .replace(
        '|win_TWE=6 |draw_TWE=2 |loss_TWE=2 |gf_TWE=19 |ga_TWE=10',
        '|win_TWE=6 |draw_TWE=3 |loss_TWE=1 |gf_TWE=20 |ga_TWE=10',
      ),
  }
}

describe('Wikipedia has nothing for the part yet', () => {
  it('keeps the result and the goals of the editors, and says nothing, run after run', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enter(roundEleven, wonTwoOne, ['result', 'goals'], elevenGoals)

    for (const count of [1, 2, 30]) {
      const report = await importAt(server, later(first, count))

      expect(report).toMatchObject({ kind: 'imported', matches: { added: 0, held: 0, removed: 0, updated: 0 } })
      expect(report.kind === 'imported' ? report.warnings : []).toEqual([])
    }

    expect(await row(roundEleven)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, resultSetAt: first, status: 'played' })
    expect(await goalsOf(roundEleven)).toEqual([
      [12, 'Oyen', true],
      [40, 'Sibbing', false],
      [77, 'Klaverboer', true],
    ])
    expect(await edits()).toMatchObject([{ goalsEdited: true, resultEdited: true }])
    expect(await log()).toEqual([])
    expect(await warningOf()).toBeNull()
  })

  it('keeps a kick-off the editors entered while Wikipedia has no time', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enter('Speelronde 22', { dateText: null, kickoffAt: new Date('2027-02-13T19:30:00Z') }, ['kickoff'])
    await importAt(server, later(first, 2))

    expect(await row('Speelronde 22')).toMatchObject({ dateText: null, kickoffAt: new Date('2027-02-13T19:30:00Z') })
    expect(await edits()).toMatchObject([{ kickoffEdited: true }])
    expect(await log()).toEqual([])
  })
})

describe('Wikipedia has the same', () => {
  it('clears the marker of the result, removes the row and says that Wikipedia caught up', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await enter(roundOne, { goalsAgainst: 1, goalsFor: 1, resultSetAt: first }, ['result'])
    Object.assign(pages, drawn(pages))

    const report = await importAt(server, later(first, 2))

    expect(report).toMatchObject({ kind: 'imported', matches: { added: 0, held: 0, updated: 1 } })
    expect(await edits()).toEqual([])
    expect(await log()).toMatchObject([
      {
        action: 'match.caught-up',
        createdAt: later(first, 2),
        detail: expect.stringContaining('Uitslag: Wikipedia heeft nu hetzelfde'),
        itemId: (await row(roundOne))?.id,
        reason: 'Wikipedia heeft de uitslag van de wedstrijd overgenomen',
        userId: null,
      },
    ])
    // The goals were not the editors', so they follow Wikipedia: the second goal came with it.
    expect(await goalsOf(roundOne)).toEqual([
      [52, 'Oyen', true],
      [88, 'Speler', false],
    ])
  })

  it('treats the result and the goals apart: the goals caught up, the result still differs', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enter(
      roundOne,
      { goalsAgainst: 0, goalsFor: 2, resultSetAt: first },
      ['result', 'goals'],
      [{ minute: 52, ours: true, player: 'Oyen' }],
    )

    const report = await importAt(server, later(first, 2))

    expect(report.kind === 'imported' ? report.warnings : []).toEqual([
      expect.stringContaining('Wikipedia differs from the entry of the editors in the result'),
    ])
    // The result stays the editors' and is still marked; the goals are Wikipedia's again.
    expect(await row(roundOne)).toMatchObject({ goalsAgainst: 0, goalsFor: 2, resultSetAt: first })
    expect(await edits()).toMatchObject([{ goalsEdited: false, resultEdited: true }])
    expect((await log()).map((line) => line.action)).toEqual(['match.differs', 'match.caught-up'])
    expect((await log())[1]?.detail).toContain("Doelpunten: Wikipedia heeft nu hetzelfde als de invoer: 52' Oyen")
  })

  it('treats the kick-off as a part of its own', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const same = await row('Speelronde 11')

    // The editors entered the time Wikipedia has: nothing to keep, so the marker goes.
    await enter('Speelronde 11', { kickoffAt: same?.kickoffAt ?? null }, ['kickoff'])
    await importAt(server, later(first, 2))

    expect(await edits()).toEqual([])
    expect(await log()).toMatchObject([{ action: 'match.caught-up', userId: null }])
    expect((await log())[0]?.detail).toContain('Aftrap: Wikipedia heeft nu hetzelfde')
  })
})

describe('Wikipedia has something else', () => {
  it('keeps the entry and writes the difference once, in the log and in the warning, with both values', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await enter(roundOne, { goalsAgainst: 0, goalsFor: 2, resultSetAt: first }, ['result'])

    const second = later(first, 2)
    const report = await importAt(server, second)
    const id = (await row(roundOne))?.id

    expect(report.kind === 'imported' ? report.warnings : []).toEqual([
      'held, Speelronde 1 (Eredivisie): Wikipedia differs from the entry of the editors in the result: ' +
        'ours sc Heerenveen 2–0 FC Twente, Wikipedia sc Heerenveen 1–0 FC Twente',
    ])
    expect(await row(roundOne)).toMatchObject({ goalsAgainst: 0, goalsFor: 2, resultSetAt: first })
    expect(await log()).toMatchObject([
      {
        action: 'match.differs',
        createdAt: second,
        detail: 'Uitslag: onze invoer: sc Heerenveen 2–0 FC Twente; Wikipedia: sc Heerenveen 1–0 FC Twente',
        itemId: id,
        reason: 'Wikipedia wijkt af van de invoer van de redactie (uitslag)',
        userId: null,
      },
    ])
    expect(await warningOf()).toContain('ours sc Heerenveen 2–0 FC Twente, Wikipedia sc Heerenveen 1–0 FC Twente')

    // The same difference at the next runs is not written again.
    for (const count of [3, 4, 50]) {
      const again = await importAt(server, later(first, count))

      expect(again.kind === 'imported' ? again.warnings : []).toEqual([])
    }

    expect(await log()).toHaveLength(1)
    expect(await edits()).toMatchObject([{ resultEdited: true }])

    // A new difference is news again.
    Object.assign(pages, drawn(pages))
    await importAt(server, later(first, 60))

    expect((await log()).map((line) => line.detail)).toEqual([
      expect.stringContaining('Wikipedia: sc Heerenveen 1–0 FC Twente'),
      expect.stringContaining('Wikipedia: sc Heerenveen 1–1 FC Twente'),
    ])
    expect(await row(roundOne)).toMatchObject({ goalsAgainst: 0, goalsFor: 2 })
  })

  it('keeps the goals of the editors when Wikipedia names other scorers, and says so once', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enter(roundOne, {}, ['goals'], [{ minute: 53, ours: true, player: 'Oyen' }])

    const report = await importAt(server, later(first, 2))
    await importAt(server, later(first, 3))

    expect(report.kind === 'imported' ? report.warnings : []).toEqual([
      expect.stringContaining("in the goals: ours 53' Oyen, Wikipedia 52' Oyen"),
    ])
    expect(await goalsOf(roundOne)).toEqual([[53, 'Oyen', true]])
    expect(await log()).toMatchObject([{ action: 'match.differs', detail: expect.stringContaining('Doelpunten:') }])
    expect(await log()).toHaveLength(1)
  })

  it('lets the parts without a marker follow Wikipedia, with no judgement of the change', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await enter(roundOne, { goalsAgainst: 0, goalsFor: 2, resultSetAt: first }, ['result'])
    pages.programme = pages.programme.replace('|attendance = 21.022', '|attendance = 22.000')
    await importAt(server, later(first, 2))

    expect(await row(roundOne)).toMatchObject({ attendance: 22_000, goalsFor: 2 })
  })
})

describe('a season that is over (import:season)', () => {
  const over = new Date('2027-08-01T12:00:00Z')

  /** Reads the season as `pnpm run import:season 2026/27` does. */
  const importOver = (server: TestServer) =>
    importPastSeason(database.db, fetcherFor([server]), '2026/27', { clock: () => over, origin: server.origin })

  it('keeps the entry while Wikipedia has nothing, and clears it when Wikipedia has the same', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await enter(roundEleven, wonTwoOne, ['result'])
    await enter(roundOne, { goalsAgainst: 1, goalsFor: 1, resultSetAt: first }, ['result'])
    Object.assign(pages, drawn(pages))

    expect(await importOver(server)).toMatchObject({ kind: 'imported' })
    expect(await row(roundEleven)).toMatchObject({ goalsFor: 2, status: 'played' })
    expect((await edits()).map((edit) => edit.resultEdited)).toEqual([true])
    expect(await log()).toMatchObject([{ action: 'match.caught-up', createdAt: over, userId: null }])
  })

  it('writes a difference once here too', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enter(roundOne, { goalsAgainst: 0, goalsFor: 2, resultSetAt: first }, ['result'])
    await importOver(server)
    await importOver(server)

    expect(await log()).toMatchObject([{ action: 'match.differs' }])
    expect(await log()).toHaveLength(1)
  })
})
