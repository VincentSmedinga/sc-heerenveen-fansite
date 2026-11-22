import { isFansPartOn } from '@fansite/shared/fans-env'
import { minutesPlayed, reportFinished } from '@fansite/shared/match-report'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { PlayerPosition } from './schema.ts'

import { readMatchReport, reportForRules } from './match-reports.ts'
import { clubs, matchAppearances, matches, matchPlayerRatings, playerRatings, players, supporters } from './schema.ts'

// The window of the game Uitblinker (issue 1470): which match supporters can rate, who they can
// rate, until when, and what happens when the window closes. It lives here, next to the schema,
// so the site and the run of the importer (which closes the window) ask the same questions.

/** A player has to have played this many minutes to be rated. */
export const ratingMinimumMinutes = 30

/** The window closes at the latest this many days after the start of the match. */
export const ratingWindowDays = 7

const day = 24 * 60 * 60 * 1000

/** The match of a window: what the page shows of it and what the rules need. */
export type RatingMatch = {
  clubSlug: string
  competition: string
  dateText: null | string
  extraTime: boolean
  goalsAgainst: null | number
  goalsFor: null | number
  home: boolean
  id: number
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  round: string
  season: string
  status: 'cancelled' | 'played' | 'postponed' | 'scheduled'
}

/** A player a supporter can rate: the rating belongs to the appearance in the report. */
export type RatingPlayer = {
  appearanceId: number
  assist: boolean
  goal: boolean
  minutes: number
  name: string
  position: null | PlayerPosition
}

/**
 * Where the game stands for the last played match. `closed` is a window that closed (by the
 * start of the next match or after seven days), `open` one that supporters can rate in, and
 * `waiting` a match whose report is not finished yet, so the minutes are not known. `next` is
 * the next match that has not been played, whether or not its kick-off is known.
 */
export type RatingWindow =
  | { closesAt: Date; match: RatingMatch; next?: RatingMatch; startsAt: Date; state: 'waiting' }
  | {
      closesAt: Date
      match: RatingMatch
      next?: RatingMatch
      players: RatingPlayer[]
      startsAt: Date
      state: 'closed' | 'open'
    }
  | { next?: RatingMatch; state: 'none' }

const columns = {
  clubSlug: clubs.slug,
  competition: matches.competition,
  dateText: matches.dateText,
  extraTime: matches.extraTime,
  goalsAgainst: matches.goalsAgainst,
  goalsFor: matches.goalsFor,
  home: matches.home,
  id: matches.id,
  kickoffAt: matches.kickoffAt,
  matchDate: matches.matchDate,
  opponent: matches.opponent,
  round: matches.round,
  season: matches.season,
  status: matches.status,
}

/**
 * The first moment of a match: the kick-off, or the start of its day (UTC) while the time is
 * not known. The window counts from it, and so does the rule that an account has to be older.
 */
export const startOf = (match: Pick<RatingMatch, 'kickoffAt' | 'matchDate'>) =>
  match.kickoffAt ?? new Date(`${match.matchDate}T00:00:00Z`)

/** What one run of the closing of windows did. */
export type CloseWindowsReport = { closed: number }

/** What the writing of the grades came to. */
export type SaveRatingsResult = { answer: 'closed' } | { answer: 'late' } | { answer: 'saved'; changed: boolean }

/**
 * Closes the windows that are over: for each played match that has grades of supporters and no
 * averages with the source `fans` yet, it writes the averages to `match_player_ratings`, with
 * the number of grades and the spread. Grades of a blocked account do not count; grades of a
 * closed account (without a link) do. It does nothing while the game, or accounts, are off.
 * Running it again changes nothing.
 */
export async function closeRatingWindows(
  db: Database,
  now = new Date(),
  env: Record<string, string | undefined> = process.env,
): Promise<CloseWindowsReport> {
  if (!isFansPartOn('uitblinker', env)) {
    return { closed: 0 }
  }

  const candidates = await db
    .selectDistinct(columns)
    .from(playerRatings)
    .innerJoin(matchAppearances, eq(matchAppearances.id, playerRatings.appearanceId))
    .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(
      sql`not exists (select 1 from ${matchPlayerRatings} where ${matchPlayerRatings.matchId} = ${matches.id} and ${matchPlayerRatings.source} = 'fans')`,
    )
  let closed = 0

  for (const match of candidates) {
    const later = await scheduledAfter(db, match)
    const closing = closesAt(
      match,
      later.flatMap((candidate) => (candidate.kickoffAt === null ? [] : [candidate.kickoffAt])),
    )

    if (closing.getTime() > now.getTime()) {
      continue
    }

    await db.execute(sql`
      INSERT INTO match_player_ratings (match_id, player_id, source, average, rating_count, spread)
      SELECT a.match_id, a.player_id, 'fans', ROUND(AVG(r.grade), 2), COUNT(*), ROUND(COALESCE(STDDEV_POP(r.grade), 0), 2)
      FROM player_ratings r
      JOIN match_appearances a ON a.id = r.appearance_id
      LEFT JOIN supporters s ON s.id = r.supporter_id
      WHERE a.match_id = ${match.id} AND a.player_id IS NOT NULL AND (r.supporter_id IS NULL OR s.disabled_at IS NULL)
      GROUP BY a.match_id, a.player_id
      ON DUPLICATE KEY UPDATE average = VALUES(average), rating_count = VALUES(rating_count), spread = VALUES(spread)
    `)
    closed++
  }

  return { closed }
}

/**
 * The moment the window of a match closes: the first known kick-off of a later match, or seven
 * days after the start of the match, whichever comes first.
 */
export function closesAt(match: Pick<RatingMatch, 'kickoffAt' | 'matchDate'>, laterKickoffs: readonly Date[]) {
  const starts = startOf(match).getTime()
  const latest = starts + ratingWindowDays * day
  const next = laterKickoffs.map((moment) => moment.getTime()).filter((moment) => moment > starts)

  return new Date(Math.min(latest, ...next))
}

/** The grades a supporter gave for a match, by the number of the appearance. */
export async function findOwnRatings(db: Database, supporterId: number, matchId: number) {
  const rows = await db
    .select({ appearanceId: playerRatings.appearanceId, grade: playerRatings.grade })
    .from(playerRatings)
    .innerJoin(matchAppearances, eq(matchAppearances.id, playerRatings.appearanceId))
    .where(and(eq(playerRatings.supporterId, supporterId), eq(matchAppearances.matchId, matchId)))

  return new Map(rows.map((row) => [row.appearanceId, row.grade]))
}

/** The window of the last played match, or `none` when no match was played yet. */
export async function findRatingWindow(db: Database, now = new Date()): Promise<RatingWindow> {
  const [last] = await db
    .select(columns)
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(and(eq(matches.status, 'played'), sql`${matches.matchDate} <= ${now.toISOString().slice(0, 10)}`))
    .orderBy(desc(matches.matchDate), sql`${matches.kickoffAt} is null`, desc(matches.kickoffAt), desc(matches.id))
    .limit(1)

  if (last === undefined) {
    const [next] = await db
      .select(columns)
      .from(matches)
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(eq(matches.status, 'scheduled'))
      .orderBy(asc(matches.matchDate), asc(matches.id))
      .limit(1)

    return next === undefined ? { state: 'none' } : { next, state: 'none' }
  }

  return ratingWindowOf(db, last, now)
}

/**
 * The window of one played match, at `now`. It is `waiting` until the report of the match is
 * finished (`reportFinished`): a form that asks for ratings needs the minutes.
 */
export async function ratingWindowOf(db: Database, match: RatingMatch, now = new Date()): Promise<RatingWindow> {
  const later = await scheduledAfter(db, match)
  const [next] = later
  const startsAt = startOf(match)
  const closing = closesAt(
    match,
    later.flatMap((candidate) => (candidate.kickoffAt === null ? [] : [candidate.kickoffAt])),
  )
  const base = { closesAt: closing, match, startsAt, ...(next === undefined ? {} : { next }) }
  const stored = await readMatchReport(db, match.id)

  if (stored === undefined) {
    return { ...base, state: 'waiting' }
  }

  const report = reportForRules(stored)

  if (!reportFinished(report)) {
    return { ...base, state: 'waiting' }
  }

  const positions = new Map(
    (
      await db
        .select({ id: players.id, position: players.position })
        .from(players)
        .where(
          inArray(
            players.id,
            stored.appearances.flatMap((appearance) =>
              appearance.ours && appearance.playerId !== null ? [appearance.playerId] : [],
            ),
          ),
        )
    ).map((player) => [player.id, player.position]),
  )
  const list = stored.appearances
    .flatMap((appearance): RatingPlayer[] => {
      if (!appearance.ours || appearance.playerId === null) {
        return []
      }

      const minutes = minutesPlayed(report, { extraTime: match.extraTime }, appearance.id)

      return minutes < ratingMinimumMinutes
        ? []
        : [
            {
              appearanceId: appearance.id,
              assist: stored.goals.some((goal) => goal.ours && goal.assistAppearanceId === appearance.id),
              goal: stored.goals.some((goal) => goal.ours && !goal.ownGoal && goal.appearanceId === appearance.id),
              minutes,
              name: appearance.name,
              position: positions.get(appearance.playerId) ?? null,
            },
          ]
    })
    .toSorted((a, b) => a.name.localeCompare(b.name, 'nl') || a.appearanceId - b.appearanceId)

  return { ...base, players: list, state: closing.getTime() > now.getTime() ? 'open' : 'closed' }
}

/**
 * Stores the grades of a supporter for the players of the match, and replaces earlier ones. It
 * writes only while the window of the last match is open and only for a player of its list, and
 * the write checks the window once more with the clock of the database (`UTC_TIMESTAMP()`), so
 * a slow request that began before the window closed can't get in after it. An account that
 * was made after the start of the match (`late`), a blocked one and a gone one write nothing.
 */
export async function saveRatings(
  db: Database,
  input: { grades: ReadonlyMap<number, number>; matchId: number; supporterId: number },
  now = new Date(),
): Promise<SaveRatingsResult> {
  const window = await findRatingWindow(db, now)

  if (window.state !== 'open' || window.match.id !== input.matchId) {
    return { answer: 'closed' }
  }

  const listed = new Set(window.players.map((player) => player.appearanceId))
  const grades = [...input.grades].filter(([appearanceId]) => listed.has(appearanceId))

  if (grades.length === 0 || grades.length !== input.grades.size) {
    return { answer: 'closed' }
  }

  const [account] = await db
    .select({ createdAt: supporters.createdAt, disabledAt: supporters.disabledAt })
    .from(supporters)
    .where(eq(supporters.id, input.supporterId))

  if (
    account === undefined ||
    account.disabledAt !== null ||
    account.createdAt.getTime() >= window.startsAt.getTime()
  ) {
    return { answer: 'late' }
  }

  const earlier = await findOwnRatings(db, input.supporterId, input.matchId)
  const values = sql.join(
    grades.map(([appearanceId, grade], index) =>
      index === 0
        ? sql`SELECT ${appearanceId} AS appearance_id, ${grade} AS grade`
        : sql`SELECT ${appearanceId}, ${grade}`,
    ),
    sql` UNION ALL `,
  )
  const start = sql`COALESCE(m.kickoff_at, TIMESTAMP(m.match_date))`

  await db.execute(sql`
    INSERT INTO player_ratings (supporter_id, appearance_id, grade, created_at, updated_at)
    SELECT s.id, v.appearance_id, v.grade, UTC_TIMESTAMP(), UTC_TIMESTAMP()
    FROM (${values}) v
    JOIN match_appearances a ON a.id = v.appearance_id AND a.match_id = ${input.matchId} AND a.ours = 1
    JOIN matches m ON m.id = a.match_id AND m.status = 'played'
    JOIN supporters s ON s.id = ${input.supporterId} AND s.disabled_at IS NULL AND s.created_at < ${start}
    WHERE UTC_TIMESTAMP() < LEAST(
      DATE_ADD(${start}, INTERVAL ${ratingWindowDays} DAY),
      COALESCE(
        (SELECT MIN(n.kickoff_at) FROM matches n WHERE n.status = 'scheduled' AND n.kickoff_at > ${start}),
        '9999-12-31 00:00:00'
      )
    )
    ON DUPLICATE KEY UPDATE grade = VALUES(grade), updated_at = UTC_TIMESTAMP()
  `)

  // With nothing selected, because the window had closed, nothing was written.
  const stored = await findOwnRatings(db, input.supporterId, input.matchId)
  const written = grades.every(([appearanceId, grade]) => stored.get(appearanceId) === grade)

  return written ? { answer: 'saved', changed: earlier.size > 0 } : { answer: 'closed' }
}

/** The scheduled matches after a match, the first first, whether or not they have a time. */
async function scheduledAfter(db: Database, match: Pick<RatingMatch, 'kickoffAt' | 'matchDate'>) {
  const found = await db
    .select(columns)
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(and(eq(matches.status, 'scheduled'), sql`${matches.matchDate} >= ${match.matchDate}`))
    .orderBy(asc(matches.matchDate), sql`${matches.kickoffAt} is null`, asc(matches.kickoffAt), asc(matches.id))

  return found.filter((candidate) => startOf(candidate).getTime() > startOf(match).getTime())
}

/** The line for the log of the run: a count, no names. */
export const describeClosedWindows = ({ closed }: CloseWindowsReport) =>
  closed === 0 ? [] : [`Uitblinker: ${closed} ${closed === 1 ? 'window' : 'windows'} closed, averages stored`]
