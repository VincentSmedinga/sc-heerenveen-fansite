// Fills the league matches of 2006/07 that the old fansite recorded nothing of, and makes the
// two play-off matches against Ajax, from the programme on the page of the season on the Dutch
// Wikipedia (#1623). It follows the rule of #1621: it only fills a gap. A result that is there
// is never overwritten, a result or goals the editors entered stay, and a match that has goals
// keeps them. A goal is stored only when the list adds up to the result, and a goal of ours is
// tied to a player of the season by `playerLinker`, which never guesses between two players
// with the same name. A second run changes nothing: the gaps are filled by then.
import type { Database } from '@fansite/db/client'
import type { Match } from '@fansite/db/schema'

import { lockedFields } from '@fansite/db/match-edits'
import { createPersonBook } from '@fansite/db/persons'
import { matchEdits, matches, matchGoals, matchReports, players } from '@fansite/db/schema'
import { and, eq, inArray, isNull } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { ProgrammeRow } from './read-season-programme.ts'

import { wikipediaOrigin } from './import-matches.ts'
import { isGoalOfOurPlayer, playerLinker } from './link-players.ts'
import { storeGoals } from './match-changes.ts'
import { clubFinder } from './old-site-clubs.ts'
import { fetchCrossTables } from './old-site-cross-tables.ts'
import { readSeasonProgramme } from './read-season-programme.ts'
import { transfersPageTitle } from './read-transfers.ts'
import { months } from './read-wikipedia.ts'

/** The only season whose programme is read: the last one of the old fansite. */
export const programmeSeason = '2006/07'

/** What a fill did, in the shape of #1621's: the matches that got a result or were made. */
export type ProgrammeReport = { filled: number; goals: number; lines: string[]; made: number }

/** Whether a season has a programme on its page to fill from. */
export const hasProgramme = (season: string) => season === programmeSeason

type Context = {
  isNew: boolean
  label: string
  link: ReturnType<typeof playerLinker>
  personBook: Awaited<ReturnType<typeof createPersonBook>>
  report: ProgrammeReport
}

/**
 * Asks Wikipedia for the page of the season and fills from its programme: the result and the
 * goals of every league match of the old fansite that has none, and the play-offs. It never
 * throws for a page that cannot be read: that is a line in the log and nothing else.
 */
export async function fillFromSeasonProgramme(
  db: Database,
  fetcher: Fetcher,
  season: string,
  { origin = wikipediaOrigin, pause }: { origin?: string; pause?: number } = {},
  now = new Date(),
): Promise<ProgrammeReport> {
  const report: ProgrammeReport = { filled: 0, goals: 0, lines: [], made: 0 }

  if (!hasProgramme(season)) {
    return report
  }

  const [fetched] = await fetchCrossTables(
    fetcher,
    origin,
    [{ competition: 'Eredivisie', season, title: transfersPageTitle(season) }],
    pause,
  )

  if (fetched?.kind !== 'page') {
    report.lines.push(
      `Programme ${season}: not read from Wikipedia, ${fetched?.kind === 'none' ? fetched.reason : 'no page'}`,
    )

    return report
  }

  const read = readSeasonProgramme(fetched.text)

  if (read.kind === 'none') {
    report.lines.push(`Programme ${season}: not read from Wikipedia, ${read.reason}`)

    return report
  }

  report.lines.push(...read.problems.map((problem) => `Programme ${season}: ${problem}`))

  const findClub = await clubFinder(db)
  const squad = await db.select().from(players).where(eq(players.season, season))
  const link = playerLinker(squad)
  const personBook = await createPersonBook(db)

  for (const row of read.rows) {
    const club = findClub([row.opponentPage ?? '', row.opponent].filter((name) => name !== ''))
    const label = `${season} ${row.competition} ${isoDate(season, row)} against ${row.opponent}`

    if (club === undefined) {
      report.lines.push(`${label}: left as it is, no club with that name in the database`)
      continue
    }

    const date = isoDate(season, row)
    let match: Match | undefined
    let isNew = false

    if (row.round === null) {
      const found = (
        await db
          .select()
          .from(matches)
          .where(and(eq(matches.season, season), eq(matches.competition, row.competition), eq(matches.clubId, club.id)))
      ).filter((one) => one.matchDate === date && one.home === row.home)

      if (found.length !== 1) {
        report.lines.push(
          `${label}: left as it is, ${found.length === 0 ? 'the archive has no match with this club on that day' : 'the archive has more than one match with this club on that day'}`,
        )
        continue
      }

      match = found[0]
    } else {
      match = (
        await db
          .select()
          .from(matches)
          .where(
            and(eq(matches.season, season), eq(matches.competition, row.competition), eq(matches.round, row.round)),
          )
      )[0]

      if (match === undefined) {
        if (row.score === null) {
          report.lines.push(`${label}: not made, the page has no result for it`)
          continue
        }

        const [{ insertId }] = await db.insert(matches).values({
          clubId: club.id,
          competition: row.competition,
          dataSource: 'wikipedia',
          dateText: `${row.day} ${months[row.month - 1] ?? ''} ${date.slice(0, 4)}`,
          goalsAgainst: row.score.against,
          goalsFor: row.score.for,
          home: row.home,
          matchDate: date,
          opponent: club.name,
          resultSetAt: now,
          round: row.round,
          season,
          status: 'played',
        })

        isNew = true
        report.made += 1
        report.lines.push(
          `${label}: made as ${row.competition} ${row.round}, result ${row.score.for}-${row.score.against} from the programme`,
        )
        ;[match] = await db.select().from(matches).where(eq(matches.id, insertId))
      }
    }

    if (match === undefined) {
      continue
    }

    await fillMatch(db, match, row, { isNew, label, link, personBook, report })
  }

  return report
}

/** Fills the result and the goals of one match, leaving what is there. */
async function fillMatch(db: Database, found: Match, row: ProgrammeRow, context: Context): Promise<void> {
  const { isNew, label, link, personBook, report } = context
  let match = found
  const [edit] = await db.select().from(matchEdits).where(eq(matchEdits.matchId, match.id))
  const locked = lockedFields(edit)

  if (match.dataSource !== 'oude-fansite' && !isNew && match.competition === 'Eredivisie') {
    report.lines.push(`${label}: left as it is, the match is not one of the archive`)

    return
  }

  if (row.score === null) {
    report.lines.push(`${label}: ${row.goalsProblem ?? 'no result on the page'}`)

    return
  }

  const gap =
    match.goalsFor === null && match.goalsAgainst === null && ['result_unknown', 'scheduled'].includes(match.status)

  if (gap && !locked.includes('goalsFor')) {
    // The same conditions again in the update, so a result that arrived in the meantime stays.
    await db
      .update(matches)
      .set({ goalsAgainst: row.score.against, goalsFor: row.score.for, status: 'played' })
      .where(and(eq(matches.id, match.id), isNull(matches.goalsFor), isNull(matches.goalsAgainst)))
    match = { ...match, goalsAgainst: row.score.against, goalsFor: row.score.for, status: 'played' }
    report.filled += 1
    report.lines.push(`${label}: result ${row.score.for}-${row.score.against} filled from the programme`)
  } else if (match.goalsFor !== row.score.for || match.goalsAgainst !== row.score.against) {
    report.lines.push(
      `${label}: left as it is, the database has ${match.goalsFor ?? '?'}-${match.goalsAgainst ?? '?'} and the programme ${row.score.for}-${row.score.against}`,
    )

    return
  }

  if (edit?.goalsEdited === true) {
    return
  }

  const stored = await db.select().from(matchGoals).where(eq(matchGoals.matchId, match.id))

  if (stored.length > 0 || !(isNew || (await recordedNothing(db, match)))) {
    return
  }
  if (row.goals === null) {
    report.lines.push(`${label}: no goals stored, ${row.goalsProblem ?? 'the scorers cannot be read'}`)

    return
  }
  if (row.goals.length === 0) {
    return
  }

  const goals = []

  for (const goal of row.goals) {
    const personId = goal.playerPage === null ? null : await personBook.resolve(goal.playerPage)

    goals.push({ ...goal, personId, playerId: link({ ...goal, personId }) })
  }

  await storeGoals(db, match.id, goals)
  report.goals += goals.length

  const without = goals.filter((goal) => isGoalOfOurPlayer(goal) && goal.playerId === null)

  if (without.length > 0) {
    report.lines.push(
      `${label}: ${without.length} ${without.length === 1 ? 'goal' : 'goals'} of ours without a player: ${without.map((goal) => `${goal.player} '${goal.minute ?? '?'}`).join(', ')}`,
    )
  }
}

/** The date with the year of the season: August to December is the first, else the next. */
function isoDate(season: string, row: Pick<ProgrammeRow, 'day' | 'month'>): string {
  const first = Number(season.slice(0, 4))
  const year = row.month >= 8 ? first : first + 1

  return `${year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
}

/**
 * Whether the old fansite recorded nothing of a match but the result: no referee, audience,
 * half-time, note or report. Only such a match gets goals from the page, because the step of
 * the goals of the old fansite takes the goals away again from a match whose files have none,
 * unless the files have nothing at all of it (see `importOldSiteGoals`).
 */
async function recordedNothing(db: Database, match: Match): Promise<boolean> {
  if (
    match.referee !== null ||
    match.attendance !== null ||
    match.halfTimeFor !== null ||
    match.note !== null ||
    match.dataSource !== 'oude-fansite'
  ) {
    return false
  }

  const reports = await db
    .select()
    .from(matchReports)
    .where(inArray(matchReports.matchId, [match.id]))

  return reports.length === 0
}
