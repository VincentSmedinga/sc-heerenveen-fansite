import {
  listReportedMatches,
  matchForRules,
  phaseOf,
  type ReportedMatch,
  reportForRules,
} from '@fansite/db/match-reports'
import { seasonOf } from '@fansite/db/season'
import { checkMatchReport } from '@fansite/shared/match-report'

import { cacheForKey } from './cache'
import { getDatabase } from './database'
import { getMatchSeasons } from './matches'
import { seasonSlug } from './seasons'

// The page of a match exists for every played match with a report, whatever its status. A
// report that is `klaar` and that the rules of `@fansite/shared/match-report` find no error in
// is complete; any other report (`bezig`, or one that no longer follows the rules) has a page
// with a notice that it is still being filled in, which search engines do not index and the
// sitemap does not list. A match without a report has no page (see _De pagina bestaat ook voor
// een verslag dat nog niet klaar is_ in docs/beslissingen/site.md). A match that is still being
// played (`scheduled`) has a page too once it has a report, and it is "Live" from its kick-off
// (see `phaseOf`).

/** The base address of the matches page, which the address of a match builds on. */
const matchesPath = '/wedstrijden'

/** The address of the page of a match: the season, the day and the slug of the opponent. */
export const reportAddress = (season: string, matchDate: string, clubSlug: string) =>
  `${matchesPath}/${seasonSlug(season)}/${matchDate}-${clubSlug}`

/** Whether the report of a match is `klaar` and the rules find no error in it. */
export function isCompleteReport(reported: ReportedMatch) {
  return (
    reported.stored.report.status === 'klaar' &&
    checkMatchReport(reportForRules(reported.stored), matchForRules(reported.match)).errors.length === 0
  )
}

/**
 * The day and the slug of the opponent in the last part of the address, or undefined for a part
 * that is not one: `2026-11-01-fc-twente` is the day 1 November 2026 and the club `fc-twente`.
 */
export function parseReportSlug(slug: string): undefined | { clubSlug: string; matchDate: string } {
  const found = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(slug)
  const matchDate = found?.[1]
  const clubSlug = found?.[2]

  if (matchDate === undefined || clubSlug === undefined) {
    return undefined
  }

  const day = new Date(`${matchDate}T00:00:00Z`)

  return Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== matchDate
    ? undefined
    : { clubSlug, matchDate }
}

/** How long the reports of the current season are kept: a change shows within five minutes. */
const currentSeasonPeriod = 5 * 60 * 1000

/** A season that is over doesn't change, so it is kept for an hour. */
const pastSeasonPeriod = 60 * 60 * 1000

async function loadSeasonReports(season: string) {
  return listReportedMatches(getDatabase().db, season)
}

const currentReports = cacheForKey(currentSeasonPeriod, loadSeasonReports)
const pastReports = cacheForKey(pastSeasonPeriod, loadSeasonReports)

/**
 * The addresses of the pages of matches for the sitemap: those with a complete report. A page
 * that is not complete is not indexed, so it is not listed.
 */
export async function getAllReportAddresses() {
  const addresses: string[] = []

  for (const season of await getMatchSeasons()) {
    for (const reported of await getPublicReports(season)) {
      if (isCompleteReport(reported)) {
        addresses.push(reportAddress(season, reported.match.matchDate, reported.clubSlug))
      }
    }
  }

  return addresses
}

/**
 * The matches of a season that are live at `now`, by `<competition>|<round>` as
 * `getReportAddresses` has them: still `scheduled`, with a report, and past their kick-off. The
 * lines of a list of matches say "Live" for them.
 */
export async function getLiveReports(season: string, now = new Date()): Promise<ReadonlySet<string>> {
  return new Set(
    (await getPublicReports(season))
      .filter((reported) => phaseOf(reported.match, now) === 'live')
      .map((reported) => `${reported.match.competition}|${reported.match.round}`),
  )
}

/**
 * The match of the address `/wedstrijden/<seizoen>/<datum>-<club>` when it has a page, or
 * undefined. Only a season that has matches is asked for, and the day and the club must be
 * written the way the address has them.
 */
export async function getPublicReport(season: string, slug: string) {
  const address = parseReportSlug(slug)

  if (address === undefined || !(await getMatchSeasons()).includes(season)) {
    return undefined
  }

  return (await getPublicReports(season)).find(
    (reported) => reported.match.matchDate === address.matchDate && reported.clubSlug === address.clubSlug,
  )
}

/**
 * The matches of a season that have a page (a match with a report that was played or is being
 * played, complete or not), the first first. The caller asks for a season of
 * `getMatchSeasons` only: the cache keeps an entry for every season it is asked for.
 */
export function getPublicReports(season: string) {
  return season === seasonOf(new Date()) ? currentReports(season) : pastReports(season)
}

/**
 * The addresses of the pages of the matches of a season, by `<competition>|<round>`, the key
 * that is one match in a season. The lines of a list of matches use it to link to a page that
 * exists.
 */
export async function getReportAddresses(season: string) {
  return new Map(
    (await getPublicReports(season)).map((reported): [string, string] => [
      `${reported.match.competition}|${reported.match.round}`,
      reportAddress(season, reported.match.matchDate, reported.clubSlug),
    ]),
  )
}
