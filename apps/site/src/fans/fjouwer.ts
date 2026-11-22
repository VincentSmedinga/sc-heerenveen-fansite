import type { Database } from '@fansite/db/client'
import type { PredictionMatch } from '@fansite/db/prediction-matches'

import { clubs, fantasyPicks, fantasyPlayerLines, matches, persons, players } from '@fansite/db/schema'
import { utcToAmsterdam } from '@fansite/db/season'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'

import { personNameParts, personSortName, splitPersonName } from '../player-name'
import {
  checkPicks,
  closesAt,
  type FjouwerLine,
  fjouwerLines,
  type Four,
  fourOf,
  isChoiceOpen,
  type PickErrors,
  playersNotCounting,
  type SquadMember,
  usesBefore,
} from './fjouwer-rules'

// The game Fjouwer (issue 1469): which match a supporter chooses for, the squad to choose from,
// the four a supporter has, and the write that keeps the deadline. The page and the action only
// call these; the rules are pure functions in `fjouwer-rules.ts`.

export { fjouwerPath, matchField, playerField } from './fjouwer-form'

/** The match of the card: the same shape as the match of Prognose. */
export type FjouwerMatch = PredictionMatch

const matchColumns = {
  clubSlug: clubs.slug,
  competition: matches.competition,
  dateText: matches.dateText,
  home: matches.home,
  id: matches.id,
  kickoffAt: matches.kickoffAt,
  matchDate: matches.matchDate,
  opponent: matches.opponent,
  round: matches.round,
  season: matches.season,
  status: matches.status,
}

const orderOf = (match: FjouwerMatch) => closesAt(match).getTime() - match.id / 1e9

/** A player of the squad as the form shows him. */
export type SquadPlayer = SquadMember & { surname: string }

/**
 * The match of the card: the first match of the first team that is still to be played and has
 * not closed. All competitions count. A match that is cancelled, or postponed without a new
 * date, is not `scheduled` and so is skipped; one that is postponed to a new date is the same
 * match, so what was chosen stays and the deadline moves with it. A match closes at the
 * kick-off, and at 00.00 Dutch time on its day while the hour is not known. From the kick-off
 * of a match the next one is the one of the card.
 */
export async function fjouwerMatch(db: Database, now = new Date()): Promise<FjouwerMatch | undefined> {
  // A day before the Dutch day is always enough: a match closes at the latest on its own day.
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const found = await db
    .select(matchColumns)
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(and(eq(matches.status, 'scheduled'), gte(matches.matchDate, utcToAmsterdam(yesterday).day)))

  return found.filter((match) => isChoiceOpen(match, now)).toSorted((a, b) => orderOf(a) - orderOf(b))[0]
}

const prefixes = /^(?:(?:'t|da|de|den|der|di|het|te|ten|ter|van|von)\s+)+/i

/** What the page needs of a supporter for a match. */
export type FjouwerState = {
  /** The four the supporter has for the match, or empty for one who never chose. */
  four: Four
  /** Whether the four is the one of an earlier match: there is no row for this match. */
  inherited: boolean
  /** The players of an inherited four who have their ten and so do not count. */
  notCounting: Four
  /** Whether the supporter saved a four for this match. */
  saved: boolean
  /** How many matches before this one each player was used in (never above ten). */
  uses: ReadonlyMap<number, number>
}

/** What a save came to. */
export type SaveResult =
  { answer: 'closed' } | { answer: 'invalid'; errors: PickErrors } | { answer: 'saved'; closesAt: Date; four: Four }

/**
 * The squad to choose from for a match: the players of the season that the squad list or the
 * editors gave, with a line. A player who left is still there for the matches before he left.
 * The line is the one kept for the game, or else the position the site has now (`players` and
 * then `persons`). In the order of the form: the lines from the goal to the front, and within a
 * line by surname without its prefix.
 */
export async function fjouwerSquad(db: Database, match: FjouwerMatch): Promise<SquadPlayer[]> {
  const rows = await db
    .select({
      familyName: persons.familyName,
      familyNamePrefix: persons.familyNamePrefix,
      givenName: persons.givenName,
      id: players.id,
      inSquad: players.inSquad,
      keptLine: fantasyPlayerLines.line,
      leftSquadAt: players.leftSquadAt,
      name: players.name,
      position: sql<FjouwerLine | null>`coalesce(${players.position}, ${persons.line})`,
    })
    .from(players)
    .leftJoin(persons, eq(players.personId, persons.id))
    .leftJoin(fantasyPlayerLines, eq(fantasyPlayerLines.playerId, players.id))
    .where(and(eq(players.season, match.season), inArray(players.source, ['selectie', 'redactie'])))
  const closes = closesAt(match).getTime()
  const squad = rows.flatMap((row) => {
    const line = row.keptLine ?? row.position
    const present = row.inSquad || (row.leftSquadAt !== null && row.leftSquadAt.getTime() > closes)

    if (line === null || !present) {
      return []
    }

    const parts = personNameParts({
      personFamilyName: row.familyName,
      personFamilyNamePrefix: row.familyNamePrefix,
      personGivenName: row.givenName,
    })
    const surname = parts?.surname || splitPersonName(row.name).surname
    const sortName = (
      personSortName({
        personFamilyName: row.familyName,
        personFamilyNamePrefix: null,
        personGivenName: row.givenName,
      }) || surname.replace(prefixes, '')
    ).toLowerCase()

    return [{ id: row.id, line, name: row.name, sortName, surname }]
  })

  return squad
    .toSorted(
      (a, b) =>
        fjouwerLines.indexOf(a.line) - fjouwerLines.indexOf(b.line) ||
        a.sortName.localeCompare(b.sortName, 'nl') ||
        a.name.localeCompare(b.name, 'nl'),
    )
    .map(({ id, line, name, surname }) => ({ id, line, name, surname }))
}

/**
 * The four a supporter has for the match and how often each player has been used before. A
 * supporter without a row for the match has the four of the latest match before it that has
 * one, worked out here and not in a job; one who never chose has no four and scores nothing.
 */
export async function fjouwerState(db: Database, supporterId: number, match: FjouwerMatch): Promise<FjouwerState> {
  const ids = await seasonMatchIds(db, match)
  const rows = await savedFours(db, supporterId, ids)
  const uses = usesBefore(ids, rows, match.id)
  const have = fourOf(ids, rows, match.id)

  return {
    four: have?.four ?? [],
    inherited: have?.inherited ?? false,
    notCounting: have?.inherited ? playersNotCounting(have.four, uses) : [],
    saved: have !== undefined && !have.inherited,
    uses,
  }
}

/**
 * Stores the four of a supporter for the match and replaces an earlier row. It writes only for
 * the match of the card and only before it closes. The checks are the rules (`checkPicks`),
 * and the write checks the deadline once more with the clock of the database for a known
 * kick-off, so a slow request that began before it can't get in after it. The first time a
 * player is used in a season, his line is kept for the game and never changed after that.
 */
export async function saveFjouwer(
  db: Database,
  input: { matchId: number; playerIds: readonly number[]; supporterId: number },
  now = new Date(),
): Promise<SaveResult> {
  const match = await fjouwerMatch(db, now)

  if (match === undefined || match.id !== input.matchId) {
    return { answer: 'closed' }
  }

  const [squad, state] = await Promise.all([fjouwerSquad(db, match), fjouwerState(db, input.supporterId, match)])
  const checked = checkPicks({
    ids: input.playerIds,
    squad: new Map(squad.map((member) => [member.id, member])),
    uses: state.uses,
  })

  if (!checked.ok) {
    return { answer: 'invalid', errors: checked.errors }
  }

  const [first, second, third, fourth] = checked.ids as [number, number, number, number]
  const today = utcToAmsterdam(now).day
  const [result] = await db.execute(sql`
    INSERT INTO fantasy_picks
      (supporter_id, match_id, player_1_id, player_2_id, player_3_id, player_4_id, created_at, updated_at)
    SELECT ${input.supporterId}, m.id, ${first}, ${second}, ${third}, ${fourth}, UTC_TIMESTAMP(), UTC_TIMESTAMP()
    FROM matches m
    WHERE m.id = ${input.matchId} AND m.status = 'scheduled'
      AND ((m.kickoff_at IS NOT NULL AND m.kickoff_at > UTC_TIMESTAMP()) OR (m.kickoff_at IS NULL AND m.match_date > ${today}))
    ON DUPLICATE KEY UPDATE player_1_id = VALUES(player_1_id), player_2_id = VALUES(player_2_id),
      player_3_id = VALUES(player_3_id), player_4_id = VALUES(player_4_id), updated_at = UTC_TIMESTAMP()
  `)

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return { answer: 'closed' }
  }

  const lines = new Map(squad.map((member) => [member.id, member.line]))

  await db
    .insert(fantasyPlayerLines)
    .values(checked.ids.map((playerId) => ({ line: lines.get(playerId) as FjouwerLine, playerId })))
    .onDuplicateKeyUpdate({ set: { playerId: sql`player_id` } })

  return { answer: 'saved', closesAt: closesAt(match), four: checked.ids }
}

/** The fours a supporter saved, by match. */
async function savedFours(db: Database, supporterId: number, matchIds: readonly number[]) {
  const rows =
    matchIds.length === 0
      ? []
      : await db
          .select()
          .from(fantasyPicks)
          .where(and(eq(fantasyPicks.supporterId, supporterId), inArray(fantasyPicks.matchId, [...matchIds])))

  return new Map<number, Four>(
    rows.map((row) => [row.matchId, [row.player1Id, row.player2Id, row.player3Id, row.player4Id]]),
  )
}

/** The matches of a season that count for the game, in the order they close. */
async function seasonMatchIds(db: Database, match: FjouwerMatch): Promise<number[]> {
  const found = await db
    .select({ id: matches.id, kickoffAt: matches.kickoffAt, matchDate: matches.matchDate })
    .from(matches)
    .where(and(eq(matches.season, match.season), inArray(matches.status, ['scheduled', 'played'])))

  return found.toSorted((a, b) => closesAt(a).getTime() - closesAt(b).getTime() || a.id - b.id).map((found) => found.id)
}

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/**
 * What a supporter chose, for Mijn account and the page "Alles wat we van je bewaren": a row
 * for each match they saved a four for, the newest first, with the four in the order of the
 * form. Only saved rows: an inherited four is no row. `undefined` for a supporter who never
 * saved a four.
 */
export async function fjouwerData(db: Database, supporterId: number) {
  const rows = await db
    .select({
      home: matches.home,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      player1: sql<string>`p1.name`,
      player2: sql<string>`p2.name`,
      player3: sql<string>`p3.name`,
      player4: sql<string>`p4.name`,
    })
    .from(fantasyPicks)
    .innerJoin(matches, eq(matches.id, fantasyPicks.matchId))
    .innerJoin(sql`players p1`, sql`p1.id = ${fantasyPicks.player1Id}`)
    .innerJoin(sql`players p2`, sql`p2.id = ${fantasyPicks.player2Id}`)
    .innerJoin(sql`players p3`, sql`p3.id = ${fantasyPicks.player3Id}`)
    .innerJoin(sql`players p4`, sql`p4.id = ${fantasyPicks.player4Id}`)
    .where(eq(fantasyPicks.supporterId, supporterId))
    .orderBy(desc(matches.matchDate), desc(matches.id))

  if (rows.length === 0) {
    return undefined
  }

  return {
    columns: ['Wedstrijd', 'Jouw vier'],
    rows: rows.map((row) => {
      const [home, away] = row.home ? ['sc Heerenveen', row.opponent] : [row.opponent, 'sc Heerenveen']

      return {
        cells: [[row.player1, row.player2, row.player3, row.player4].join(', ')],
        header: `${home} – ${away}, ${dateFormat.format(new Date(`${row.matchDate}T12:00:00Z`))}`,
      }
    }),
    summary: `${rows.length} keer vier gekozen`,
  }
}
