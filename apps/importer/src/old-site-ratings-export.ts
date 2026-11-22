import type { OldSiteCoachRating, OldSiteMatch, OldSiteRating, OldSiteSeasonRating } from './old-site-file.ts'

/**
 * The part of `pnpm export:old-site` that works out the ratings (#1465): it turns the rows of
 * the old tables `uitblinker_inz` (one rating by one visitor for one player in one match) and
 * `uitblinker_oud` (the season ratings of 1998/99 to 2000/01) into averages, counts and
 * spreads. It reads the name of the visitor (`inz_gn`) only to see that a visitor gave a
 * second rating for the same player in the same match, and the time of the rating not at all
 * (the last one is the one with the highest `id`). Neither leaves this function: what it
 * returns holds numbers and codes of players and matches only. The coaches are in the same
 * table; their ratings are worked out the same way (#1502) and go in their own list per match.
 * The spread is the standard deviation of the ratings of a player in a match (the whole
 * group, not a sample).
 */

/** One rating of one visitor, as the old table has it. Only these columns are read. */
export type RatingRow = {
  cijfer: number
  id: number
  inz_gn: string
  spr_code: string
  wsd_code: string
  wsd_seizoen: string
}

/** One season rating of the old table `uitblinker_oud`. Only these columns are read. */
export type SeasonRatingRow = {
  gemiddelde: number
  jaargang: string
  spr_code: string
}

/**
 * The two head coaches of 2001 to 2007, by the code of the old database and the name in
 * `staff`.
 * Their ratings are kept apart from those of the players.
 */
export const ratedCoaches: ReadonlyMap<string, string> = new Map([
  ['foppe.dehaan', 'Foppe de Haan'],
  ['gertjan.verbeek', 'Gertjan Verbeek'],
])

export const ratedCoachCodes: ReadonlySet<string> = new Set(ratedCoaches.keys())

/** The seasons that have a season rating in the old table and no ratings per match. */
export const oldSeasonRatingSeasons: ReadonlySet<string> = new Set(['0001', '9899', '9900'])

export type OldSiteRatings = {
  /** The ratings per match and player, by season (the code of the old database). */
  bySeason: Map<string, OldSiteRating[]>
  /** The ratings per match and head coach, by season. */
  coachBySeason: Map<string, OldSiteCoachRating[]>
  /** The ratings of players who are not in the line-up of the match, per match. */
  outsideLineup: RatingOutsideLineup[]
  /** Lines for the person who runs the export. */
  report: string[]
  seasonRatings: OldSiteSeasonRating[]
}

/** A rating for a player who is not in the line-up of the match, for the editors to judge. */
export type RatingOutsideLineup = {
  average: number
  count: number
  matchCode: string
  playerCode: string
  season: string
}

/** The names the Markdown file needs: the clubs and the players of the old database. */
type NameRows = {
  clubs: readonly { code: string; naam: string }[]
  players: readonly { achternaam: string; code: string; tussenvoegsel: null | string; voornaam: string }[]
}

/**
 * Works out the ratings. `matches` are the matches of the export, with their line-ups, and
 * `knownMatches` the keys (`season/code`) of every match of the old database, so a rating for a
 * match that is gone is told from a rating for a match that is not in the files (a friendly).
 */
export function buildOldSiteRatings(
  ratingRows: readonly RatingRow[],
  seasonRatingRows: readonly SeasonRatingRow[],
  matches: readonly OldSiteMatch[],
  knownMatches: ReadonlySet<string>,
): OldSiteRatings {
  const lineups = new Map(
    matches.map((match) => [
      `${match.season}/${match.code}`,
      new Set(match.lineup.flatMap((entry) => (entry.playerCode === null ? [] : [entry.playerCode]))),
    ]),
  )
  // A visitor who gave a player a second rating in a match: only the last one counts.
  const last = new Map<string, RatingRow>()
  let doubles = 0

  for (const row of ratingRows) {
    const key = `${row.wsd_seizoen}/${row.wsd_code}|${row.spr_code}|${row.inz_gn}`
    const before = last.get(key)

    if (before !== undefined) {
      doubles += 1
    }
    if (before === undefined || before.id < row.id) {
      last.set(key, row)
    }
  }

  const grades = new Map<string, number[]>()
  const coachGrades = new Map<string, number[]>()
  const counts = { coaches: 0, gone: 0, notInFiles: 0, outside: 0 }
  const gone = new Set<string>()

  for (const row of last.values()) {
    const matchKey = `${row.wsd_seizoen}/${row.wsd_code}`

    if (!knownMatches.has(matchKey)) {
      counts.gone += 1
      gone.add(matchKey)
      continue
    }

    const lineup = lineups.get(matchKey)

    if (lineup === undefined) {
      counts.notInFiles += 1
      continue
    }

    const key = `${matchKey}|${row.spr_code}`
    const isCoach = ratedCoachCodes.has(row.spr_code)
    const list = (isCoach ? coachGrades : grades).get(key)

    if (list) {
      list.push(row.cijfer)
    } else {
      ;(isCoach ? coachGrades : grades).set(key, [row.cijfer])
    }
    if (isCoach) {
      counts.coaches += 1
    } else if (!lineup.has(row.spr_code)) {
      counts.outside += 1
    }
  }

  const bySeason = new Map<string, OldSiteRating[]>()
  const outsideLineup: RatingOutsideLineup[] = []

  for (const [key, list] of [...grades].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const [matchKey = '', playerCode = ''] = key.split('|')
    const [season = '', matchCode = ''] = splitOnce(matchKey, '/')
    const stats = describeGrades(list)

    if (!lineups.get(matchKey)?.has(playerCode)) {
      outsideLineup.push({ average: stats.average, count: stats.count, matchCode, playerCode, season })
      continue
    }

    const ratings = bySeason.get(season) ?? []

    ratings.push({ ...stats, matchCode, playerCode })
    bySeason.set(season, ratings)
  }

  const coachBySeason = new Map<string, OldSiteCoachRating[]>()

  for (const [key, list] of [...coachGrades].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const [matchKey = '', coachCode = ''] = key.split('|')
    const [season = '', matchCode = ''] = splitOnce(matchKey, '/')
    const ratings = coachBySeason.get(season) ?? []

    ratings.push({ ...describeGrades(list), coachCode, matchCode })
    coachBySeason.set(season, ratings)
  }

  const seasonRatings: OldSiteSeasonRating[] = seasonRatingRows
    .filter((row) => oldSeasonRatingSeasons.has(row.jaargang) && row.gemiddelde >= 1)
    .map((row) => ({ average: round(row.gemiddelde), playerCode: row.spr_code, season: row.jaargang }))
    .sort(
      (a, b) => a.season.localeCompare(b.season) || b.average - a.average || a.playerCode.localeCompare(b.playerCode),
    )

  const exported = [...bySeason.values()].reduce((sum, list) => sum + list.length, 0)
  const matchesWithRatings = new Set(
    [...bySeason].flatMap(([season, list]) => list.map((r) => `${season}/${r.matchCode}`)),
  )

  const coachExported = [...coachBySeason.values()].reduce((sum, list) => sum + list.length, 0)

  return {
    bySeason,
    coachBySeason,
    outsideLineup,
    report: [
      `${exported} ratings per match and player, in ${matchesWithRatings.size} matches, from ${ratingRows.length} ratings of visitors`,
      `ratings given twice by a visitor for the same player in the same match (only the last counts): ${doubles}`,
      `ratings for a match code that no longer exists, left out: ${counts.gone}${gone.size === 0 ? '' : ` (${[...gone].sort().join(', ')})`}`,
      `ratings for a match that is not in the files, left out: ${counts.notInFiles}`,
      `ratings for a player who is not in the line-up of the match, left out and listed for the editors: ${counts.outside} (${outsideLineup.length} players in ${new Set(outsideLineup.map((one) => `${one.season}/${one.matchCode}`)).size} matches)`,
      `ratings per match and head coach: ${coachExported}, from ${counts.coaches} ratings of visitors (only the last of a visitor counts)`,
      `season ratings before 2001: ${seasonRatings.length}`,
    ],
    seasonRatings,
  }
}

/** The sums that make an average and a spread out of a list of grades. */
export function describeGrades(grades: readonly number[]): { average: number; count: number; spread: number } {
  const count = grades.length
  const sum = grades.reduce((total, grade) => total + grade, 0)
  const squares = grades.reduce((total, grade) => total + grade * grade, 0)
  const average = sum / count
  const variance = Math.max(0, squares / count - average * average)

  return { average: round(average), count, spread: round(Math.sqrt(variance)) }
}

/** Two decimals, the way the database keeps them. */
export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * The Markdown file for the editors (#1465): per match, the ratings that visitors gave a player
 * who is not in the line-up of that match, to judge by hand. They are not in the database. It
 * holds the date, the opponent, the player, the number of ratings and their average, and no
 * one who gave a rating.
 */
export function writeRatingsOutsideLineup(
  outside: readonly RatingOutsideLineup[],
  matches: readonly OldSiteMatch[],
  rows: NameRows,
): string {
  const clubs = new Map(rows.clubs.map((club) => [club.code, club.naam.trim()]))
  const players = new Map(
    rows.players.map((player) => [
      player.code,
      [player.voornaam, player.tussenvoegsel, player.achternaam]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' '),
    ]),
  )
  const byKey = new Map(matches.map((match) => [`${match.season}/${match.code}`, match]))
  const lines = outside.map((one) => {
    const match = byKey.get(`${one.season}/${one.matchCode}`)
    const opponent = clubs.get(one.matchCode.split('.')[0] ?? '') ?? one.matchCode
    const side = one.matchCode.endsWith('.thuis') ? 'thuis' : 'uit'
    const [year = '', month = '', day = ''] = (match?.dateTime.slice(0, 10) ?? '').split('-')

    return `| ${day}-${month}-${year} | ${opponent} (${side}) | ${players.get(one.playerCode) ?? one.playerCode} | ${one.count} | ${String(one.average).replace('.', ',')} |`
  })

  return [
    '# Cijfers voor spelers die niet in de opstelling stonden',
    '',
    'Bezoekers van de oude fansite gaven van 2001 tot 2007 cijfers aan spelers van sc Heerenveen.',
    'Soms gaven ze een cijfer aan een speler die in het verslag van die wedstrijd niet in de opstelling staat.',
    'Die cijfers komen niet in de database van de site.',
    'De redactie beoordeelt per wedstrijd of de opstelling of het cijfer klopt.',
    'De lijst bevat alleen aantallen en gemiddelden, niemand die een cijfer gaf.',
    '',
    'Het script `pnpm export:old-site` in `apps/importer` schrijft dit bestand.',
    'Pas de tabel dus niet met de hand aan.',
    '',
    '| Datum | Wedstrijd | Speler | Aantal cijfers | Gemiddelde |',
    '| ----- | --------- | ------ | -------------- | ---------- |',
    ...lines,
    '',
  ].join('\n')
}

function splitOnce(text: string, separator: string): [string, string] {
  const at = text.indexOf(separator)

  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + separator.length)]
}
