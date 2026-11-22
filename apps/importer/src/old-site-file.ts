import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as z from 'zod'

/**
 * The files that `pnpm export:old-site` writes from the database of the old fansite
 * (1990 to 2007), and the function that reads them. The import (#876 to #879) reads these
 * files and never the old database, which production can't reach.
 *
 * The files hold the facts of the old database in a tidy form and nothing more: no
 * interpretation, no prose and no data of people beyond a name, a code, the line they play in
 * and the country they play for. A number or text means what the old database meant by it: a
 * `0` for corners, offside or fouls is "not known", for instance, and `home` is the side the
 * old database called `t`.
 * Every schema is strict, so a field that isn't listed here makes a file unreadable. That is
 * the guard against personal data slipping in.
 */

/** The version of the file format. A change to the shape of a file raises it. */
export const oldSiteFileVersion = 3

/** The folder in the repository that holds the files. */
export const oldSiteDataFolder = new URL('../data/oude-fansite/', import.meta.url)

/** The biggest the files may be together, in bytes. */
export const oldSiteMaxBytes = 5 * 1024 * 1024

const count = z.number().int().min(0)

/** The four lines of a player: the same words as `playerPositions` of the database. */
export const oldSiteLines = ['doelman', 'verdediger', 'middenvelder', 'aanvaller'] as const

export type OldSiteLine = (typeof oldSiteLines)[number]

export const oldSiteClubSchema = z.strictObject({
  code: z.string().min(1),
  country: z.string().min(1),
  name: z.string().min(1),
})

export const oldSitePlayerSchema = z.strictObject({
  code: z.string().min(1),
  /**
   * The country of the player as the old database wrote it (`speler.nationaliteit`): two
   * capitals, or null when it is empty. It is a code of the old site and not always the one of
   * ISO 3166 (`VS`, `CR` for Croatia): `oldSiteCountryCodes` knows which country it is.
   */
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
  firstName: z.string(),
  infix: z.string().nullable(),
  lastName: z.string().min(1),
  /** The line of the player's career (`speler.linie`), or null when it is not known (0). */
  line: z.enum(oldSiteLines).nullable(),
})

/** A goal (1), a yellow card (2), a yellow-red card (3) or a red card (4) */
export const oldSiteEventSchema = z.strictObject({
  assist: z.string().nullable(),
  event: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  kind: z.string().nullable(),
  minute: count,
  playerCode: z.string().nullable(),
  playerName: z.string().nullable(),
})

export const oldSiteLineupSchema = z.strictObject({
  minuteIn: count,
  minuteOut: count,
  order: count,
  playerCode: z.string().nullable(),
  playerName: z.string().nullable(),
})

export const oldSiteMatchSchema = z.strictObject({
  attendance: count.nullable(),
  code: z.string().min(1),
  competition: count,
  dateTime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  events: z.array(oldSiteEventSchema),
  lineup: z.array(oldSiteLineupSchema),
  note: z.string().nullable(),
  referee: z.string().nullable(),
  result: z.strictObject({
    awayFullTime: count,
    awayHalfTime: count,
    homeFullTime: count,
    homeHalfTime: count,
    note: z.string().nullable(),
  }),
  round: count.nullable(),
  season: z.string().regex(/^\d{4}$/),
  statistics: z.strictObject({
    awayCorners: count,
    awayFouls: count,
    awayOffside: count,
    homeCorners: count,
    homeFouls: count,
    homeOffside: count,
  }),
})

export const oldSiteClubsFileSchema = z.strictObject({
  clubs: z.array(oldSiteClubSchema),
  version: z.literal(oldSiteFileVersion),
})

export const oldSitePlayersFileSchema = z.strictObject({
  players: z.array(oldSitePlayerSchema),
  version: z.literal(oldSiteFileVersion),
})

export const oldSiteMatchesFileSchema = z.strictObject({
  matches: z.array(oldSiteMatchSchema),
  season: z.string().regex(/^\d{4}$/),
  version: z.literal(oldSiteFileVersion),
})

/**
 * What supporters of the old fansite gave one player in one match (1465): the average, the
 * number of ratings and their spread (the standard deviation, in grades), worked out by the
 * export. The file has no name, no time and no one who gave a rating, only these three numbers.
 */
export const oldSiteRatingSchema = z.strictObject({
  average: z.number().min(1).max(10),
  count: z.number().int().min(1),
  matchCode: z.string().min(1),
  playerCode: z.string().min(1),
  spread: z.number().min(0).max(9),
})

/**
 * What supporters of the old fansite gave the head coach in one match (1502): the same three
 * numbers as a player has, and the code of the coach instead of the code of a player.
 */
export const oldSiteCoachRatingSchema = z.strictObject({
  average: z.number().min(1).max(10),
  coachCode: z.string().min(1),
  count: z.number().int().min(1),
  matchCode: z.string().min(1),
  spread: z.number().min(0).max(9),
})

/** The ratings of the matches of one season, in `ratings-<season>.json`. */
export const oldSiteRatingsFileSchema = z.strictObject({
  coachRatings: z.array(oldSiteCoachRatingSchema),
  ratings: z.array(oldSiteRatingSchema),
  season: z.string().regex(/^\d{4}$/),
  version: z.literal(oldSiteFileVersion),
})

/** How many visitors predicted one score: home first, as the old database has it. */
export const oldSitePredictionScoreSchema = z.strictObject({
  away: count.max(99),
  count: z.number().int().min(1),
  home: count.max(99),
})

/**
 * What visitors of the old fansite predicted for one match (#1457): how many predicted each
 * full-time score and each half-time score. The file has these counts and nothing else: no
 * name, no address, no time and no number for a person. A visitor who predicted a match twice
 * counts once, and the predictions of before the first accounts count as a number only.
 */
export const oldSitePredictionSchema = z.strictObject({
  fullTime: z.array(oldSitePredictionScoreSchema).min(1),
  halfTime: z.array(oldSitePredictionScoreSchema),
  matchCode: z.string().min(1),
})

/** The predictions of the matches of one season, in `predictions-<season>.json`. */
export const oldSitePredictionsFileSchema = z.strictObject({
  predictions: z.array(oldSitePredictionSchema),
  season: z.string().regex(/^\d{4}$/),
  version: z.literal(oldSiteFileVersion),
})

/** The season rating the old fansite kept for a player in 1998/99 to 2000/01: an average. */
export const oldSiteSeasonRatingSchema = z.strictObject({
  average: z.number().min(1).max(10),
  playerCode: z.string().min(1),
  season: z.string().regex(/^\d{4}$/),
})

/** The season ratings before 2001, in `season-ratings.json`. */
export const oldSiteSeasonRatingsFileSchema = z.strictObject({
  seasonRatings: z.array(oldSiteSeasonRatingSchema),
  version: z.literal(oldSiteFileVersion),
})

const fantestAnswers = z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)])

/**
 * One question of the Fantest of the old fansite (#1480): the text, the four answers, the
 * place of the right one (0 to 3) and, when the month had enough participants, how many
 * percent chose each answer. The file has no name and no answer of a person.
 */
export const oldSiteFantestQuestionSchema = z.strictObject({
  answers: fantestAnswers,
  correct: z.number().int().min(0).max(3),
  /** The place in the old quiz (1 to 10), also when an earlier question is left out. */
  order: z.number().int().min(1).max(10),
  /** Whole percentages in the order of the answers, or null when nobody took part. */
  percentages: z
    .tuple([
      z.number().int().min(0).max(100),
      z.number().int().min(0).max(100),
      z.number().int().min(0).max(100),
      z.number().int().min(0).max(100),
    ])
    .nullable(),
  text: z.string().min(1),
})

/**
 * One month of the Fantest: the questions that can be shown, how many were left out (a question
 * with a picture), how many visitors took part and their average score over the questions that
 * are in the file, as one number with one decimal (null when nobody took part).
 */
export const oldSiteFantestMonthSchema = z.strictObject({
  average: z.number().min(0).max(10).nullable(),
  month: z.number().int().min(1).max(12),
  omitted: z.number().int().min(0).max(10),
  participants: count,
  questions: z.array(oldSiteFantestQuestionSchema).min(1).max(10),
  year: z.number().int().min(2001).max(2005),
})

/** The months of the Fantest, in `fantest.json`. */
export const oldSiteFantestFileSchema = z.strictObject({
  months: z.array(oldSiteFantestMonthSchema),
  version: z.literal(oldSiteFileVersion),
})

export const oldSiteFileSchema = z.union([
  oldSiteFantestFileSchema,
  oldSiteClubsFileSchema,
  oldSitePlayersFileSchema,
  oldSiteMatchesFileSchema,
  oldSiteRatingsFileSchema,
  oldSitePredictionsFileSchema,
  oldSiteSeasonRatingsFileSchema,
])

export type OldSiteClub = z.output<typeof oldSiteClubSchema>
export type OldSiteCoachRating = z.output<typeof oldSiteCoachRatingSchema>
export type OldSiteCoachRatingOfSeason = OldSiteCoachRating & { season: string }
/** All the facts of the old site, as the import reads them. */
export type OldSiteData = {
  clubs: OldSiteClub[]
  /** The averages per match and head coach, each with the season of its file. */
  coachRatings: OldSiteCoachRatingOfSeason[]
  /** The months of the Fantest of the old fansite (#1480). */
  fantest: OldSiteFantestMonth[]
  matches: OldSiteMatch[]
  players: OldSitePlayer[]
  /** The counts of predictions per match, each with the season of its file. */
  predictions: OldSitePredictionOfSeason[]
  /** The averages per match and player, each with the season of its file. */
  ratings: OldSiteRatingOfSeason[]
  seasonRatings: OldSiteSeasonRating[]
}
export type OldSiteEvent = z.output<typeof oldSiteEventSchema>
export type OldSiteFantestMonth = z.output<typeof oldSiteFantestMonthSchema>
export type OldSiteFantestQuestion = z.output<typeof oldSiteFantestQuestionSchema>
export type OldSiteFile = z.output<typeof oldSiteFileSchema>
export type OldSiteLineupEntry = z.output<typeof oldSiteLineupSchema>
export type OldSiteMatch = z.output<typeof oldSiteMatchSchema>
export type OldSitePlayer = z.output<typeof oldSitePlayerSchema>
export type OldSitePrediction = z.output<typeof oldSitePredictionSchema>
export type OldSitePredictionOfSeason = OldSitePrediction & { season: string }
export type OldSitePredictionScore = z.output<typeof oldSitePredictionScoreSchema>
export type OldSiteRating = z.output<typeof oldSiteRatingSchema>
export type OldSiteRatingOfSeason = OldSiteRating & { season: string }
export type OldSiteSeasonRating = z.output<typeof oldSiteSeasonRatingSchema>

/**
 * Parses the text of one file. It throws when the text isn't JSON, has another version or has a
 * field or value outside the format; the message names the file.
 */
export function parseOldSiteFile(text: string, name = 'file'): OldSiteFile {
  let json: unknown

  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${name} is not JSON.`)
  }

  const result = oldSiteFileSchema.safeParse(json)

  if (!result.success) {
    const problems = result.error.issues.slice(0, 5).map((issue) => `${issue.path.join('.')}: ${issue.message}`)

    throw new Error(`${name} does not match the format of the old site files:\n- ${problems.join('\n- ')}`)
  }

  return result.data
}

/**
 * Reads every file in the folder (the repository's by default) and puts them together: the
 * matches of all seasons in the order of their date. It refuses a folder with a missing or
 * double clubs or players file, a season in the wrong file, or a match that comes twice.
 */
export async function readOldSiteData(folder: string | URL = oldSiteDataFolder): Promise<OldSiteData> {
  const directory = typeof folder === 'string' ? folder : fileURLToPath(folder)
  const names = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort()
  const data: OldSiteData = {
    clubs: [],
    coachRatings: [],
    fantest: [],
    matches: [],
    players: [],
    predictions: [],
    ratings: [],
    seasonRatings: [],
  }
  let clubFiles = 0
  let fantestFiles = 0
  let playerFiles = 0
  let seasonRatingFiles = 0

  for (const name of names) {
    const file = await readOldSiteFile(path.join(directory, name))

    if ('months' in file) {
      fantestFiles += 1
      data.fantest.push(...file.months)
    } else if ('clubs' in file) {
      clubFiles += 1
      data.clubs.push(...file.clubs)
    } else if ('players' in file) {
      playerFiles += 1
      data.players.push(...file.players)
    } else if ('predictions' in file) {
      data.predictions.push(...file.predictions.map((prediction) => ({ ...prediction, season: file.season })))
    } else if ('ratings' in file) {
      data.ratings.push(...file.ratings.map((rating) => ({ ...rating, season: file.season })))
      data.coachRatings.push(...file.coachRatings.map((rating) => ({ ...rating, season: file.season })))
    } else if ('seasonRatings' in file) {
      seasonRatingFiles += 1
      data.seasonRatings.push(...file.seasonRatings)
    } else {
      for (const match of file.matches) {
        if (match.season !== file.season) {
          throw new Error(`${name} holds the match ${match.code} of season ${match.season}, not ${file.season}.`)
        }
      }
      data.matches.push(...file.matches)
    }
  }

  if (clubFiles !== 1 || playerFiles !== 1) {
    throw new Error(`${directory} needs one clubs file and one players file, and has ${clubFiles} and ${playerFiles}.`)
  }

  if (seasonRatingFiles > 1) {
    throw new Error(`${directory} has ${seasonRatingFiles} season ratings files, and one is the most it may have.`)
  }

  if (fantestFiles > 1) {
    throw new Error(`${directory} has ${fantestFiles} Fantest files, and one is the most it may have.`)
  }

  const fantestKeys = new Set<string>()

  for (const { month, year } of data.fantest) {
    const key = `${year}-${String(month).padStart(2, '0')}`

    if (fantestKeys.has(key)) {
      throw new Error(`The Fantest of ${key} is in the files twice.`)
    }
    fantestKeys.add(key)
  }

  const keys = new Set<string>()

  for (const match of data.matches) {
    const key = `${match.season}/${match.code}`

    if (keys.has(key)) {
      throw new Error(`The match ${key} is in the files twice.`)
    }
    keys.add(key)
  }

  const ratingKeys = new Set<string>()

  for (const rating of data.ratings) {
    const key = `${rating.season}/${rating.matchCode}`

    if (!keys.has(key)) {
      throw new Error(`The ratings hold the match ${key}, which is not in the match files.`)
    }
    if (ratingKeys.has(`${key}/${rating.playerCode}`)) {
      throw new Error(`The rating of ${rating.playerCode} in the match ${key} is in the files twice.`)
    }
    ratingKeys.add(`${key}/${rating.playerCode}`)
  }

  const predictionKeys = new Set<string>()

  for (const prediction of data.predictions) {
    const key = `${prediction.season}/${prediction.matchCode}`

    if (!keys.has(key)) {
      throw new Error(`The predictions hold the match ${key}, which is not in the match files.`)
    }
    if (predictionKeys.has(key)) {
      throw new Error(`The predictions of the match ${key} are in the files twice.`)
    }
    predictionKeys.add(key)
  }

  const coachKeys = new Set<string>()

  for (const rating of data.coachRatings) {
    const key = `${rating.season}/${rating.matchCode}`

    if (!keys.has(key)) {
      throw new Error(`The coach ratings hold the match ${key}, which is not in the match files.`)
    }
    if (coachKeys.has(`${key}/${rating.coachCode}`)) {
      throw new Error(`The rating of ${rating.coachCode} in the match ${key} is in the files twice.`)
    }
    coachKeys.add(`${key}/${rating.coachCode}`)
  }

  data.matches.sort((a, b) => a.dateTime.localeCompare(b.dateTime) || a.code.localeCompare(b.code))

  return data
}

/** Reads one file of the old site and refuses it when it doesn't fit the format. */
export async function readOldSiteFile(file: string | URL): Promise<OldSiteFile> {
  return parseOldSiteFile(await readFile(file, 'utf8'), path.basename(String(file)))
}
