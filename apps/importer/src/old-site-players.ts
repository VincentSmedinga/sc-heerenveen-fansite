import { playerNameMaxLength, players } from '@fansite/db/schema'
import { inArray } from 'drizzle-orm'

import type { OldSiteMatch, OldSitePlayer } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { deriveOldSiteMatches } from './old-site-matches.ts'
import { nameKey, searchTerm } from './read-squad.ts'

/** A code of the old database is `voornaam.achternaam`: lower case, with dots and no spaces. */
const codeShape = /^[a-z][a-z'’-]*(\.[a-z'’-]+)+$/u

/** A player of sc Heerenveen in a match, with the season of the match. */
export type OldSitePlayerRef = {
  /** The code of the old database. */
  code: string
  /** The full name: given name, infix and surname, with single spaces. */
  name: string
  /** True when the code has no row in the old table `speler`: the name comes from the code. */
  nameFromCode: boolean
  /** The surname with its infix, as Wikipedia does (`van Aken`). */
  searchTerm: string
  /** The season of the match, such as `1999/00`. */
  season: string
}

/** The key of a player in `players`: the season and the name, as the database compares them. */
export const oldSitePlayerKey = (season: string, name: string) => `${season}|${nameKey(name)}`

/** The full name of a player of the old table: given name, infix and surname, single spaces. */
export function oldSitePlayerName(player: Pick<OldSitePlayer, 'firstName' | 'infix' | 'lastName'>): string {
  return [player.firstName, player.infix, player.lastName]
    .filter((part): part is string => part !== null && part.trim() !== '')
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * Whether the code of a goal, an assist or a line-up is a player of ours. A code with a space
 * (`X. Alberts`) is the name of a player of the opponent, which the old editors typed in the
 * field for the code, and an empty code means the name is in the field for the name.
 */
export const isOurCode = (code: null | string): code is string =>
  code !== null && code.trim() !== '' && !code.includes(' ')

/**
 * Every player of ours in the matches that can be written, once for each season and name, in
 * the order they first appear. A match that can't be written (an unknown competition) adds
 * none.
 */
export function deriveOldSitePlayers(
  oldMatches: readonly OldSiteMatch[],
  oldPlayers: readonly OldSitePlayer[],
): OldSitePlayerRef[] {
  const byCode = new Map(oldPlayers.map((player) => [player.code, player]))
  const found = new Map<string, OldSitePlayerRef>()

  for (const one of deriveOldSiteMatches(oldMatches)) {
    if (one.values === null) {
      continue
    }

    for (const code of ourCodesOf(one.match)) {
      const ref = resolveOldSiteCode(code, byCode, one.values.season)

      if (ref !== undefined && !found.has(oldSitePlayerKey(ref.season, ref.name))) {
        found.set(oldSitePlayerKey(ref.season, ref.name), ref)
      }
    }
  }

  return [...found.values()]
}

/**
 * The step `spelers`: makes a row in `players` for every player of ours in the matches of the
 * files, for the season of the match, with the source `verslag` and without a shirt number, a
 * position, a Wikipedia page or a person. A row that exists for that season and name, from any
 * source, is used as it is and never changed. Linking a player to a person is a later issue.
 */
export async function importOldSitePlayers(
  db: Pick<OldSiteDatabase, 'insert' | 'select'>,
  oldMatches: readonly OldSiteMatch[],
  oldPlayers: readonly OldSitePlayer[],
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const wanted = deriveOldSitePlayers(oldMatches, oldPlayers)
  const seasons = [...new Set(wanted.map((player) => player.season))]
  const stored = new Set<string>()
  const fresh: (typeof players.$inferInsert)[] = []

  if (seasons.length > 0) {
    for (const row of await db.select().from(players).where(inArray(players.season, seasons))) {
      stored.add(oldSitePlayerKey(row.season, row.name))
    }
  }

  for (const player of wanted) {
    if (player.name.length > playerNameMaxLength || player.searchTerm.length > playerNameMaxLength) {
      report.skipped += 1
      report.lines.push(`skipped ${player.code} (${player.season}): the name is longer than ${playerNameMaxLength}`)
      continue
    }
    if (player.nameFromCode) {
      report.lines.push(
        `${player.code} (${player.season}) has no row in the old table speler, so its name '${player.name}' comes from the code`,
      )
    }
    if (stored.has(oldSitePlayerKey(player.season, player.name))) {
      report.unchanged += 1
      continue
    }
    fresh.push({
      name: player.name,
      searchTerm: player.searchTerm,
      season: player.season,
      source: 'verslag',
    })
  }

  for (let start = 0; start < fresh.length; start += 200) {
    await db.insert(players).values(fresh.slice(start, start + 200))
  }
  report.created = fresh.length

  return report
}

/** The ids of the players of the seasons, by season and name (`oldSitePlayerKey`). */
export async function oldSitePlayerIds(
  db: Pick<OldSiteDatabase, 'select'>,
  seasons: readonly string[],
): Promise<Map<string, number>> {
  const ids = new Map<string, number>()

  if (seasons.length === 0) {
    return ids
  }
  for (const row of await db
    .select()
    .from(players)
    .where(inArray(players.season, [...seasons]))) {
    ids.set(oldSitePlayerKey(row.season, row.name), row.id)
  }

  return ids
}

/**
 * The players of ours in a match: the scorers (also of an own goal), the codes of the assists
 * and the line-up. An assist is a name or a code and only a code is sure to be ours, so a name
 * is left to the step with the line-ups (#879). Cards are left out: every carded player is in
 * the line-up, and the coach is not a player.
 */
export function ourCodesOf(match: OldSiteMatch): string[] {
  const codes = new Set<string>()

  for (const event of match.events) {
    if (event.event === 1 && isOurCode(event.playerCode)) {
      codes.add(event.playerCode)
    }
    if (event.event === 1 && event.assist !== null && isOurCode(event.assist) && codeShape.test(event.assist)) {
      codes.add(event.assist)
    }
  }
  for (const entry of match.lineup) {
    if (isOurCode(entry.playerCode)) {
      codes.add(entry.playerCode)
    }
  }

  return [...codes]
}

/**
 * The player of ours that a code stands for: the row of the old table `speler`, or else a name
 * made from a code in the shape `voornaam.achternaam` (`ivan.tzvekov` is `Ivan Tzvekov`). Else
 * undefined: the code is not a player (a coach such as `foppe.dehaan` is, but is never asked).
 */
export function resolveOldSiteCode(
  code: string,
  byCode: ReadonlyMap<string, OldSitePlayer>,
  season: string,
): OldSitePlayerRef | undefined {
  const known = byCode.get(code)

  if (known !== undefined) {
    const name = oldSitePlayerName(known)

    return {
      code,
      name,
      nameFromCode: false,
      searchTerm: [known.infix, known.lastName].filter((part) => part !== null && part !== '').join(' '),
      season,
    }
  }
  if (!codeShape.test(code)) {
    return undefined
  }

  const name = code
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return { code, name, nameFromCode: true, searchTerm: searchTerm(name), season }
}
