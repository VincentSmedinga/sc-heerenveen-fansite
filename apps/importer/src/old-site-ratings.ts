import {
  matchCoachRatings,
  matches,
  matchPlayerRatings,
  oldSeasonRatings,
  oldSeasonWinners,
  staff,
} from '@fansite/db/schema'
import { staffOnDay } from '@fansite/db/staff'
import { eq } from 'drizzle-orm'

import type { OldSiteData, OldSitePlayer } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { deriveOldSiteMatches, matchKey, oldSiteSeason, oldSiteSource } from './old-site-matches.ts'
import { cleanOldSiteName } from './old-site-names.ts'
import { oldSitePlayerIds, oldSitePlayerKey, resolveOldSiteCode } from './old-site-players.ts'
import { ratedCoaches } from './old-site-ratings-export.ts'
import { nameKey } from './read-squad.ts'

/** The source of the ratings this file writes, as `rating_sources` of the database has it. */
export const oldSiteRatingSource = 'oude-fansite'

/** A match counts for the Uitblinker of the year with at least this many ratings of a player */
const minimumRatings = 5

/** A player counts for the Uitblinker of the year with at least this many such matches. */
const minimumMatches = 6

const empty = (): OldSiteStepReport => ({ changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 })

type Values = { average: number; count: number; spread: number }

/**
 * The player with the highest season rating of each season of the ratings per match: all the
 * ratings of the season together, not the average of the averages, and on a tie the player with
 * fewer ratings.
 */
export function computedWinners(data: Pick<OldSiteData, 'players' | 'ratings'>) {
  const byCode = new Map<string, OldSitePlayer>(data.players.map((player) => [player.code, player]))
  const sums = new Map<string, { count: number; matches: number; sum: number }>()

  for (const rating of data.ratings) {
    const key = `${rating.season}|${rating.playerCode}`
    const one = sums.get(key) ?? { count: 0, matches: 0, sum: 0 }

    one.count += rating.count
    one.sum += rating.average * rating.count
    one.matches += rating.count >= minimumRatings ? 1 : 0
    sums.set(key, one)
  }

  const winners = new Map<string, { average: number; count: number; name: string }>()

  for (const [key, one] of sums) {
    const [season = '', code = ''] = key.split('|')
    const average = one.sum / one.count
    const best = winners.get(season)

    if (one.matches < minimumMatches) {
      continue
    }
    if (best === undefined || average > best.average || (average === best.average && one.count < best.count)) {
      const ref = resolveOldSiteCode(code, byCode, oldSiteSeason(season))

      winners.set(season, { average, count: one.count, name: ref?.name ?? code })
    }
  }

  return winners
}

/**
 * The step `trainercijfers` (#1502): the average, the number of ratings and the spread that
 * visitors of the old fansite gave the head coach in a match, in `match_coach_ratings` with
 * the source `oude-fansite`. The match is found as in the step `cijfers`. The coach is the
 * person of `staff` who surely held the role of head coach on the day of the match
 * (`staffOnDay`), and only when the name is the one of the coach that the rating is for. A
 * rating that cannot be linked is not stored and gets a line in the report, one for each
 * match. A second run changes nothing, and a row that the files no longer have is removed.
 */
export async function importOldSiteCoachRatings(db: OldSiteDatabase, data: OldSiteData): Promise<OldSiteStepReport> {
  const report = empty()
  const derived = new Map(
    deriveOldSiteMatches(data.matches).map((one) => [`${one.match.season}/${one.match.code}`, one]),
  )
  const stored = new Map<string, number>()

  for (const row of await db.select().from(matches).where(eq(matches.dataSource, oldSiteSource))) {
    stored.set(matchKey(row), row.id)
  }

  const coaches = (await db.select().from(staff)).filter((row) => row.role === 'coach')
  const wanted = new Map<string, { matchId: number; staffId: number; values: Values }>()

  for (const rating of data.coachRatings) {
    const one = derived.get(`${rating.season}/${rating.matchCode}`)
    const label = `${oldSiteSeason(rating.season)} ${rating.matchCode}`
    const values = one?.values ?? null
    const matchId = values === null ? undefined : stored.get(matchKey(values))

    if (matchId === undefined || values === null) {
      report.skipped += 1
      report.lines.push(
        `skipped the rating of the coach in ${label}: the match is not in the database as a match of the old fansite`,
      )
      continue
    }

    const found = staffOnDay(coaches, values.matchDate)
    const name = ratedCoaches.get(rating.coachCode)

    if (found.kind !== 'certain' || name === undefined || found.member.name !== name) {
      report.skipped += 1
      report.lines.push(
        `skipped the rating of ${rating.coachCode} in ${label}: the staff does not have him as the head coach on ${values.matchDate}`,
      )
      continue
    }

    wanted.set(`${matchId}|${found.member.id}`, {
      matchId,
      staffId: found.member.id,
      values: { average: rating.average, count: rating.count, spread: rating.spread },
    })
  }

  const have = new Map<string, typeof matchCoachRatings.$inferSelect>()

  for (const row of await db
    .select()
    .from(matchCoachRatings)
    .where(eq(matchCoachRatings.source, oldSiteRatingSource))) {
    have.set(`${row.matchId}|${row.staffId}`, row)
  }

  const fresh: (typeof matchCoachRatings.$inferInsert)[] = []

  for (const [key, { matchId, staffId, values }] of wanted) {
    const row = have.get(key)

    have.delete(key)

    if (row === undefined) {
      fresh.push({
        average: values.average.toFixed(2),
        matchId,
        ratingCount: values.count,
        source: oldSiteRatingSource,
        spread: values.spread.toFixed(2),
        staffId,
      })
    } else if (
      Number(row.average) !== values.average ||
      row.ratingCount !== values.count ||
      Number(row.spread) !== values.spread
    ) {
      await db
        .update(matchCoachRatings)
        .set({ average: values.average.toFixed(2), ratingCount: values.count, spread: values.spread.toFixed(2) })
        .where(eq(matchCoachRatings.id, row.id))
      report.changed += 1
    } else {
      report.unchanged += 1
    }
  }

  for (let start = 0; start < fresh.length; start += 500) {
    await db.insert(matchCoachRatings).values(fresh.slice(start, start + 500))
  }
  report.created = fresh.length

  for (const row of have.values()) {
    await db.delete(matchCoachRatings).where(eq(matchCoachRatings.id, row.id))
    report.changed += 1
    report.lines.push(
      `removed a coach rating that the files no longer have (match ${row.matchId}, staff ${row.staffId})`,
    )
  }

  return report
}

/**
 * The step `cijfers` (#1465): the average, the number of ratings and the spread that visitors
 * of the old fansite gave a player in a match, in `match_player_ratings` with the source
 * `oude-fansite`. The match is found as the other steps find it (the season, the competition
 * and the round), the player by the name the other steps use (`resolveOldSiteCode`, with the
 * corrections of the owner) in `players` for the season of the match. A rating whose match or
 * player is not in the database is skipped, with a line. Every average is kept, also one on
 * fewer than five ratings: the pages apply that threshold. A second run changes nothing, and a
 * row that the files no longer have is removed.
 */
export async function importOldSiteRatings(db: OldSiteDatabase, data: OldSiteData): Promise<OldSiteStepReport> {
  const report = empty()
  const byCode = new Map(data.players.map((player) => [player.code, player]))
  const derived = new Map(
    deriveOldSiteMatches(data.matches).map((one) => [`${one.match.season}/${one.match.code}`, one]),
  )
  const stored = new Map<string, number>()

  for (const row of await db.select().from(matches).where(eq(matches.dataSource, oldSiteSource))) {
    stored.set(matchKey(row), row.id)
  }

  const seasons = [...new Set(data.ratings.map((rating) => oldSiteSeason(rating.season)))]
  const playerIds = await oldSitePlayerIds(db, seasons)
  const wanted = new Map<string, { matchId: number; playerId: number; values: Values }>()

  for (const rating of data.ratings) {
    const one = derived.get(`${rating.season}/${rating.matchCode}`)
    const label = `${oldSiteSeason(rating.season)} ${rating.matchCode}`
    const values = one?.values ?? null
    const matchId = values === null ? undefined : stored.get(matchKey(values))

    if (matchId === undefined || values === null) {
      report.skipped += 1
      report.lines.push(`skipped a rating in ${label}: the match is not in the database as a match of the old fansite`)
      continue
    }

    const player = resolveOldSiteCode(rating.playerCode, byCode, values.season)
    const playerId = player === undefined ? undefined : playerIds.get(oldSitePlayerKey(player.season, player.name))

    if (playerId === undefined) {
      report.skipped += 1
      report.lines.push(`skipped the rating of ${rating.playerCode} in ${label}: the player is not in the database`)
      continue
    }

    wanted.set(`${matchId}|${playerId}`, {
      matchId,
      playerId,
      values: { average: rating.average, count: rating.count, spread: rating.spread },
    })
  }

  const have = new Map<string, typeof matchPlayerRatings.$inferSelect>()

  for (const row of await db
    .select()
    .from(matchPlayerRatings)
    .where(eq(matchPlayerRatings.source, oldSiteRatingSource))) {
    have.set(`${row.matchId}|${row.playerId}`, row)
  }

  const fresh: (typeof matchPlayerRatings.$inferInsert)[] = []

  for (const [key, { matchId, playerId, values }] of wanted) {
    const row = have.get(key)

    have.delete(key)

    if (row === undefined) {
      fresh.push({
        average: values.average.toFixed(2),
        matchId,
        playerId,
        ratingCount: values.count,
        source: oldSiteRatingSource,
        spread: values.spread.toFixed(2),
      })
    } else if (
      Number(row.average) !== values.average ||
      row.ratingCount !== values.count ||
      Number(row.spread) !== values.spread
    ) {
      await db
        .update(matchPlayerRatings)
        .set({ average: values.average.toFixed(2), ratingCount: values.count, spread: values.spread.toFixed(2) })
        .where(eq(matchPlayerRatings.id, row.id))
      report.changed += 1
    } else {
      report.unchanged += 1
    }
  }

  for (let start = 0; start < fresh.length; start += 500) {
    await db.insert(matchPlayerRatings).values(fresh.slice(start, start + 500))
  }
  report.created = fresh.length

  for (const row of have.values()) {
    await db.delete(matchPlayerRatings).where(eq(matchPlayerRatings.id, row.id))
    report.changed += 1
    report.lines.push(`removed a rating that the files no longer have (match ${row.matchId}, player ${row.playerId})`)
  }

  return report
}

/**
 * The step `seizoencijfers` (#1465): the season ratings of 1998/99 to 2000/01 in
 * `old_season_ratings`, and the Uitblinker of the year of 1998/99 to 2005/06 in
 * `old_season_winners`. A rating is kept by name, linked to the player of that season when the
 * database has him. The winners of 2001/02 to 2005/06 are checked against the ratings of the
 * matches: the player with the highest season rating, on at least six matches with at least
 * five ratings, with fewer ratings first on a tie. A difference is a line in the log and
 * changes nothing. A second run changes nothing.
 */
export async function importOldSiteSeasonRatings(db: OldSiteDatabase, data: OldSiteData): Promise<OldSiteStepReport> {
  const report = empty()
  const byCode = new Map(data.players.map((player) => [player.code, player]))
  const seasons = [
    ...new Set([...data.seasonRatings.map((one) => one.season), ...data.winners.map((one) => one.season)]),
  ]
  const playerIds = await oldSitePlayerIds(
    db,
    seasons.map((season) => oldSiteSeason(season)),
  )

  // The season ratings, by season and name.
  const wanted = new Map<string, { average: number; name: string; playerId: null | number; season: string }>()

  for (const rating of data.seasonRatings) {
    const season = oldSiteSeason(rating.season)
    const player = resolveOldSiteCode(rating.playerCode, byCode, season)

    if (player === undefined) {
      report.skipped += 1
      report.lines.push(`skipped the season rating of ${rating.playerCode} in ${season}: the code is not a player`)
      continue
    }

    const playerId = playerIds.get(oldSitePlayerKey(season, player.name)) ?? null

    if (playerId === null) {
      report.lines.push(`${player.name} (${season}) has a season rating and is not in the database as a player`)
    }
    wanted.set(`${season}|${nameKey(player.name)}`, { average: rating.average, name: player.name, playerId, season })
  }

  const have = new Map<string, typeof oldSeasonRatings.$inferSelect>()

  for (const row of await db.select().from(oldSeasonRatings)) {
    have.set(`${row.season}|${nameKey(row.name)}`, row)
  }

  for (const [key, value] of wanted) {
    const row = have.get(key)

    have.delete(key)

    if (row === undefined) {
      await db
        .insert(oldSeasonRatings)
        .values({ average: value.average.toFixed(2), name: value.name, playerId: value.playerId, season: value.season })
      report.created += 1
    } else if (Number(row.average) !== value.average || row.playerId !== value.playerId || row.name !== value.name) {
      await db
        .update(oldSeasonRatings)
        .set({ average: value.average.toFixed(2), name: value.name, playerId: value.playerId })
        .where(eq(oldSeasonRatings.id, row.id))
      report.changed += 1
    } else {
      report.unchanged += 1
    }
  }
  for (const row of have.values()) {
    await db.delete(oldSeasonRatings).where(eq(oldSeasonRatings.id, row.id))
    report.changed += 1
  }

  await storeWinners(db, data, playerIds, report)

  return report
}

/** Writes the winners of the year and checks the five that the ratings can check. */
async function storeWinners(
  db: OldSiteDatabase,
  data: OldSiteData,
  playerIds: ReadonlyMap<string, number>,
  report: OldSiteStepReport,
) {
  const computed = computedWinners(data)
  const have = new Map((await db.select().from(oldSeasonWinners)).map((row) => [row.season, row] as const))

  for (const winner of data.winners) {
    const season = oldSiteSeason(winner.season)
    const name = cleanOldSiteName(winner.name)
    const playerId = playerIds.get(oldSitePlayerKey(season, name)) ?? null
    const row = have.get(season)

    have.delete(season)

    if (row === undefined) {
      await db.insert(oldSeasonWinners).values({ name, playerId, season })
      report.created += 1
    } else if (row.name !== name || row.playerId !== playerId) {
      await db.update(oldSeasonWinners).set({ name, playerId }).where(eq(oldSeasonWinners.id, row.id))
      report.changed += 1
    } else {
      report.unchanged += 1
    }

    const calculated = computed.get(winner.season)

    if (calculated !== undefined && nameKey(calculated.name) !== nameKey(name)) {
      report.lines.push(
        `the Uitblinker of ${season} is ${name} on the old page, and ${calculated.name} on the ratings (${calculated.average.toFixed(2)})`,
      )
    }
  }
  for (const row of have.values()) {
    await db.delete(oldSeasonWinners).where(eq(oldSeasonWinners.id, row.id))
    report.changed += 1
  }
}
