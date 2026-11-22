import { isFansPartOn } from '@fansite/shared/fans-env'
import { minutesPlayed, reportFinished } from '@fansite/shared/match-report'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { PlayerPosition } from './schema.ts'

import { readMatchReport, reportForRules } from './match-reports.ts'
import {
  clubs,
  coachRatings,
  matchAppearances,
  matchCoachRatings,
  matches,
  matchPlayerRatings,
  playerRatings,
  players,
  staff,
  supporters,
} from './schema.ts'
import { staffOnDay } from './staff.ts'

// The window of the game Uitblinker (issue 1470): which match supporters can rate, who they can
// rate, until when, and what happens when the window closes. It lives here, next to the schema,
// so the site and the run of the importer (which closes the window) ask the same questions.

/** A player has to have played this many minutes to be rated. */
export const ratingMinimumMinutes = 30

/** The window closes at the latest this many days after the start of the match. */
export const ratingWindowDays = 7

const day = 24 * 60 * 60 * 1000

/**
 * The head coach of a match, who the supporters also rate (issue 1478). He is the one person of
 * the staff with the role `coach` who surely held the day of the match; where two people might
 * have (an interim), or the day lies in a gap, the match has no coach and no grade for one.
 */
export type RatingCoach = { name: string; staffId: number }

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
      coach: null | RatingCoach
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
 * averages with the source `fans` yet, it writes the averages to `match_player_ratings`, and
 * those of the head coach to `match_coach_ratings`, with the number of grades and the spread.
 * Grades of a blocked account do not count; grades of a closed account (without a link) do.
 * It does nothing while the game, or accounts, are off. Running it again changes nothing.
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

    await writeAverages(db, match.id)
    closed++
  }

  const coachMatches = await db
    .selectDistinct({ ...columns, staffId: coachRatings.staffId })
    .from(coachRatings)
    .innerJoin(matches, eq(matches.id, coachRatings.matchId))
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(
      sql`not exists (select 1 from ${matchCoachRatings} where ${matchCoachRatings.matchId} = ${matches.id} and ${matchCoachRatings.source} = 'fans')`,
    )

  for (const match of coachMatches) {
    const later = await scheduledAfter(db, match)
    const closing = closesAt(
      match,
      later.flatMap((candidate) => (candidate.kickoffAt === null ? [] : [candidate.kickoffAt])),
    )

    if (closing.getTime() > now.getTime()) {
      continue
    }

    await db.execute(sql`
      INSERT INTO match_coach_ratings (match_id, staff_id, source, average, rating_count, spread)
      SELECT r.match_id, r.staff_id, 'fans', ROUND(AVG(r.grade), 2), COUNT(*), ROUND(COALESCE(STDDEV_POP(r.grade), 0), 2)
      FROM coach_ratings r
      LEFT JOIN supporters s ON s.id = r.supporter_id
      WHERE r.match_id = ${match.id} AND r.staff_id = ${match.staffId} AND (r.supporter_id IS NULL OR s.disabled_at IS NULL)
      GROUP BY r.match_id, r.staff_id
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

/** The grade a supporter gave the head coach of a match, or `undefined` when they gave none. */
export async function findOwnCoachRating(db: Pick<Database, 'select'>, supporterId: number, matchId: number) {
  const [row] = await db
    .select({ grade: coachRatings.grade })
    .from(coachRatings)
    .where(and(eq(coachRatings.supporterId, supporterId), eq(coachRatings.matchId, matchId)))

  return row?.grade
}

/** The grades a supporter gave for a match, by the number of the appearance. */
export async function findOwnRatings(db: Pick<Database, 'select'>, supporterId: number, matchId: number) {
  const rows = await db
    .select({ appearanceId: playerRatings.appearanceId, grade: playerRatings.grade })
    .from(playerRatings)
    .innerJoin(matchAppearances, eq(matchAppearances.id, playerRatings.appearanceId))
    .where(and(eq(playerRatings.supporterId, supporterId), eq(matchAppearances.matchId, matchId)))

  return new Map(rows.map((row) => [row.appearanceId, row.grade]))
}

/**
 * The head coach of a match: the person of the staff who surely held the day of the match. It
 * is `null` for a day in a gap and for a day that two people might have held (see
 * `staffOnDay`).
 */
export async function findRatingCoach(db: Database, matchDate: string): Promise<null | RatingCoach> {
  const rows = await db
    .select({
      endDate: staff.endDate,
      endPrecision: staff.endPrecision,
      name: staff.name,
      staffId: staff.id,
      startDate: staff.startDate,
      startPrecision: staff.startPrecision,
    })
    .from(staff)
    .where(eq(staff.role, 'coach'))
  const answer = staffOnDay(rows, matchDate)

  return answer.kind === 'certain' ? { name: answer.member.name, staffId: answer.member.staffId } : null
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

  return {
    ...base,
    coach: await findRatingCoach(db, match.matchDate),
    players: list,
    state: closing.getTime() > now.getTime() ? 'open' : 'closed',
  }
}

/**
 * Works the averages out again after the editors blocked or released an account (issue 1476),
 * for each match in any season where that account gave a grade and the window is over. A
 * window that is still open has no averages yet, so it is left to the closing step. The
 * Uitblinker and the threshold of five grades follow from the new averages, because the pages
 * work them out from the rows. It does nothing while the game, or accounts, are off. It gives
 * the number of matches it counted again.
 */
export async function recountRatingsOf(
  db: Database,
  supporterId: number,
  now = new Date(),
  env: Record<string, string | undefined> = process.env,
): Promise<number> {
  if (!isFansPartOn('uitblinker', env)) {
    return 0
  }

  const rated = await db
    .selectDistinct({ matchId: matchAppearances.matchId })
    .from(playerRatings)
    .innerJoin(matchAppearances, eq(matchAppearances.id, playerRatings.appearanceId))
    .where(eq(playerRatings.supporterId, supporterId))
  let counted = 0

  for (const { matchId } of rated) {
    const [match] = await db
      .select(columns)
      .from(matches)
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(eq(matches.id, matchId))

    if (match === undefined) {
      continue
    }

    const [stored] = await db
      .select({ id: matchPlayerRatings.id })
      .from(matchPlayerRatings)
      .where(and(eq(matchPlayerRatings.matchId, matchId), eq(matchPlayerRatings.source, 'fans')))
      .limit(1)
    const later = stored === undefined ? await scheduledAfter(db, match) : []
    const over =
      stored !== undefined ||
      closesAt(
        match,
        later.flatMap((candidate) => (candidate.kickoffAt === null ? [] : [candidate.kickoffAt])),
      ).getTime() <= now.getTime()

    if (over) {
      await writeAverages(db, matchId)
      counted++
    }
  }

  return counted
}

/**
 * Stores the grades of a supporter for the players of the match, and replaces earlier ones. It
 * writes only while the window of the last match is open and only for a player of its list, and
 * the write checks the window once more with the clock of the database (`UTC_TIMESTAMP()`), so
 * a slow request that began before the window closed can't get in after it. An account that
 * was made after the start of the match (`late`), a blocked one and a gone one write nothing.
 * A match with a head coach (`window.coach`) needs a grade for him too, and one without a coach
 * takes none: the grades of the players and the coach are written together or not at all.
 */
export async function saveRatings(
  db: Database,
  input: { coachGrade?: number; grades: ReadonlyMap<number, number>; matchId: number; supporterId: number },
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

  if ((window.coach === null) !== (input.coachGrade === undefined)) {
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
  const earlierCoach = await findOwnCoachRating(db, input.supporterId, input.matchId)
  const coach = window.coach
  const coachGrade = input.coachGrade
  const values = sql.join(
    grades.map(([appearanceId, grade], index) =>
      index === 0
        ? sql`SELECT ${appearanceId} AS appearance_id, ${grade} AS grade`
        : sql`SELECT ${appearanceId}, ${grade}`,
    ),
    sql` UNION ALL `,
  )
  const start = sql`COALESCE(m.kickoff_at, TIMESTAMP(m.match_date))`

  const open = sql`UTC_TIMESTAMP() < LEAST(
      DATE_ADD(${start}, INTERVAL ${ratingWindowDays} DAY),
      COALESCE(
        (SELECT MIN(n.kickoff_at) FROM matches n WHERE n.status = 'scheduled' AND n.kickoff_at > ${start}),
        '9999-12-31 00:00:00'
      )
    )`

  const written = await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO player_ratings (supporter_id, appearance_id, grade, created_at, updated_at)
      SELECT s.id, v.appearance_id, v.grade, UTC_TIMESTAMP(), UTC_TIMESTAMP()
      FROM (${values}) v
      JOIN match_appearances a ON a.id = v.appearance_id AND a.match_id = ${input.matchId} AND a.ours = 1
      JOIN matches m ON m.id = a.match_id AND m.status = 'played'
      JOIN supporters s ON s.id = ${input.supporterId} AND s.disabled_at IS NULL AND s.created_at < ${start}
      WHERE ${open}
      ON DUPLICATE KEY UPDATE grade = VALUES(grade), updated_at = UTC_TIMESTAMP()
    `)

    if (coach !== null && coachGrade !== undefined) {
      await tx.execute(sql`
        INSERT INTO coach_ratings (supporter_id, match_id, staff_id, grade, created_at, updated_at)
        SELECT s.id, m.id, ${coach.staffId}, ${coachGrade}, UTC_TIMESTAMP(), UTC_TIMESTAMP()
        FROM matches m
        JOIN supporters s ON s.id = ${input.supporterId} AND s.disabled_at IS NULL AND s.created_at < ${start}
        WHERE m.id = ${input.matchId} AND m.status = 'played' AND ${open}
        ON DUPLICATE KEY UPDATE staff_id = VALUES(staff_id), grade = VALUES(grade), updated_at = UTC_TIMESTAMP()
      `)
    }

    // With nothing selected, because the window had closed, nothing was written.
    const stored = await findOwnRatings(tx, input.supporterId, input.matchId)
    const storedCoach = await findOwnCoachRating(tx, input.supporterId, input.matchId)

    return (
      grades.every(([appearanceId, grade]) => stored.get(appearanceId) === grade) &&
      (coach === null || storedCoach === coachGrade)
    )
  })

  return written ? { answer: 'saved', changed: earlier.size > 0 || earlierCoach !== undefined } : { answer: 'closed' }
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

/**
 * Writes the averages with the source `fans` of one match from the grades as they are now:
 * grades of a blocked account, and of an account that was blocked when it closed, do not
 * count. The old rows of the match go first, so a player whose grades all dropped out has no
 * average left. It is the one place that works the averages out, for the closing of a window
 * and for the recount when an account is blocked or released.
 */
async function writeAverages(db: Database, matchId: number) {
  await db.transaction(async (tx) => {
    await tx
      .delete(matchPlayerRatings)
      .where(and(eq(matchPlayerRatings.matchId, matchId), eq(matchPlayerRatings.source, 'fans')))
    await tx.execute(sql`
      INSERT INTO match_player_ratings (match_id, player_id, source, average, rating_count, spread)
      SELECT a.match_id, a.player_id, 'fans', ROUND(AVG(r.grade), 2), COUNT(*), ROUND(COALESCE(STDDEV_POP(r.grade), 0), 2)
      FROM player_ratings r
      JOIN match_appearances a ON a.id = r.appearance_id
      LEFT JOIN supporters s ON s.id = r.supporter_id
      WHERE a.match_id = ${matchId} AND a.player_id IS NOT NULL AND r.blocked = 0 AND (r.supporter_id IS NULL OR s.disabled_at IS NULL)
      GROUP BY a.match_id, a.player_id
    `)
  })
}

/** The line for the log of the run: a count, no names. */
export const describeClosedWindows = ({ closed }: CloseWindowsReport) =>
  closed === 0 ? [] : [`Uitblinker: ${closed} ${closed === 1 ? 'window' : 'windows'} closed, averages stored`]
