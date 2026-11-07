import { listReportedMatches, matchForRules, type ReportedMatch, reportForRules } from '@fansite/db/match-reports'
import { seasonOf } from '@fansite/db/season'
import { checkMatchReport } from '@fansite/shared/match-report'

import { cacheForKey } from './cache'
import { getDatabase } from './database'
import { getMatchSeasons } from './matches'
import { seasonSlug } from './seasons'

// The page of a match exists for a match with a report that is `klaar` and that the rules of
// `@fansite/shared/match-report` find no error in. A report that is `bezig`, one that no longer
// follows the rules and a match without a report have no page (see _De pagina staat op …_ in
// docs/beslissingen/site.md).

/** The base address of the matches page, which the address of a match builds on. */
const matchesPath = '/wedstrijden'

/** The address of the page of a match: the season, the day and the slug of the opponent. */
export const reportAddress = (season: string, matchDate: string, clubSlug: string) =>
  `${matchesPath}/${seasonSlug(season)}/${matchDate}-${clubSlug}`

/** Whether the rules find no error in the report of a match. */
export function isPublicReport(reported: ReportedMatch) {
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
  return (await listReportedMatches(getDatabase().db, season)).filter((reported) => isPublicReport(reported))
}

const currentReports = cacheForKey(currentSeasonPeriod, loadSeasonReports)
const pastReports = cacheForKey(pastSeasonPeriod, loadSeasonReports)

/** The addresses of all the pages of matches, for the sitemap. */
export async function getAllReportAddresses() {
  const addresses: string[] = []

  for (const season of await getMatchSeasons()) {
    for (const reported of await getPublicReports(season)) {
      addresses.push(reportAddress(season, reported.match.matchDate, reported.clubSlug))
    }
  }

  return addresses
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
 * The matches of a season that have a page, the first first. The caller asks for a season of
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
