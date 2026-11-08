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
 * interpretation, no prose and no data of people beyond a name, a code and the line they play
 * in. A number or text means what the old database meant by it: a `0` for corners, offside
 * or fouls is "not known", for instance, and `home` is the side the old database called `t`.
 * Every schema is strict, so a field that isn't listed here makes a file unreadable. That is
 * the guard against personal data slipping in.
 */

/** The version of the file format. A change to the shape of a file raises it. */
export const oldSiteFileVersion = 2

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

export const oldSiteFileSchema = z.union([oldSiteClubsFileSchema, oldSitePlayersFileSchema, oldSiteMatchesFileSchema])

export type OldSiteClub = z.output<typeof oldSiteClubSchema>
/** All the facts of the old site, as the import reads them. */
export type OldSiteData = {
  clubs: OldSiteClub[]
  matches: OldSiteMatch[]
  players: OldSitePlayer[]
}
export type OldSiteEvent = z.output<typeof oldSiteEventSchema>
export type OldSiteFile = z.output<typeof oldSiteFileSchema>
export type OldSiteLineupEntry = z.output<typeof oldSiteLineupSchema>
export type OldSiteMatch = z.output<typeof oldSiteMatchSchema>

export type OldSitePlayer = z.output<typeof oldSitePlayerSchema>

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
  const data: OldSiteData = { clubs: [], matches: [], players: [] }
  let clubFiles = 0
  let playerFiles = 0

  for (const name of names) {
    const file = await readOldSiteFile(path.join(directory, name))

    if ('clubs' in file) {
      clubFiles += 1
      data.clubs.push(...file.clubs)
    } else if ('players' in file) {
      playerFiles += 1
      data.players.push(...file.players)
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

  const keys = new Set<string>()

  for (const match of data.matches) {
    const key = `${match.season}/${match.code}`

    if (keys.has(key)) {
      throw new Error(`The match ${key} is in the files twice.`)
    }
    keys.add(key)
  }

  data.matches.sort((a, b) => a.dateTime.localeCompare(b.dateTime) || a.code.localeCompare(b.code))

  return data
}

/** Reads one file of the old site and refuses it when it doesn't fit the format. */
export async function readOldSiteFile(file: string | URL): Promise<OldSiteFile> {
  return parseOldSiteFile(await readFile(file, 'utf8'), path.basename(String(file)))
}
