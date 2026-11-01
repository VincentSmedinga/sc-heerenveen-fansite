import {
  findClubBySlug,
  listAllWikipediaPages,
  listClubMatches,
  listClubRecords,
  type PublicClubMatch,
  type PublicClubRecord,
  type PublicSeasonWikipediaPage,
} from '@fansite/db/queries'

import { cacheFor, cacheForKey } from './cache'
import { type SourceVersion } from './card-sources'
import { type CompetitionChoice } from './competition'
import { getDatabase } from './database'

/**
 * The opponents of sc Heerenveen under Statistieken: the list of the clubs and the page of each
 * club with the record against it, for the matches of every season we have. The data is the
 * clubs of `packages/db` (one club is one article of the Dutch Wikipedia, with a fixed slug in
 * the address). This module has the tallies, which need no database, and the cached readings.
 */

/**
 * The record against one club: all the played matches, those at home and those away, and the
 * biggest win and the biggest loss, which are undefined when there is none (a record of draws
 * has neither).
 */
export type ClubSummary = {
  away: Tally
  biggestLoss: Meeting | undefined
  biggestWin: Meeting | undefined
  home: Tally
  total: Tally
}

/** A match that was played and has a score, so one that counts in a record. */
export type Meeting = PublicClubMatch & { goalsAgainst: number; goalsFor: number }

/** The results of the played matches against a club, or one side of them. */
export type Tally = {
  drawn: number
  goalsAgainst: number
  goalsFor: number
  lost: number
  played: number
  won: number
}

/** The address of the page Tegenstanders; the page of a club is this and `/<slug>`. */
export const opponentsPath = '/statistieken/tegenstanders'

/** How long the readings are kept: a new result shows within five minutes of the import. */
const period = 5 * 60 * 1000

const emptyTally = (): Tally => ({ drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, played: 0, won: 0 })

/**
 * The matches that count in a record, for the choice: those of the Eredivisie alone for
 * `league`, and those of the KNVB Beker as well for `all`. Only a match that was played and has
 * a score counts, and the score is the one after extra time, so a cup tie that a shoot-out
 * decided after a level score is a draw. The order stays as given.
 */
export function meetingsOf(matches: readonly PublicClubMatch[], choice: CompetitionChoice): Meeting[] {
  return matches.filter(
    (match): match is Meeting =>
      (choice === 'all' || match.competition === 'Eredivisie') &&
      match.status === 'played' &&
      match.goalsFor !== null &&
      match.goalsAgainst !== null,
  )
}

/** What a list of meetings comes to: how many were won, drawn and lost, and the goals. */
export function tallyOf(meetings: readonly Meeting[]): Tally {
  const tally = emptyTally()

  for (const { goalsAgainst, goalsFor } of meetings) {
    tally.played += 1
    tally.goalsFor += goalsFor
    tally.goalsAgainst += goalsAgainst

    if (goalsFor > goalsAgainst) {
      tally.won += 1
    } else if (goalsFor === goalsAgainst) {
      tally.drawn += 1
    } else {
      tally.lost += 1
    }
  }

  return tally
}

const difference = (meeting: Meeting) => meeting.goalsFor - meeting.goalsAgainst

/**
 * The record of the meetings, newest first: the total, at home and away, and the biggest win
 * and the biggest loss, by the difference in goals. When two are level, the later one wins, as
 * on the card Uitersten. A win needs a difference in our favour and a loss one against us.
 */
export function summaryOf(meetings: readonly Meeting[]): ClubSummary {
  const biggest = (score: (meeting: Meeting) => number) =>
    meetings.reduce<Meeting | undefined>(
      (top, meeting) => (top === undefined || score(meeting) > score(top) ? meeting : top),
      undefined,
    )
  const win = biggest(difference)
  const loss = biggest((meeting) => -difference(meeting))

  return {
    away: tallyOf(meetings.filter((meeting) => !meeting.home)),
    biggestLoss: loss !== undefined && difference(loss) < 0 ? loss : undefined,
    biggestWin: win !== undefined && difference(win) > 0 ? win : undefined,
    home: tallyOf(meetings.filter((meeting) => meeting.home)),
    total: tallyOf(meetings),
  }
}

/**
 * The other names Wikipedia gives a club, for "Eerder: …" under its name, or undefined when it
 * has none. The query gives them A to Z.
 */
export const earlierNames = (otherNames: readonly string[]) =>
  otherNames.length === 0 ? undefined : otherNames.join(', ')

/** The seasons of the meetings, the newest first, each once. */
export const seasonsOf = (matches: readonly PublicClubMatch[]) =>
  [...new Set(matches.map((match) => match.season))].sort().reverse()

/**
 * The sources a card of the opponents rests on, with the moment each last changed: the pages of
 * Wikipedia of the seasons in `seasons`, the seasons whose matches the card counts. The line
 * "Laatst gewijzigd" under the card takes the newest of them.
 */
export const sourcesOf = (
  pages: readonly Pick<PublicSeasonWikipediaPage, 'kind' | 'season' | 'version'>[],
  seasons: readonly string[],
): SourceVersion[] =>
  pages.filter((page) => seasons.includes(page.season)).map(({ kind, version }) => ({ kind, version }))

const clubRecords = cacheForKey(period, (choice) =>
  listClubRecords(getDatabase().db, choice === 'league' ? { competition: 'Eredivisie' } : {}),
)

/** The club and every match against it, whatever the competition. */
export type ClubPage = {
  club: NonNullable<Awaited<ReturnType<typeof findClubBySlug>>>
  matches: PublicClubMatch[]
}

/**
 * Every club with the record against it, A to Z, for the matches the choice counts. A club
 * without a match of that choice, such as one we only met in the cup with the choice `league`,
 * is not in it. The two choices are the only keys, so the cache never grows.
 */
export function getClubRecords(choice: CompetitionChoice): Promise<PublicClubRecord[]> {
  return clubRecords(choice)
}

const clubPages = cacheForKey(period, async (slug): Promise<ClubPage | undefined> => {
  const { db } = getDatabase()
  const club = await findClubBySlug(db, slug)

  return club === undefined ? undefined : { club, matches: await listClubMatches(db, club.id) }
})

/**
 * The club with that address part and its matches, or undefined for a slug that no club has.
 * The slug is checked against the clubs that have a match before it is used as a key, because
 * a visitor can make up any address and the cache keeps an entry for every key it is asked for.
 */
export async function getClubPage(slug: string): Promise<ClubPage | undefined> {
  const known = await getClubRecords('all')

  return known.some((record) => record.slug === slug) ? clubPages(slug) : undefined
}

/** Whether a club has that slug, for the sitemap and the visit counter. */
export async function isClubSlug(slug: string) {
  return (await getClubRecords('all')).some((record) => record.slug === slug)
}

const sourcePages = cacheFor(period, () => listAllWikipediaPages(getDatabase().db))

/** The Wikipedia pages of every season, for the credit of a page that counts across seasons. */
export function getSourcePages(): Promise<PublicSeasonWikipediaPage[]> {
  return sourcePages()
}
