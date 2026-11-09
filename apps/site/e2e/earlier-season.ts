import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { leagueResults, matches, standings, wikipediaPages } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { madeUpMatches, seedMatches } from '@fansite/db/seed'
import { eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * The season before the current one, such as `2025/26` while the current season is `2026/27`.
 * /wedstrijden/<this season> is the page of an earlier season that the checks open.
 */
export function earlierSeason() {
  return seasonOf(aYearAgo())
}

const aYearAgo = () => {
  const now = new Date()

  return new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()))
}

/** The address of that season in a path, `2025-26`. */
export const earlierSeasonSlug = () => earlierSeason().replace('/', '-')

/** The 18 clubs of the made-up Eredivisie: the clubs of the seed and twelve more. */
const clubs = [
  'sc Heerenveen',
  'Voorbeeld United',
  'Proefstad SV',
  'Nepstad Rangers',
  'Demo Boys',
  'Testdorp FC',
  ...Array.from({ length: 12 }, (_, index) => `Testclub ${index + 1}`),
]

/**
 * Puts made-up matches, goals, a league table with the results of every club and the pages they
 * credit in the database for the season before the current one, so the checks of
 * /wedstrijden/<season> have an earlier season to show: the matches page lists the seasons that
 * have matches, and answers "niet gevonden" for the others. A database that already holds
 * matches or a table for that season (a development database that imported one) keeps them,
 * and the checks use those. The checks put the rows in before the first test and take them out
 * after the last one.
 */
export async function addEarlierSeason() {
  const { close, db } = connectToDatabase()
  const season = earlierSeason()
  let added = false

  try {
    added = await seedMatches(db, aYearAgo())

    if (added) {
      // The results of the seed are of six clubs. The card Onze plek per speelronde needs all
      // eighteen, so the made-up season gets five whole rounds instead (see fullRounds).
      await db.delete(leagueResults).where(eq(leagueResults.season, season))
      await db.insert(leagueResults).values(fullRounds(season))
    }
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      // Rows that this run put in, and made-up rows that an earlier run left behind, which is
      // what `pnpm --filter site test-data --remove` meets. Real matches of that season, from
      // an import, are never taken out: only a season whose matches are all made up goes.
      if (added || (await holdsOnlyMadeUpMatches(connection.db, season))) {
        // The goals of the matches go with them.
        await connection.db.delete(matches).where(eq(matches.season, season))
        await connection.db.delete(standings).where(eq(standings.season, season))
        await connection.db.delete(leagueResults).where(eq(leagueResults.season, season))
        await connection.db.delete(wikipediaPages).where(eq(wikipediaPages.season, season))
      }
    } finally {
      await connection.close()
    }
  }
}

/**
 * Five whole rounds of the league, paired the way a round-robin does (the first club stays and
 * the others turn), so every pair meets once and a result is kept once for a home club and an
 * away club. sc Heerenveen scores the goals of `ours` against the club it meets, which is the
 * first match of a round, and every other match is a 1-0 home win. The card "Onze plek per
 * speelronde" then has a line that goes up and down.
 */
export function fullRounds(season: string) {
  const ours: [number, number][] = [
    [2, 0],
    [0, 1],
    [1, 1],
    [3, 0],
    [0, 2],
  ]

  return ours.flatMap(([goalsFor, goalsAgainst], index) => {
    const others = clubs.slice(1)
    const turned = others.map((_, place) => others[(place + index) % others.length]!)
    const pairs = [
      [clubs[0]!, turned[0]!],
      ...Array.from({ length: 8 }, (_, step) => [turned[step + 1]!, turned[15 - step]!]),
    ] as const

    return pairs.map(([homeClub, awayClub], pair) => ({
      awayClub,
      awayGoals: pair === 0 ? goalsAgainst : 0,
      homeClub,
      homeGoals: pair === 0 ? goalsFor : 1,
      playedOn: `${season.slice(0, 4)}-09-${String(index * 7 + 1).padStart(2, '0')}`,
      round: index + 1,
      season,
    }))
  })
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function connectToDatabase() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return connect(readDatabaseEnv().DATABASE_URL)
}

/**
 * Whether the season has matches and every one of them is a made-up match (the same
 * competition, round and opponent as in `madeUpMatches`), so the season came from the seed and
 * not from an import.
 */
async function holdsOnlyMadeUpMatches(db: ReturnType<typeof connectToDatabase>['db'], season: string) {
  const key = (match: { competition: string; opponent: string; round: string }) =>
    `${match.competition}|${match.round}|${match.opponent}`
  const madeUp = new Set(madeUpMatches(aYearAgo()).map(key))
  const rows = await db.select().from(matches).where(eq(matches.season, season))

  return rows.length > 0 && rows.every((match) => madeUp.has(key(match)))
}
