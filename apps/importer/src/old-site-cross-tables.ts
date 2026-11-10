// The chapter of the check report that lays the league matches of the old fansite next to the
// cross tables of Wikipedia (#976). For each season of a league in the files it asks the Dutch
// Wikipedia for the page of that season, reads the table (`read-cross-table.ts`) and compares
// the scores of sc Heerenveen with the matches in the database. It writes nothing: the editors
// put a difference right in the admin. A cross table has no dates, so only the scores and who
// was at home are compared.
import type { Competition, Match } from '@fansite/db/schema'

import { findMatchesByClub } from '@fansite/db/match-lookup'

import type { Fetcher } from './fetcher.ts'
import type { OldSiteData } from './old-site-file.ts'
import type { OldSiteDatabase } from './old-site-step.ts'
import type { CrossTableProblem } from './read-cross-table.ts'

import { wikipediaOrigin } from './import-matches.ts'
import { pauseBetweenRequests } from './import-person-data.ts'
import { dutchDate } from './old-site-check.ts'
import { clubFinder } from './old-site-clubs.ts'
import { deriveOldSiteMatches } from './old-site-matches.ts'
import { readCrossTable } from './read-cross-table.ts'
import { linkedPage, pageUrl } from './read-wikipedia.ts'
import { printable } from './text.ts'

/** The leagues that have a cross table: the two sc Heerenveen played in from 1990 to 2007. */
const leagues: readonly Competition[] = ['Eredivisie', 'Eerste divisie']

/** The first and the last season the report compares: the seasons of the old fansite. */
export const crossTableSeasons = { first: '1990/91', last: '2006/07' }

/** A season of a league that the files have matches of, with the title of its page. */
export type CrossTableSeason = { competition: Competition; season: string; title: string }

/** The page of a season as Wikipedia gave it, or why there is none, in Dutch for the report. */
export type FetchedCrossTable = CrossTableSeason & ({ kind: 'none'; reason: string } | { kind: 'page'; text: string })

/** What the report says about one season: the lines, or why the table could not be read. */
export type OldSiteCrossTable = CrossTableSeason & {
  /** How many scores of sc Heerenveen the table has. */
  compared: number
  /** One line for each match that differs or is missing, in Dutch. */
  lines: string[]
  /** Why the table could not be read, in Dutch, or null when it was read. */
  unreadable: null | string
  /** The address of the page for a reader, on the Dutch Wikipedia. */
  url: string
}

/** The name Wikipedia knows us by in a cross table, in lower case. */
const ourPage = 'sc heerenveen'

/** The most pages a redirect is followed over before the report gives up on a season. */
const maxRedirects = 2

const redirectStart = /^#(?:redirect|doorverwijzing)\b/iu

const problems: Readonly<Record<CrossTableProblem, string>> = {
  'no-clubs': 'de tabel onder het kopje Uitslagen heeft geen kolom voor elke club',
  'no-heading': 'de pagina heeft geen kopje Uitslagen',
  'no-table': 'onder het kopje Uitslagen staat geen tabel',
}

/**
 * Compares the scores of sc Heerenveen in each table with the matches in the database, of any
 * source. A match is found on the season, the competition and the club (`findMatchesByClub`),
 * and on who was at home. The club is found by the article its row links to, by the name the
 * row shows, or by a name another of the tables shows for that article. It only reads. The
 * lines of a season are sorted on the opponent, the home match first.
 */
export async function compareCrossTables(
  db: Pick<OldSiteDatabase, 'select'>,
  tables: readonly FetchedCrossTable[],
): Promise<OldSiteCrossTable[]> {
  if (tables.length === 0) {
    return []
  }

  const findClub = await clubFinder(db)
  const compared: OldSiteCrossTable[] = []
  const reads = tables.map((table) => ({
    read: table.kind === 'page' ? readCrossTable(table.text) : table,
    table,
  }))
  // An article is one club, so every name a table shows for it is a name to find the club by:
  // `RBC (voetbalclub)` is `RBC` in one season and `RBC Roosendaal` in another.
  const shownNames = new Map<string, Set<string>>()

  for (const { read } of reads) {
    for (const result of read.kind === 'read' ? read.results : []) {
      shownNames.set(result.homePage, (shownNames.get(result.homePage) ?? new Set()).add(result.homeClub))
    }
  }

  for (const { read, table } of reads) {
    const { competition, season, title } = table
    const one: OldSiteCrossTable = {
      compared: 0,
      competition,
      lines: [],
      season,
      title,
      unreadable: null,
      url: `${wikipediaOrigin}/wiki/${encodeURI(title.replaceAll(' ', '_'))}`,
    }

    compared.push(one)
    if (read.kind === 'none') {
      one.unreadable = read.reason
      continue
    }
    if (read.kind === 'error') {
      one.unreadable =
        read.problem === 'row-count'
          ? `de tabel heeft ${read.rows} rijen voor ${read.columns} kolommen`
          : read.problem === 'row'
            ? `de rij van ${inline(read.row)} past niet bij de kolommen van de tabel`
            : problems[read.problem]
      continue
    }

    const isOurs = (cell: { awayPage: string; homePage: string }) =>
      [cell.homePage, cell.awayPage].some((name) => name.toLowerCase() === ourPage)
    const ours = read.results.filter(isOurs)
    const lines: { day?: string; home: boolean; opponent: string; text: string }[] = []

    if (ours.length === 0) {
      one.unreadable = 'sc Heerenveen staat niet in de tabel'
      continue
    }

    one.compared = ours.length

    for (const cell of read.unread.filter(isOurs)) {
      const home = cell.homePage.toLowerCase() === ourPage

      lines.push({
        home,
        opponent: inline(home ? cell.awayClub : cell.homeClub),
        text: `de uitslag in de kruistabel is niet te lezen (\`${inline(cell.text)}\`)`,
      })
    }

    for (const result of ours) {
      const home = result.homePage.toLowerCase() === ourPage
      const [page, shown] = home ? [result.awayPage, result.awayClub] : [result.homePage, result.homeClub]
      const club = findClub([page, shown, ...(shownNames.get(page) ?? [])])
      const theirs = `${result.homeGoals}-${result.awayGoals}`

      if (club === undefined) {
        lines.push({
          home,
          opponent: inline(shown),
          text: `geen club met die naam in de database, de kruistabel heeft ${theirs}`,
        })
        continue
      }

      const stored = (await findMatchesByClub(db, { clubId: club.id, competition, season })).filter(
        (match) => match.home === home,
      )
      const withScore = stored.filter((match) => scoreOf(match) !== null)
      const [match] = withScore.length > 0 ? withScore : stored
      const days = (rows: Match[]) => rows.map((row) => dutchDate(row.matchDate)).join(' en ')

      if (match === undefined) {
        lines.push({ home, opponent: club.name, text: `staat in de kruistabel (${theirs}) en niet in de database` })
      } else if (withScore.length > 1) {
        lines.push({
          home,
          opponent: club.name,
          text: `de database heeft ${withScore.length} wedstrijden met een uitslag (${days(withScore)}), de kruistabel heeft er één (${theirs})`,
        })
      } else if (scoreOf(match) === null) {
        lines.push({
          day: days([match]),
          home,
          opponent: club.name,
          text: `de database heeft geen uitslag, de kruistabel heeft ${theirs}`,
        })
      } else if (scoreOf(match) !== theirs) {
        lines.push({
          day: days([match]),
          home,
          opponent: club.name,
          text: `de database heeft ${scoreOf(match)}, de kruistabel heeft ${theirs}`,
        })
      }
    }

    one.lines = lines
      .toSorted((a, b) => a.opponent.localeCompare(b.opponent, 'nl') || Number(b.home) - Number(a.home))
      .map(
        ({ day, home, opponent, text }) =>
          `${home ? 'Thuis tegen' : 'Uit tegen'} ${opponent}${day === undefined ? '' : `, ${day}`}: ${text}`,
      )
  }

  return compared
}

/**
 * The seasons to ask Wikipedia about: each season from 1990/91 to 2006/07 of a league the files
 * have a usable match of, the oldest first. Files without such a match ask for nothing.
 */
export function crossTableSeasonsOf(data: Pick<OldSiteData, 'matches'>): CrossTableSeason[] {
  const found = new Map<string, CrossTableSeason>()

  for (const { values } of deriveOldSiteMatches(data.matches)) {
    if (
      values !== null &&
      leagues.includes(values.competition) &&
      values.season >= crossTableSeasons.first &&
      values.season <= crossTableSeasons.last
    ) {
      found.set(`${values.season} ${values.competition}`, {
        competition: values.competition,
        season: values.season,
        title: `${values.competition} ${values.season}`,
      })
    }
  }

  return [...found.values()].toSorted(
    (a, b) => a.season.localeCompare(b.season) || a.competition.localeCompare(b.competition),
  )
}

/**
 * Asks for the pages one after the other, with a pause between two requests. A page that is a
 * redirect is followed to the page it points to. A page that is not there or that fails is a
 * season without a table, with the reason. After a refusal by robots.txt or a request to wait
 * it asks nothing more, and the seasons that are left get that reason too. It never throws.
 */
export async function fetchCrossTables(
  fetcher: Fetcher,
  origin: string,
  seasons: readonly CrossTableSeason[],
  pause = pauseBetweenRequests,
): Promise<FetchedCrossTable[]> {
  const fetched: FetchedCrossTable[] = []
  let stopped: null | string = null
  let asked = 0

  const page = async (first: string): Promise<{ reason: string } | { text: string }> => {
    let title = first

    for (let step = 0; step <= maxRedirects; step++) {
      if (stopped !== null) {
        return { reason: stopped }
      }
      if (asked > 0 && pause > 0) {
        await new Promise((resolve) => setTimeout(resolve, pause))
      }

      asked++

      const outcome = await fetcher.fetch(pageUrl(origin, title))

      switch (outcome.kind) {
        case 'blocked-by-robots':
          stopped = 'robots.txt van Wikipedia staat de pagina niet toe'
          return { reason: stopped }
        case 'error':
          return outcome.reason === 'http-status' && outcome.status === 404
            ? { reason: `de pagina ${inline(title)} bestaat niet` }
            : { reason: `de pagina ${inline(title)} was niet op te halen (${failureOf(outcome)})` }
        case 'fetched': {
          const text = new TextDecoder('utf-8').decode(outcome.body)
          const marker = redirectStart.exec(text.trimStart())

          if (marker === null) {
            return { text }
          }

          const target = linkedPage(text.trimStart().slice(marker[0].length))

          if (target === null) {
            return { reason: `de pagina ${inline(title)} verwijst door zonder titel` }
          }

          title = target
          break
        }
        case 'not-modified':
          return { reason: `de pagina ${inline(title)} gaf geen tekst terug` }
        case 'wait':
          stopped = 'Wikipedia vroeg om te wachten'
          return { reason: stopped }
      }
    }

    return { reason: `de pagina ${inline(first)} verwijst te vaak door` }
  }

  for (const season of seasons) {
    const result = await page(season.title)

    fetched.push(
      'text' in result ? { ...season, kind: 'page', text: result.text } : { ...season, ...result, kind: 'none' },
    )
  }

  return fetched
}

/**
 * What went wrong with a request, for the Dutch report: the status of the answer, or the code
 * of the fetcher for the fault. The message of the fetcher is English and stays in the log.
 */
function failureOf(outcome: { reason: string; status?: number }): string {
  return outcome.status === undefined ? `fout \`${outcome.reason}\`` : `HTTP ${outcome.status}`
}

/**
 * A text of a page as one piece of a line of the report, which is Markdown: without the signs
 * that would make it a link, an image, code, emphasis, a table or HTML.
 */
function inline(text: string): string {
  return printable(text)
    .replace(/[[\]<>`*_|\\]/gu, '')
    .trim()
}

/** The score of a stored match with the home club first, as a cross table has it, or null. */
function scoreOf(match: Match): null | string {
  if (match.goalsFor === null || match.goalsAgainst === null) {
    return null
  }

  return match.home ? `${match.goalsFor}-${match.goalsAgainst}` : `${match.goalsAgainst}-${match.goalsFor}`
}
