// Which pages and which readers belong to the squad of a season that is over. The command that
// reads the squads of earlier seasons (`import-past-squad.ts`) asks this list, and nothing else
// knows which season has which page. A season is added or changed here after someone has read
// its page; a season that is not here has no page we read, which is a gap and no fault.
//
// The pages and the readers, by season (see `docs/onderzoek-spelers-sinds-1990.md`):
//
// - 1990/91 to 1999/00 and 2005/06: `Sc Heerenveen in het seizoen 1995/96`, the table of
//   statistics.
// - 2006/07: the same title, the transfers and the scorers.
// - 2007/08 to 2017/18: `Sc Heerenveen in het seizoen 2008/09 (mannen)`, the selection and the
//   transfers. 2010/11 to 2012/13 have no table of the selection, which that reader reports as
//   `none`, so only the transfers count.
// - 2018/19 to 2021/22 and 2024/25: the page of the English Wikipedia (`englishSquadPage`).
// - 2022/23 and 2023/24: the same Dutch title, the squad table that the current season has.
// - 2000/01 to 2004/05 and 2025/26: no page on either Wikipedia, so no reader.
// - 2026/27 and later: the same Dutch title and squad table, which the hourly import read while
//   the season was the current one (#975).
import type { SeasonSquad } from './season-squad.ts'

import { englishSquadPage, readEnglishSquad } from './read-english-squad.ts'
import { readSeasonSelection } from './read-selection.ts'
import { readSeasonSquad, squadPageTitle } from './read-squad.ts'
import { readSeasonStatistics, statisticsPageTitle } from './read-statistics.ts'
import { readSeasonScorers, readSeasonTransfers, transfersPageTitle } from './read-transfers.ts'

/** A reader of the text of a page, which gives what is in the shape of every reader. */
export type SquadReader = (text: string) => SeasonSquad

/** One page of a season and the readers that look at it. */
export type SquadSource = {
  /** Which Wikipedia the page is on. */
  origin: 'english' | 'nl'
  /**
   * The readers of the page, by name, such as `selection`. The name is what the log shows when
   * a reader fails or finds nothing.
   */
  readers: { name: string; read: SquadReader }[]
  /** The title of the page, such as `Sc Heerenveen in het seizoen 2008/09 (mannen)`. */
  title: string
}

/**
 * The seasons whose Dutch page has a table of statistics: 1990/91 to 1999/00 and 2005/06. The
 * five seasons between them have no page.
 */
const statisticsYears = new Set([1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2005])

/** The first and the last season with a selection or transfers on a Dutch page. */
const selectionYears = { first: 2007, last: 2017 }

/** The seasons whose Dutch page has the squad table that the current season has. */
const squadTableYears = new Set([2022, 2023])

/**
 * The first season the hourly import read as the current one. The page of such a season has the
 * squad table, so the season needs no line here once it is over.
 */
const firstCurrentYear = 2026

const statistics = { name: 'statistics', read: readSeasonStatistics }
const selection = { name: 'selection', read: readSeasonSelection }
const transfers = { name: 'transfers', read: readSeasonTransfers }
const scorers = { name: 'scorers', read: readSeasonScorers }
const squadTable = { name: 'squad table', read: readSeasonSquad }
const english = { name: 'English squad', read: readEnglishSquad }

/**
 * The pages to read for the squad of a season, each with its readers. An empty list is a season
 * without a page, so without a squad. The list says nothing about a season that is not over:
 * the command refuses that one before it looks here.
 */
export function squadSources(season: string): SquadSource[] {
  const year = Number(season.slice(0, 4))
  const englishTitle = englishSquadPage(season)

  if (englishTitle !== undefined) {
    return [{ origin: 'english', readers: [english], title: englishTitle }]
  }
  if (statisticsYears.has(year)) {
    return [{ origin: 'nl', readers: [statistics], title: statisticsPageTitle(season) }]
  }
  if (season === '2006/07') {
    return [{ origin: 'nl', readers: [transfers, scorers], title: transfersPageTitle(season) }]
  }
  if (year >= selectionYears.first && year <= selectionYears.last) {
    return [{ origin: 'nl', readers: [selection, transfers], title: squadPageTitle(season) }]
  }
  if (squadTableYears.has(year) || year >= firstCurrentYear) {
    return [{ origin: 'nl', readers: [squadTable], title: squadPageTitle(season) }]
  }

  return []
}
