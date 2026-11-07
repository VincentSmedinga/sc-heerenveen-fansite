import { listSeasonReports, readPlayerReportStats } from '@fansite/db/match-reports'

import { cacheForKey } from './cache'
import { type CompetitionChoice } from './competition'
import { getDatabase } from './database'
import { type ReportFigures } from './report-figures'

/** How long the figures of a season are kept: a report is saved by hand, so they can wait. */
const keptFor = 5 * 60 * 1000

async function loadFigures(key: string): Promise<ReportFigures> {
  const [season = '', choice = 'all'] = key.split('|')
  const league = choice === 'league'
  const { db } = getDatabase()
  const [reports, players] = await Promise.all([
    listSeasonReports(db, season),
    readPlayerReportStats(db, season, league ? 'Eredivisie' : undefined),
  ])
  const played = reports.filter((report) => report.status === 'played')
  const counted = league ? played.filter((report) => report.competition === 'Eredivisie') : played

  return {
    known: counted.filter((report) => report.reportStatus === 'klaar').length,
    played: counted.length,
    players,
    seasonHasReports: played.some((report) => report.reportStatus === 'klaar'),
  }
}

const seasonFigures = cacheForKey(keptFor, loadFigures)

/**
 * The figures of the players of a season from the match reports that are `klaar`, for the
 * competitions of the choice, and how many of the played matches they rest on. The page asks
 * only for a season it has found, so the cache holds a few keys.
 */
export function getSeasonReportFigures(season: string, competition: CompetitionChoice): Promise<ReportFigures> {
  return seasonFigures(`${season}|${competition}`)
}

/**
 * Whether the season has a match report that is `klaar`, so the page Spelers has the cards
 * with the figures of the reports and its bar the links to them. A season whose reports can't
 * be read has none: the page logs the error, and the bar stays as it was without the cards.
 */
export async function seasonHasReports(season: string): Promise<boolean> {
  try {
    return (await getSeasonReportFigures(season, 'all')).seasonHasReports
  } catch {
    return false
  }
}
