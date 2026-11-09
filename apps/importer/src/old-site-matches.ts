import type { Competition, Match, MatchEdit, NewMatchStatistics } from '@fansite/db/schema'

import { lockedFields } from '@fansite/db/match-edits'
import { compareClaim, differenceLine, findMatchByDate } from '@fansite/db/match-lookup'
import { matchEdits, matches, matchLimits, matchStatistics } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import type { OldSiteClub, OldSiteMatch } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { amsterdamToUtc } from './read-wikipedia.ts'

/** The source marker of the matches this step writes. */
export const oldSiteSource = 'oude-fansite'

/**
 * The competition of a code of the old database (read from the opponents and the dates, see
 * #875). Code 9 is a friendly: those are not in the files and not in the database.
 */
export const oldSiteCompetitions: Readonly<Record<number, Competition>> = {
  1: 'Eredivisie',
  2: 'KNVB Beker',
  3: 'Champions League',
  4: 'Europacup II',
  5: 'Intertoto Cup',
  6: 'UEFA Cup',
  7: 'Eerste divisie',
  8: 'Play-offs UEFA Cup',
}

/** The competitions with a round for each matchday. They have rounds only with 34 matches. */
const leagues: readonly Competition[] = ['Eredivisie', 'Eerste divisie']

/** The matches of a full season of a league. */
const leagueSeasonLength = 34

/**
 * The remarks of the old editors that are facts a visitor can use, with the text that goes in
 * `matches.note`. Every other remark is a working note ("Datum klopt niet", "naar zondag als
 * Uefa Cup", a rescheduling such as "was 14/9", a link, a `*`) and is not copied: `note` is a
 * public column.
 */
const publicNotes: ReadonlyMap<string, string> = new Map([
  ['28 januari afgelast wegens sneeuw', '28 januari afgelast wegens sneeuw'],
  ['begon later door file', 'Begon later door file'],
  ['Debuut in Eredivisie', 'Debuut in Eredivisie'],
  ['kwartfinale', 'Kwartfinale'],
])

/** A match of the files as the database has it, before the club is known. */
export type DerivedOldSiteMatch = {
  /** The club code of the old database, the part of the match code before the dot. */
  clubCode: string
  /** Things worth a line in the log; the match is still written, unless it is skipped. */
  lines: string[]
  /** The match as it is in the file. */
  match: OldSiteMatch
  /** Why the match can't be used, else undefined. */
  skip?: string
  statistics: null | Omit<NewMatchStatistics, 'matchId'>
  /** What goes in the row, or null when the match is skipped. */
  values: null | OldSiteMatchValues
}

/** The fields of a match that this step writes, apart from the club and its name. */
export type OldSiteMatchValues = Omit<Match, 'clubId' | 'id' | 'opponent'>

/** What the old database said about the way a match ended, in `wedstrijd_res.opmerking`. */
type ResultNote =
  | { away: number; home: number; kind: 'extra-score' }
  | { away: number; home: number; kind: 'shootout' }
  | { kind: 'extra' }
  | { kind: 'none' }
  | { kind: 'unknown' }

/**
 * The match of a file as rows of the database. Pure: the round needs the whole list, because it
 * counts the matches of a competition in a season in the order of their date. Returns the
 * matches in that order.
 */
export function deriveOldSiteMatches(oldMatches: readonly OldSiteMatch[]): DerivedOldSiteMatch[] {
  const sorted = [...oldMatches].sort((a, b) => a.dateTime.localeCompare(b.dateTime) || a.code.localeCompare(b.code))
  const sizes = new Map<string, number>()
  const numbers = new Map<string, number>()

  for (const match of sorted) {
    const group = `${match.season}/${match.competition}`

    sizes.set(group, (sizes.get(group) ?? 0) + 1)
  }

  return sorted.map((match) => {
    const group = `${match.season}/${match.competition}`
    const number = (numbers.get(group) ?? 0) + 1

    numbers.set(group, number)

    return deriveOne(match, number, sizes.get(group) ?? 0)
  })
}

/** `9091` is `1990/91`, `0001` is `2000/01`. */
export function oldSiteSeason(code: string): string {
  const start = Number(code.slice(0, 2))

  return `${start >= 90 ? 1900 + start : 2000 + start}/${code.slice(2)}`
}

/** Reads the remark of a result: `n.v.`, `X-Y n.v.`, `X-Y n.s.`, `*` or nothing. */
export function readResultNote(note: null | string): ResultNote {
  const text = (note ?? '').trim()

  if (text === '' || text === '*') {
    return { kind: 'none' }
  }
  if (text === 'n.v.') {
    return { kind: 'extra' }
  }

  const score = /^(\d+)-(\d+) (n\.v\.|n\.s\.)$/.exec(text)

  if (score === null) {
    return { kind: 'unknown' }
  }

  return { away: Number(score[2]), home: Number(score[1]), kind: score[3] === 'n.v.' ? 'extra-score' : 'shootout' }
}

function deriveOne(match: OldSiteMatch, number: number, groupSize: number): DerivedOldSiteMatch {
  const [clubCode = '', side = ''] = match.code.split('.')
  const lines: string[] = []
  const label = `${oldSiteSeason(match.season)} ${match.code}`
  const competition = oldSiteCompetitions[match.competition]
  const home = side.endsWith('thuis') ? true : side.endsWith('uit') ? false : undefined
  const league = competition !== undefined && leagues.includes(competition) && groupSize === leagueSeasonLength
  const [date = '', time = ''] = match.dateTime.split(' ')
  const unknownTime = time === '00:00:00'
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number)
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const empty = {
    clubCode,
    lines,
    match,
    statistics: null,
  }

  if (competition === undefined || home === undefined) {
    return {
      ...empty,
      skip:
        competition === undefined
          ? `skipped ${label}: competition code ${match.competition} is not known`
          : `skipped ${label}: ${match.code} does not say whether sc Heerenveen played at home`,
      values: null,
    }
  }

  const { result } = match
  const ours = (homeValue: number, awayValue: number) => (home ? homeValue : awayValue)
  const theirs = (homeValue: number, awayValue: number) => (home ? awayValue : homeValue)
  let goalsFor = ours(result.homeFullTime, result.awayFullTime)
  let goalsAgainst = theirs(result.homeFullTime, result.awayFullTime)
  let extraTime = false
  let afterNinety: null | { against: number; for: number } = null
  let penalties: null | { against: number; for: number } = null
  const ending = readResultNote(result.note)
  const canHaveExtraTime = !leagues.includes(competition)

  if (ending.kind === 'unknown') {
    lines.push(`${label}: the remark of the result '${result.note}' is not understood, so it is left out`)
  } else if (ending.kind !== 'none' && !canHaveExtraTime) {
    lines.push(`${label}: the remark of the result '${result.note}' is left out, a league match has no extra time`)
  } else if (ending.kind === 'extra') {
    extraTime = true
    afterNinety = ninetyMinutes(match, goalsFor, goalsAgainst)
  } else if (ending.kind === 'extra-score') {
    const finalFor = ours(ending.home, ending.away)
    const finalAgainst = theirs(ending.home, ending.away)

    if (finalFor < goalsFor || finalAgainst < goalsAgainst) {
      lines.push(`${label}: the score '${result.note}' is lower than the score after 90 minutes, so it is left out`)
    } else {
      extraTime = true
      afterNinety = { against: goalsAgainst, for: goalsFor }
      goalsFor = finalFor
      goalsAgainst = finalAgainst
    }
  } else if (ending.kind === 'shootout') {
    if (goalsFor === goalsAgainst) {
      extraTime = true
      penalties = { against: theirs(ending.home, ending.away), for: ours(ending.home, ending.away) }
    } else {
      lines.push(`${label}: the shoot-out '${result.note}' is left out, the score was not level`)
    }
  }

  const stats = match.statistics
  const hasStatistics = Object.values(stats).some((value) => value > 0)
  let referee = (match.referee ?? '').trim() === '' ? null : (match.referee ?? '').trim()
  let attendance = match.attendance === null || match.attendance === 0 ? null : match.attendance

  if (referee !== null && referee.length > matchLimits.referee) {
    lines.push(`${label}: the referee is longer than ${matchLimits.referee} characters, so it is left out`)
    referee = null
  }
  if (attendance !== null && attendance > matchLimits.attendance) {
    lines.push(`${label}: ${attendance} spectators is more than ${matchLimits.attendance}, so it is left out`)
    attendance = null
  }

  return {
    ...empty,
    statistics: hasStatistics
      ? {
          cornersAgainst: theirs(stats.homeCorners, stats.awayCorners),
          cornersFor: ours(stats.homeCorners, stats.awayCorners),
          foulsAgainst: theirs(stats.homeFouls, stats.awayFouls),
          foulsFor: ours(stats.homeFouls, stats.awayFouls),
          offsidesAgainst: theirs(stats.homeOffside, stats.awayOffside),
          offsidesFor: ours(stats.homeOffside, stats.awayOffside),
        }
      : null,
    values: {
      afterNinetyAgainst: afterNinety?.against ?? null,
      afterNinetyFor: afterNinety?.for ?? null,
      attendance,
      competition,
      dataSource: oldSiteSource,
      dateText: null,
      extraTime,
      goalsAgainst,
      goalsFor,
      home,
      kickoffAt: unknownTime ? null : amsterdamToUtc({ day, month, year }, { hours, minutes }),
      matchDate: date,
      note: match.note === null ? null : (publicNotes.get(match.note.trim()) ?? null),
      penaltiesAgainst: penalties?.against ?? null,
      penaltiesFor: penalties?.for ?? null,
      referee,
      resultSetAt: null,
      round: league ? `Speelronde ${number}` : `Wedstrijd ${number}`,
      season: oldSiteSeason(match.season),
      sourceLine: null,
      stadium: null,
      status: 'played',
    },
  }
}

/**
 * The score after 90 minutes when the goals of the match prove it: the list has as many goals
 * for each side as the final score, each with a minute, and none is an own goal (the file does
 * not say for whom those count). Else undefined, and the score after 90 minutes stays empty.
 */
function ninetyMinutes(
  match: OldSiteMatch,
  goalsFor: number,
  goalsAgainst: number,
): null | { against: number; for: number } {
  const goals = match.events.filter((event) => event.event === 1)
  const ours = goals.filter((goal) => goal.playerCode !== null)
  const theirs = goals.filter((goal) => goal.playerCode === null)

  if (
    goals.some((goal) => goal.minute === 0 || goal.kind === 'eigen doelpunt') ||
    ours.length !== goalsFor ||
    theirs.length !== goalsAgainst
  ) {
    return null
  }

  return {
    against: theirs.filter((goal) => goal.minute <= 90).length,
    for: ours.filter((goal) => goal.minute <= 90).length,
  }
}

/** The key that makes a match unique in `matches`. */
export const matchKey = (match: Pick<Match, 'competition' | 'round' | 'season'>) =>
  `${match.season}|${match.competition}|${match.round}`

/** What the step knows of a match in the database. */
type StoredMatch = Match

const kickoffFields = ['dateText', 'kickoffAt', 'matchDate'] as const
const resultFields = [
  'afterNinetyAgainst',
  'afterNinetyFor',
  'extraTime',
  'goalsAgainst',
  'goalsFor',
  'penaltiesAgainst',
  'penaltiesFor',
  'status',
] as const
const factFields = ['attendance', 'note', 'referee'] as const
const otherFields = ['clubId', 'home', 'opponent'] as const

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b

/**
 * The step `matches`: makes a row in `matches` for every match in the files, and a row in
 * `match_statistics` where there are numbers. It finds a match first by club and date
 * (`findMatchByDate`): one from another source only gets its empty fields filled, and a field
 * that differs is a line in the log. Else it touches only rows with the source
 * `oude-fansite`, leaves the parts the editors filled in as they are (`match_edits`) and
 * never removes a row. Needs the clubs of the step before it (`clubIds`, by club code).
 */
export async function importOldSiteMatches(
  db: Pick<OldSiteDatabase, 'insert' | 'select' | 'update'>,
  oldMatches: readonly OldSiteMatch[],
  oldClubs: readonly OldSiteClub[],
  clubIds: ReadonlyMap<string, number>,
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const names = new Map(oldClubs.map((club) => [club.code, club.name]))
  const stored = new Map<string, StoredMatch>()
  const edits = new Map<number, MatchEdit>()
  const statistics = new Map<number, typeof matchStatistics.$inferSelect>()

  for (const row of await db.select().from(matches)) {
    stored.set(matchKey(row), row)
  }
  for (const row of await db.select().from(matchEdits)) {
    edits.set(row.matchId, row)
  }
  for (const row of await db.select().from(matchStatistics)) {
    statistics.set(row.matchId, row)
  }

  const derived = deriveOldSiteMatches(oldMatches)
  const keys = new Set<string>()
  let remarks = 0

  for (const one of derived) {
    const { match } = one
    const label = `${oldSiteSeason(match.season)} ${match.code}`

    if (match.note !== null && match.note.trim() !== '' && one.values?.note === null) {
      remarks += 1
    }
    if (one.skip !== undefined || one.values === null) {
      report.skipped += 1
      report.lines.push(one.skip ?? `skipped ${label}`)
      continue
    }

    const clubId = clubIds.get(one.clubCode)
    const opponent = names.get(one.clubCode)

    if (clubId === undefined || opponent === undefined || opponent.length > matchLimits.opponent) {
      report.skipped += 1
      report.lines.push(`skipped ${label}: its club '${one.clubCode}' is not in the database`)
      continue
    }

    const values = { ...one.values, clubId, opponent }
    const key = matchKey(values)
    const before = stored.get(key)

    keys.add(key)
    report.lines.push(...one.lines)

    if (before === undefined) {
      // The same match may be there already from another source under another round.
      const lookup = await findMatchByDate(db, {
        clubId,
        competition: values.competition,
        date: values.matchDate,
        season: values.season,
      })

      if (lookup.kind === 'ambiguous' && lookup.matches.some((row) => row.dataSource !== oldSiteSource)) {
        report.lines.push(
          `${label}: ${lookup.matches.length} matches against the same club within a day, so it is not matched to one of them`,
        )
      }
      if (lookup.kind === 'found' && lookup.match.dataSource !== oldSiteSource) {
        const { differences, fill } = compareClaim(lookup.match, values, lockedFields(edits.get(lookup.match.id)))

        report.lines.push(...differences.map((difference) => differenceLine(lookup.match, difference, oldSiteSource)))

        // A match the editors added is theirs: it is compared and never filled.
        if (Object.keys(fill).length > 0 && lookup.match.dataSource !== 'redactie') {
          await db.update(matches).set(fill).where(eq(matches.id, lookup.match.id))
          report.changed += 1
        } else {
          report.unchanged += 1
        }

        continue
      }

      const [{ insertId }] = await db.insert(matches).values(values)

      if (one.statistics !== null) {
        await db.insert(matchStatistics).values({ ...one.statistics, matchId: insertId })
      }
      report.created += 1
      continue
    }
    if (before.dataSource !== oldSiteSource) {
      report.skipped += 1
      report.lines.push(`skipped ${label}: there is a match from ${before.dataSource} under the same key (${key})`)
      continue
    }

    const edit = edits.get(before.id)
    const fields = [
      ...(edit?.kickoffEdited === true ? [] : kickoffFields),
      ...(edit?.resultEdited === true ? [] : resultFields),
      ...(edit?.factsEdited === true ? [] : factFields),
      ...otherFields,
    ] as const
    const change: Record<string, unknown> = {}

    for (const field of fields) {
      if (!sameValue(before[field], values[field])) {
        change[field] = values[field]
      }
    }

    const oldStatistics = statistics.get(before.id)
    const statisticsDiffer =
      one.statistics !== null &&
      (oldStatistics === undefined ||
        (Object.keys(one.statistics) as (keyof typeof one.statistics)[]).some(
          (field) => oldStatistics[field] !== one.statistics?.[field],
        ))

    if (Object.keys(change).length === 0 && !statisticsDiffer) {
      report.unchanged += 1
      continue
    }
    if (Object.keys(change).length > 0) {
      await db.update(matches).set(change).where(eq(matches.id, before.id))
    }
    if (statisticsDiffer && one.statistics !== null) {
      await db
        .insert(matchStatistics)
        .values({ ...one.statistics, matchId: before.id })
        .onDuplicateKeyUpdate({ set: one.statistics })
    }
    report.changed += 1
    report.lines.push(
      `${label}: ${[...Object.keys(change), ...(statisticsDiffer ? ['statistics'] : [])].join(', ')} updated`,
    )
  }

  for (const [key, row] of stored) {
    if (row.dataSource === oldSiteSource && !keys.has(key)) {
      report.lines.push(`${row.season} ${row.round} (${row.competition}) is no longer in the files, left as it is`)
    }
  }
  if (remarks > 0) {
    report.lines.push(`${remarks} remarks of the old editors are not copied to the note: they are working notes`)
  }

  return report
}
