import type { AlertMail } from '@fansite/db/alerts'
import type { TestDatabase } from '@fansite/db/test-database'

import { decideConflict } from '@fansite/db/match-conflicts'
import { encodeGoals, encodeMatch, type MatchPart } from '@fansite/db/match-edits'
import {
  adminUsers,
  auditLog,
  matchAppearances,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  matchImports,
  matchReports,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runChangesCommand } from './import-changes.ts'
import { runImport } from './import-feeds.ts'
import { importMatches, importPastSeason } from './import-matches.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { articleRoutes } from './test-articles.ts'
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
    'league_results',
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

  const server = await startServer({ ...articleRoutes(Object.values(original)), ...routes })

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
    factsEdited: parts.includes('facts'),
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

  it('keeps the goals of a match report with the players they point to when the result changes (issue 829)', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)

    const before = await row(roundOne)
    const matchId = before?.id ?? 0

    // The report is saved: it has the player, and the goals of the match are the report's and
    // marked, as the admin does it.
    await database.db.insert(matchReports).values({ matchId, savedBy: adminId, status: 'klaar' })

    const [appearance] = await database.db
      .insert(matchAppearances)
      .values({ matchId, name: 'Oyen', ours: true, shirtNumber: 9, starter: true })
      .$returningId()

    await enter(roundOne, {}, ['goals'], [{ minute: 52, ours: true, player: 'Oyen' }])
    await database.db
      .update(matchGoals)
      .set({ appearanceId: appearance?.id ?? 0 })
      .where(eq(matchGoals.matchId, matchId))

    // Wikipedia now says 1-1 with a second goal: the result is not marked, so it follows.
    Object.assign(pages, drawn(original))
    await importAt(server, later(first, 2))
    await importAt(server, later(first, 3))

    expect(await row(roundOne)).toMatchObject({ goalsAgainst: 1, goalsFor: 1 })
    expect(await goalsOf(roundOne)).toEqual([[52, 'Oyen', true]])
    expect(await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, matchId))).toMatchObject([
      { appearanceId: appearance?.id },
    ])
    expect(await database.db.select().from(matchReports)).toMatchObject([{ matchId, status: 'klaar' }])
    expect(await edits()).toMatchObject([{ goalsEdited: true, resultEdited: false }])
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

describe('the facts of a match (issue 969)', () => {
  it('keeps the spectators and the referee of the editors, and keeps the difference once as a change that waits', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enter(roundOne, { attendance: 21_500, referee: 'Bas Nijhuis' }, ['facts'])

    const second = later(first, 2)
    const report = await importAt(server, second)

    expect(await row(roundOne)).toMatchObject({ attendance: 21_500, referee: 'Bas Nijhuis' })
    expect(report.kind === 'imported' ? report.warnings : []).toEqual([
      expect.stringContaining('Wikipedia differs from the entry of the editors in the facts'),
    ])
    expect(await database.db.select().from(matchChanges)).toMatchObject([
      { newValue: expect.stringContaining('toeschouwers 21.022'), part: 'facts', status: 'pending' },
    ])
    expect(await edits()).toMatchObject([{ factsEdited: true }])

    // The same difference at the next runs is not reported again, and the entry stays.
    const again = await importAt(server, later(first, 3))

    expect(again.kind === 'imported' ? again.warnings : []).toEqual([])
    expect(await row(roundOne)).toMatchObject({ attendance: 21_500, referee: 'Bas Nijhuis' })
    expect(await log()).toHaveLength(1)
  })

  it('clears the marker when Wikipedia says the same, and the facts follow Wikipedia from then on', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    // The entry is what Wikipedia says already.
    await enter(roundOne, {}, ['facts'])
    await importAt(server, later(first, 2))

    expect(await edits()).toEqual([])
    expect(await log()).toMatchObject([{ action: 'match.caught-up' }])

    pages.programme = pages.programme.replace('|attendance = 21.022', '|attendance = 22.000')
    await importAt(server, later(first, 3))

    expect(await row(roundOne)).toMatchObject({ attendance: 22_000 })
  })

  it('leaves the facts alone that Wikipedia does not say anything about', async () => {
    const { server } = await serve()

    await importAt(server, first)
    // Wikipedia has no referee and no note, so the entry adds them without a difference.
    await enter(roundOne, { note: 'Begon later door file', referee: 'Bas Nijhuis' }, ['facts'])
    await importAt(server, later(first, 2))

    expect(await row(roundOne)).toMatchObject({ note: 'Begon later door file', referee: 'Bas Nijhuis' })
    expect(await database.db.select().from(matchChanges)).toEqual([])
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

describe('a difference becomes a change that waits (issue 577)', () => {
  const days = (count: number) => count * 24 * hours(1)
  const changes = () => database.db.select().from(matchChanges).orderBy(asc(matchChanges.id))

  /** Round 1 as the editors have it: 2-0, Oyen in minute 53. Wikipedia: 1-0 and minute 52. */
  async function enterRoundOne() {
    await enter(
      roundOne,
      { goalsAgainst: 0, goalsFor: 2, resultSetAt: first },
      ['result', 'goals'],
      [{ minute: 53, ours: true, player: 'Oyen' }],
    )
  }

  it('keeps each part that differs once, with both values and what Wikipedia proposes', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enterRoundOne()

    for (const count of [2, 3, 50]) {
      await importAt(server, later(first, count))
    }

    const id = (await row(roundOne))?.id

    expect(await changes()).toMatchObject([
      {
        changed: 'uitslag',
        class: 'suspicious',
        matchId: id,
        newValue: 'sc Heerenveen 1–0 FC Twente',
        oldValue: 'sc Heerenveen 2–0 FC Twente',
        part: 'result',
        reason: 'wijkt af van de invoer van de redactie',
        status: 'pending',
        timesSeen: 3,
      },
      { changed: 'doelpunten', part: 'goals', status: 'pending', timesSeen: 3 },
    ])
    expect(JSON.parse((await changes())[0]?.proposal ?? '{}')).toMatchObject({ goalsFor: 1, part: 'result' })
    expect(JSON.parse((await changes())[1]?.proposal ?? '{}')).toMatchObject({
      goals: [{ minute: 52, player: 'Oyen' }],
      part: 'goals',
    })
    expect(await row(roundOne)).toMatchObject({ goalsFor: 2 })
    expect(await goalsOf(roundOne)).toEqual([[53, 'Oyen', true]])
  })

  it('records a difference that the log and the warning knew from before, without saying it again', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enterRoundOne()
    await database.db
      .update(matchEdits)
      .set({ reportedResult: 'sc Heerenveen 1–0 FC Twente' })
      .where(eq(matchEdits.matchId, (await row(roundOne))?.id ?? 0))

    const report = await importAt(server, later(first, 2))

    expect(report.kind === 'imported' ? report.warnings.join('') : '').not.toContain('in the result')
    expect(await changes()).toMatchObject([{ part: 'result', status: 'pending' }, { part: 'goals' }])
    expect(await log()).toHaveLength(1)
  })

  it('takes Wikipedia over for the part after seven days, and says so in the log', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enterRoundOne()
    await importAt(server, later(first, 2))

    const seen = later(first, 2).getTime()

    await importAt(server, new Date(seen + days(7) - hours(1)))
    expect(await row(roundOne)).toMatchObject({ goalsFor: 2 })

    const stood = new Date(seen + days(7))

    await importAt(server, stood)

    expect(await row(roundOne)).toMatchObject({ goalsAgainst: 0, goalsFor: 1 })
    expect(await goalsOf(roundOne)).toEqual([[52, 'Oyen', true]])
    expect(await edits()).toEqual([])
    expect(await changes()).toMatchObject([
      { decidedAt: stood, resolution: 'stood', status: 'accepted' },
      { resolution: 'stood', status: 'accepted' },
    ])
    expect((await log()).filter((line) => line.action === 'match.take-over')).toMatchObject([
      {
        createdAt: stood,
        detail: expect.stringContaining('Uitslag: onze invoer'),
        reason: expect.stringContaining('zeven dagen'),
        userId: null,
      },
      { detail: expect.stringContaining('Doelpunten: onze invoer'), userId: null },
    ])
  })

  it('does not take over a value that Wikipedia changed again, but keeps the new one', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await enterRoundOne()
    await importAt(server, later(first, 2))
    Object.assign(pages, drawn(pages))
    await importAt(server, new Date(later(first, 2).getTime() + days(7)))

    expect(await row(roundOne)).toMatchObject({ goalsFor: 2 })
    expect(await changes()).toMatchObject([
      { newValue: 'sc Heerenveen 1–0 FC Twente', resolution: 'replaced', status: 'rejected' },
      { newValue: "52' Oyen", resolution: 'replaced', status: 'rejected' },
      { newValue: 'sc Heerenveen 1–1 FC Twente', status: 'pending' },
      { status: 'pending' },
    ])
  })

  it('lets the change lapse when Wikipedia puts the value of the editors back', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await enter(roundOne, { goalsAgainst: 1, goalsFor: 1, resultSetAt: first }, ['result'])
    await importAt(server, later(first, 2))
    expect(await changes()).toMatchObject([{ status: 'pending' }])

    Object.assign(pages, drawn(pages))
    await importAt(server, later(first, 3))

    expect(await changes()).toMatchObject([{ resolution: 'reverted', status: 'rejected' }])
    expect(await edits()).toEqual([])
    expect((await log()).map((line) => line.action)).toEqual(['match.differs', 'match.caught-up'])
    expect((await log())[1]?.detail).toContain('De afwijking is vervallen')
  })

  it('does not ask again after an editor decided to keep the entry', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enterRoundOne()
    await importAt(server, later(first, 2))
    await database.db.transaction(async (transaction) => {
      const [change] = await transaction.select().from(matchChanges).where(eq(matchChanges.part, 'result'))

      expect(
        await decideConflict(
          transaction,
          change?.id ?? 0,
          { kind: 'keep', reason: 'Wij hebben het goed', resolution: 'person', userId: adminId },
          later(first, 3),
        ),
      ).toBe('done')
    })
    await importAt(server, later(first, 4))
    await importAt(server, new Date(later(first, 2).getTime() + days(8)))

    expect(await row(roundOne)).toMatchObject({ goalsFor: 2 })
    expect(await changes()).toMatchObject([{ resolution: 'person', status: 'rejected' }, { part: 'goals' }])
    expect((await log()).filter((line) => line.action === 'match.keep')).toMatchObject([
      { reason: 'Wij hebben het goed', userId: adminId },
    ])
  })

  it.each(['command', 'admin'] as const)(
    'gives the same outcome when the %s takes Wikipedia over for the result',
    async (route) => {
      const { server } = await serve()

      await importAt(server, first)
      await enterRoundOne()
      await importAt(server, later(first, 2))

      const [result] = await database.db.select().from(matchChanges).where(eq(matchChanges.part, 'result'))
      const decidedAt = later(first, 3)

      if (route === 'command') {
        const clock = () => decidedAt

        expect(await runChangesCommand(database.url, ['accept', String(result?.id)], { clock, write: () => {} })).toBe(
          0,
        )
      } else {
        await database.db.transaction((transaction) =>
          decideConflict(
            transaction,
            result?.id ?? 0,
            { kind: 'take-over', reason: 'Wikipedia heeft gelijk', resolution: 'person', userId: adminId },
            decidedAt,
          ),
        )
      }

      // The result is Wikipedia's, the goals are still the editors', and the change is decided.
      expect(await row(roundOne)).toMatchObject({
        goalsAgainst: 0,
        goalsFor: 1,
        resultSetAt: decidedAt,
        status: 'played',
      })
      expect(await goalsOf(roundOne)).toEqual([[53, 'Oyen', true]])
      expect(await edits()).toMatchObject([{ goalsEdited: true, resultEdited: false }])
      expect((await changes()).map((change) => [change.part, change.status, change.resolution])).toEqual([
        ['result', 'accepted', 'person'],
        ['goals', 'pending', null],
      ])
      expect((await log()).filter((line) => line.action === 'match.take-over')).toMatchObject([
        {
          createdAt: decidedAt,
          detail: expect.stringContaining('Uitslag: onze invoer'),
          userId: route === 'admin' ? adminId : null,
        },
      ])
    },
  )

  it('keeps the entry and says so when the command rejects a difference', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await enterRoundOne()
    await importAt(server, later(first, 2))

    expect(
      await runChangesCommand(database.url, ['reject', 'all'], { clock: () => later(first, 3), write: () => {} }),
    ).toBe(0)
    expect(await row(roundOne)).toMatchObject({ goalsFor: 2 })
    expect(await edits()).toMatchObject([{ goalsEdited: true, resultEdited: true }])
    expect(await changes()).toMatchObject([{ resolution: 'person', status: 'rejected' }, { status: 'rejected' }])
    expect((await log()).filter((line) => line.action === 'match.keep')).toHaveLength(2)
  })

  describe('the mail to the beheerders', () => {
    const env = {
      MAIL_FROM: 'fansite@example.org',
      SITE_ENV: 'acceptance',
      SMTP_HOST: 'mail.example.org',
      SMTP_PASSWORD: 'geheim',
      SMTP_PORT: '465',
      SMTP_USER: 'fansite@example.org',
    }

    /** One run of the whole import, as cron starts it, with a mailer that sends nothing. */
    async function runAt(server: TestServer, at: Date, send: (mail: AlertMail) => Promise<void>) {
      const lines: string[] = []
      const code = await runImport(database.url, {
        alerts: { env, send },
        clock: () => at,
        makeFetcher: (robots) => fetcherFor([server], { robots }),
        wikipediaOrigin: server.origin,
        write: (line) => lines.push(line),
      })

      return { code, lines }
    }

    it('mails once for each difference, not at the next run, and the import goes on when a mail fails', async () => {
      const { server } = await serve()
      const mails: AlertMail[] = []
      const collect = (mail: AlertMail) => Promise.resolve(void mails.push(mail))
      const fail = () => Promise.reject(new Error('De server is weg'))

      await runAt(server, first, collect)
      await enterRoundOne()

      const broken = await runAt(server, later(first, 2), fail)

      expect(broken.code).toBe(0)
      expect(broken.lines.filter((line) => line.startsWith('Conflict mail:'))).toHaveLength(2)
      expect(await changes()).toMatchObject([{ mailedAt: null }, { mailedAt: null }])

      // The next run tries again and gets through; the run after that has nothing left to mail.
      await runAt(server, later(first, 3), collect)
      await runAt(server, later(first, 4), collect)

      expect(mails.map((mail) => mail.to)).toEqual(['redactie@example.org', 'redactie@example.org'])
      expect(mails.map((mail) => mail.subject.split(':')[0])).toEqual([
        '[acceptatie] Wikipedia wijkt af van onze invoer',
        '[acceptatie] Wikipedia wijkt af van onze invoer',
      ])
      expect(mails[0]?.text).toContain('Wikipedia: sc Heerenveen 1–0 FC Twente')
    })

    it('mails again when the import takes Wikipedia over after seven days', async () => {
      const { server } = await serve()
      const mails: AlertMail[] = []
      const collect = (mail: AlertMail) => Promise.resolve(void mails.push(mail))

      await runAt(server, first, collect)
      await enterRoundOne()
      await runAt(server, later(first, 2), collect)
      await runAt(server, new Date(later(first, 2).getTime() + days(7)), collect)

      expect(mails.map((mail) => mail.subject.split(':')[0])).toEqual([
        '[acceptatie] Wikipedia wijkt af van onze invoer',
        '[acceptatie] Wikipedia wijkt af van onze invoer',
        '[acceptatie] De import nam Wikipedia over',
        '[acceptatie] De import nam Wikipedia over',
      ])
    })
  })
})

describe('a match that is being played (issue 906)', () => {
  /** The day after round 11 (31 October): before it Wikipedia has no result for the match. */
  const afterMatch = new Date('2026-11-01T12:00:00Z')

  /** Round 11 on Wikipedia once the match is over: 2-1 with the three goals of the editors. */
  function overWithTheSameGoals(pages: Pages, ours = 2, theirs = 1, oyenAt = 12) {
    const score = `${ours} – ${theirs}`
    const oursGoals = [
      `[[Luca Oyen|Oyen]] {{goal|${oyenAt}}}`,
      '[[Bernt Klaverboer|Klaverboer]] {{goal|77}}',
      '[[Luca Oyen|Oyen]] {{goal|85}}',
    ]
      .slice(0, ours)
      .join('<br />')

    return {
      ...pages,
      programme: pages.programme.replace(
        /\|score =\s+–\s*\n\|team2 = \[\[N\.E\.C\.\]\]\n\|goals1 =\s*\n\|goals2 =\s*\n/u,
        `|score = ${score}\n|team2 = [[N.E.C.]]\n|goals1 = ${oursGoals}\n|goals2 = {{goal|40}} [[Test Speler|Sibbing]]\n`,
      ),
      // The table has the result too, or the import does not believe the matches.
      standings: pages.standings
        .replace(
          '|win_HEE=4 |draw_HEE=3 |loss_HEE=3 |gf_HEE=18 |ga_HEE=13',
          `|win_HEE=5 |draw_HEE=3 |loss_HEE=3 |gf_HEE=${18 + ours} |ga_HEE=${13 + theirs}`,
        )
        .replace(
          '|win_NEC=2 |draw_NEC=5 |loss_NEC=3 |gf_NEC=17 |ga_NEC=18',
          `|win_NEC=2 |draw_NEC=5 |loss_NEC=4 |gf_NEC=${17 + theirs} |ga_NEC=${18 + ours}`,
        ),
    }
  }

  /**
   * The editors fill in a report while the match is played, as the admin does: the match stays
   * `scheduled` without a result, the report is bezig and the goals are marked as the editors'.
   */
  async function playLive() {
    await enter(roundEleven, {}, ['goals'], elevenGoals)

    const matchId = (await row(roundEleven))?.id ?? 0

    await database.db.insert(matchReports).values({ matchId, savedBy: adminId, status: 'bezig' })
  }

  /** The editor uses the button "Wedstrijd afgelopen": the result is entered and marked. */
  async function pressTheButton(result: { goalsAgainst: number; goalsFor: number }) {
    const matchId = (await row(roundEleven))?.id ?? 0

    await database.db
      .update(matches)
      .set({ ...result, resultSetAt: first, status: 'played' })
      .where(eq(matches.id, matchId))
    await database.db.update(matchEdits).set({ resultEdited: true }).where(eq(matchEdits.matchId, matchId))
  }

  it('keeps the match without a result and the goals of the report while Wikipedia has nothing, run after run', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await playLive()

    for (const count of [1, 2, 30]) {
      const report = await importAt(server, later(first, count))

      expect(report.kind === 'imported' ? report.warnings : []).toEqual([])
    }

    expect(await row(roundEleven)).toMatchObject({ goalsAgainst: null, goalsFor: null, status: 'scheduled' })
    expect(await goalsOf(roundEleven)).toHaveLength(3)
    expect(await edits()).toMatchObject([{ goalsEdited: true, resultEdited: false }])
    expect(await log()).toEqual([])
  })

  it('stops being live when the import is first: the result follows Wikipedia, and the same goals catch up', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await playLive()
    Object.assign(pages, overWithTheSameGoals(pages))
    await importAt(server, afterMatch)

    expect(await row(roundEleven)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, status: 'played' })
    expect(await edits()).toEqual([])
    expect((await log()).map((line) => line.action)).toEqual(['match.caught-up'])
    expect(await database.db.select().from(matchReports)).toMatchObject([{ status: 'bezig' }])
  })

  it('follows the existing handling when the import is first and the goals differ from the report', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await playLive()
    // The same result, but Oyen scored in minute 14 and not 12.
    Object.assign(pages, overWithTheSameGoals(pages, 2, 1, 14))

    const report = await importAt(server, afterMatch)

    expect(await row(roundEleven)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, status: 'played' })
    // The goals stay the editors', and the difference is said once, with the change that waits.
    expect(await goalsOf(roundEleven)).toHaveLength(3)
    expect(await edits()).toMatchObject([{ goalsEdited: true }])
    expect(report.kind === 'imported' ? report.warnings : []).toEqual([
      expect.stringContaining('Wikipedia differs from the entry of the editors in the goals'),
    ])
    expect((await log()).filter((line) => line.action === 'match.differs')).toHaveLength(1)
  })

  it('stops being live when the button is first, and Wikipedia with the same result catches up', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await playLive()
    await pressTheButton({ goalsAgainst: 1, goalsFor: 2 })

    const report = await importAt(server, afterMatch)

    expect(report.kind === 'imported' ? report.warnings : []).toEqual([])
    expect(await row(roundEleven)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, status: 'played' })

    Object.assign(pages, overWithTheSameGoals(pages))
    await importAt(server, later(afterMatch, 2))

    expect(await row(roundEleven)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, status: 'played' })
    expect(await edits()).toEqual([])
    expect((await log()).map((line) => line.action)).toEqual(['match.caught-up', 'match.caught-up'])
  })

  it('keeps the result of the button and says so once when Wikipedia has another result later', async () => {
    const { pages, server } = await serve()

    await importAt(server, first)
    await playLive()
    await pressTheButton({ goalsAgainst: 1, goalsFor: 2 })
    Object.assign(pages, overWithTheSameGoals(pages, 3, 1))

    const report = await importAt(server, afterMatch)

    expect(await row(roundEleven)).toMatchObject({ goalsAgainst: 1, goalsFor: 2, status: 'played' })
    expect(report.kind === 'imported' ? report.warnings : []).toContainEqual(
      expect.stringContaining('Wikipedia differs from the entry of the editors in the result'),
    )
    expect((await log()).filter((line) => line.action === 'match.differs').map((line) => line.detail)).toEqual(
      expect.arrayContaining([expect.stringContaining('Uitslag')]),
    )
    expect(await edits()).toMatchObject([{ resultEdited: true }])
  })
})
