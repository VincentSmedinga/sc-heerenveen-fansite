import type { Competition, Match, MatchEdit, NewMatchStatistics } from '@fansite/db/schema'

import { dropHalfTimeThatNoLongerFits, lockedFields } from '@fansite/db/match-edits'
import { compareClaim, findMatchByDate } from '@fansite/db/match-lookup'
import { matchEdits, matches, matchLimits, matchStatistics } from '@fansite/db/schema'
import { keepSourceDifferences, readTakenOverParts } from '@fansite/db/source-differences'
import { eq } from 'drizzle-orm'

import type { OldSiteClub, OldSiteMatch } from './old-site-file.ts'
import type { OldSiteContext, OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { crossTableKey, crossTableSeasons, crossTableSeasonsOf, readCrossTableScores } from './old-site-cross-tables.ts'
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
  /** The old fansite marked the score at half-time as not known (#1617), so it stays empty. */
  halfTimeUnknown?: boolean
  /** Things worth a line in the log; the match is still written, unless it is skipped. */
  lines: string[]
  /** The match as it is in the file. */
  match: OldSiteMatch
  /**
   * The old fansite has nothing of this match (#1622): 0-0 at the end and at half-time, no
   * goals, cards, lineup, referee, spectators or statistics, and no remark on the result. Only
   * with a check against Wikipedia is that a match without a result (`result_unknown`).
   */
  noRecord?: boolean
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

/** Asks for the cross tables of the seasons that have a match with nothing recorded. */
async function askWikipedia(
  db: Pick<OldSiteDatabase, 'select'>,
  candidates: readonly DerivedOldSiteMatch[],
  crossTables: OldSiteContext['crossTables'],
) {
  const seasons = crossTableSeasonsOf({ matches: candidates.map((one) => one.match) })

  return crossTables === undefined || seasons.length === 0
    ? undefined
    : readCrossTableScores(db, await crossTables(seasons))
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

  // The score at half-time (#1445) is the one of the regular playing time, so it can't exceed
  // the score after 90 minutes, or the final score when there was no extra time.
  let halfTime: null | { against: number; for: number } = {
    against: theirs(result.homeHalfTime, result.awayHalfTime),
    for: ours(result.homeHalfTime, result.awayHalfTime),
  }
  const regularFor = afterNinety?.for ?? goalsFor
  const regularAgainst = afterNinety?.against ?? goalsAgainst

  // The old fansite stored 0-0 where it did not know the score at half-time, and marked those
  // matches of 1990/91 with a `*` (#1617). A goalless result leaves no other score possible.
  const halfTimeUnknown =
    match.season === '9091' && (result.note ?? '').trim() === '*' && (goalsFor > 0 || goalsAgainst > 0)

  if (halfTimeUnknown) {
    halfTime = null
  } else if (halfTime.for > regularFor || halfTime.against > regularAgainst) {
    lines.push(
      `${label}: the score at half-time ${halfTime.for}-${halfTime.against} is higher than the score of the regular playing time ${regularFor}-${regularAgainst}, so it is left out`,
    )
    halfTime = null
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

  const noRecord =
    result.homeFullTime === 0 &&
    result.awayFullTime === 0 &&
    result.homeHalfTime === 0 &&
    result.awayHalfTime === 0 &&
    match.events.length === 0 &&
    match.lineup.length === 0 &&
    (match.referee ?? '').trim() === '' &&
    (match.attendance ?? 0) === 0 &&
    !hasStatistics &&
    ending.kind === 'none'

  return {
    ...empty,
    halfTimeUnknown,
    noRecord,
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
      halfTimeAgainst: halfTime?.against ?? null,
      halfTimeFor: halfTime?.for ?? null,
      halfTimeSource: halfTime === null ? null : 'oude-fansite',
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
      stadiumId: null,
      status: 'played',
    },
  }
}

/** Whether a score at half-time fits the result a row will have (see `matches_half_time_*`). */
function fitsResult(
  claim: Pick<Match, 'halfTimeAgainst' | 'halfTimeFor'>,
  row: Pick<Match, 'afterNinetyAgainst' | 'afterNinetyFor' | 'goalsAgainst' | 'goalsFor' | 'status'>,
) {
  return Object.keys(dropHalfTimeThatNoLongerFits(claim, row)).length === 0
}

/** Whether a match of a league has a cross table on Wikipedia to check a 0-0 against (#976). */
function inCrossTables(values: Pick<OldSiteMatchValues, 'competition' | 'season'>): boolean {
  return (
    leagues.includes(values.competition) &&
    values.season >= crossTableSeasons.first &&
    values.season <= crossTableSeasons.last
  )
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

/** The row of a match nothing is known of: no score, no half-time, no spectators (#1622). */
function withoutResult<Values extends OldSiteMatchValues>(values: Values): Values {
  return {
    ...values,
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    attendance: null,
    extraTime: false,
    goalsAgainst: null,
    goalsFor: null,
    halfTimeAgainst: null,
    halfTimeFor: null,
    halfTimeSource: null,
    penaltiesAgainst: null,
    penaltiesFor: null,
    status: 'result_unknown',
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
  now = new Date(),
  crossTables?: OldSiteContext['crossTables'],
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

  // The parts the editors took over from another source (#974) stay as they decided.
  const takenOver = await readTakenOverParts(
    db,
    [...stored.values()].filter((row) => row.dataSource === oldSiteSource).map((row) => row.id),
  )

  const derived = deriveOldSiteMatches(oldMatches)
  const keys = new Set<string>()
  let remarks = 0
  let clearedHalfTimes = 0
  const withoutResultBySeason = new Map<string, number>()
  const goallessBySeason = new Map<string, number>()
  const unchecked: string[] = []

  // A match with nothing recorded is a goalless 0-0 only when Wikipedia says so. The league
  // tables are asked for, once, and only for the seasons that have such a match (#1622).
  const wikipedia = await askWikipedia(
    db,
    derived.filter((one) => one.noRecord === true && one.values !== null && inCrossTables(one.values)),
    crossTables,
  )

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

    let values: OldSiteMatchValues & { clubId: number; opponent: string } = { ...one.values, clubId, opponent }

    if (one.noRecord === true) {
      const checked = inCrossTables(values)
      const readable = wikipedia?.readable.has(`${values.season}|${values.competition}`) === true
      const score = checked ? wikipedia?.scores.get(crossTableKey(values)) : undefined

      if (checked && !readable) {
        // Without the table nothing is certain: a real 0-0 must not go, so the row stays.
        unchecked.push(label)
      } else if (score?.for === 0 && score.against === 0) {
        goallessBySeason.set(values.season, (goallessBySeason.get(values.season) ?? 0) + 1)
      } else {
        values = withoutResult(values)
        withoutResultBySeason.set(values.season, (withoutResultBySeason.get(values.season) ?? 0) + 1)
      }
    }

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
        // The old fansite has nothing of this match, so there is nothing to compare or fill.
        if (values.status === 'result_unknown') {
          report.unchanged += 1
          continue
        }

        const compared = compareClaim(lookup.match, values, lockedFields(edits.get(lookup.match.id)))

        // A difference waits for the editors as a change, once (#974). The match keeps the
        // value of its own source until they decide.
        // A match the editors added is theirs: it is compared and never filled.
        const fill: Partial<Match> = lookup.match.dataSource === 'redactie' ? {} : { ...compared.fill }

        // The score at half-time only fills an empty place: what the editors filled in, or
        // another source gave, wins, and a difference is not a change for the editors.
        if (
          lookup.match.dataSource !== 'redactie' &&
          lookup.match.halfTimeFor === null &&
          values.halfTimeFor !== null &&
          values.halfTimeAgainst !== null
        ) {
          if (fitsResult(values, { ...lookup.match, ...fill })) {
            fill.halfTimeAgainst = values.halfTimeAgainst
            fill.halfTimeFor = values.halfTimeFor
            fill.halfTimeSource = 'oude-fansite'
          } else {
            report.lines.push(
              `${label}: the score at half-time is higher than the result that match ${lookup.match.id} keeps, so it is left out`,
            )
          }
        }

        const kept = await keepSourceDifferences(
          db,
          lookup.match,
          values,
          { differences: compared.differences, fill },
          oldSiteSource,
          now,
        )

        report.lines.push(
          ...kept.map(
            (part) =>
              `${label}: the ${part} differs from match ${lookup.match.id} of ${lookup.match.dataSource}, kept as a change that waits for the editors`,
          ),
        )

        if (Object.keys(fill).length > 0) {
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
    const held = takenOver.get(before.id)
    const fields = [
      ...(edit?.kickoffEdited === true || held?.has('kickoff') === true ? [] : kickoffFields),
      ...(edit?.resultEdited === true || held?.has('result') === true ? [] : resultFields),
      ...(edit?.factsEdited === true || held?.has('facts') === true ? [] : factFields),
      // Who played at home goes with the result.
      ...(held?.has('result') === true ? otherFields.filter((field) => field !== 'home') : otherFields),
    ] as const
    const change: Partial<Match> = {}

    for (const field of fields) {
      if (!sameValue(before[field], values[field])) {
        Object.assign(change, { [field]: values[field] })
      }
    }

    // The score at half-time only fills an empty place: the editors may have filled it in.
    if (before.halfTimeFor === null && values.halfTimeFor !== null) {
      // The result of this row may stay as it is (the editors took it over), so it is the
      // result that stays that the score at half-time has to fit.
      if (fitsResult(values, { ...before, ...change })) {
        Object.assign(change, {
          halfTimeAgainst: values.halfTimeAgainst,
          halfTimeFor: values.halfTimeFor,
          halfTimeSource: 'oude-fansite',
        })
      } else {
        report.lines.push(`${label}: the score at half-time is higher than the result of the row, so it is left out`)
      }
    }

    // A score at half-time that the old fansite never knew is emptied again, but only when the
    // file itself was its source: what the editors filled in stays (#1617). The same goes for
    // the half-time of a match without a result (#1622), which must go with the score.
    // Spectators or a score at half-time that the editors filled in are a record: such a row is
    // not emptied.
    const keptByEditors =
      (change.attendance === undefined ? before.attendance : change.attendance) !== null ||
      (before.halfTimeFor !== null && before.halfTimeSource !== 'oude-fansite')

    if (change.status === 'result_unknown' && keptByEditors) {
      for (const field of resultFields) {
        delete change[field]
      }
      report.lines.push(`${label}: has spectators or a score at half-time from the editors, so it is not emptied`)
    }

    const halfTimeFromFile = before.halfTimeSource === 'oude-fansite' && before.halfTimeFor !== null

    if (halfTimeFromFile && (one.halfTimeUnknown === true || change.status === 'result_unknown')) {
      Object.assign(change, { halfTimeAgainst: null, halfTimeFor: null, halfTimeSource: null })
      clearedHalfTimes += 1
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
  if (clearedHalfTimes > 0) {
    report.lines.push(`${clearedHalfTimes} scores at half-time are emptied: the old fansite did not know them`)
  }
  for (const season of [...new Set([...withoutResultBySeason.keys(), ...goallessBySeason.keys()])].toSorted()) {
    report.lines.push(
      `${season}: ${withoutResultBySeason.get(season) ?? 0} matches without a result (result_unknown), ${goallessBySeason.get(season) ?? 0} goalless matches kept because Wikipedia confirms the 0-0`,
    )
  }
  if (unchecked.length > 0) {
    report.lines.push(
      `${unchecked.length} matches with nothing recorded are left as they are, because Wikipedia could not be read for them: ${unchecked.join(', ')}`,
    )
  }
  if (remarks > 0) {
    report.lines.push(`${remarks} remarks of the old editors are not copied to the note: they are working notes`)
  }

  return report
}
