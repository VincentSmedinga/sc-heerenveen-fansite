import type { FormResult, PageShortcutsItem } from '@fansite/design-system'

import { listClubNamePeriods, type NamePeriodLine } from '@fansite/db/club-name-periods'
import { listClubStadiums, type StadiumLine } from '@fansite/db/club-stadiums'
import { normaliseClubName } from '@fansite/db/clubs'
import {
  findClubBySlug,
  listAllWikipediaPages,
  listClubMatches,
  listClubRecords,
  listStandingsPlaces,
  type PublicClubMatch,
  type PublicClubRecord,
  type PublicSeasonWikipediaPage,
} from '@fansite/db/queries'
import { seasonOf } from '@fansite/db/season'

import { cacheFor, cacheForKey } from './cache'
import { type CompetitionChoice } from './competition'
import { getDatabase } from './database'
import { ownListPeriods, stadiumPeriods } from './match-format'
import { type FinalPlace, getFinalPlaces, programmeOf } from './matches'

/**
 * The opponents of sc Heerenveen under Wedstrijden: the list of the clubs and the page of each
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
export const opponentsPath = '/tegenstanders'

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

/** How many played matches the card Wedstrijden of a club shows on a page. */
export const meetingsPerPage = 10

/** How many pages the played matches take: at least one, so a club with none has a page. */
export const meetingPageCount = (meetings: readonly unknown[]) =>
  Math.max(1, Math.ceil(meetings.length / meetingsPerPage))

/** The played matches of one page (counting from 1), in the order given: the newest first. */
export const meetingsOnPage = <T>(meetings: readonly T[], page: number) =>
  meetings.slice((page - 1) * meetingsPerPage, page * meetingsPerPage)

/** The id of the heading of the card "De plek van <club> en de onze". */
export const clubPlacesId = 'plek-in-de-competitie'

/**
 * The links in the bar "Op deze pagina:" of the page of a club: one to each card the page has,
 * in the order of a narrow screen, which is the screen the bar is for. The ids are those of
 * the headings in `OpponentViews.tsx` (a test checks it). The card Wedstrijden is there with a
 * match to show; the cards of the sidebar follow the page (see `ClubPage`): the figures need a
 * played match, the timeline needs `hasTimeline`, Doelpuntenmakers needs `hasClubScorers`, and
 * Stadion needs a stadium. `since` is the first season we have, as on the card.
 */
export function clubShortcutsOf({
  hasPlaces = false,
  hasStadium,
  matches,
  played,
  since,
  upcoming,
}: {
  hasPlaces?: boolean
  hasStadium: boolean
  matches: readonly PublicClubMatch[]
  played: number
  since: string
  upcoming: number
}): PageShortcutsItem[] {
  const firstYear = startYearOf(since)

  return [
    ...(played + upcoming > 0 ? [{ href: '#wedstrijden', label: 'Wedstrijden' }] : []),
    ...(played > 0
      ? [
          { href: '#onze-uitslagen', label: 'Onze uitslagen' },
          ...(hasTimeline(matches) && Number.isFinite(firstYear)
            ? [{ href: '#resultaten-sinds', label: `Resultaten sinds ${firstYear}` }]
            : []),
          { href: '#hoe-vaak-welke-uitslag', label: 'Hoe vaak welke uitslag' },
          ...(hasPlaces ? [{ href: `#${clubPlacesId}`, label: 'Plek in de competitie' }] : []),
          ...(hasClubScorers(matches) ? [{ href: '#doelpuntenmakers', label: 'Doelpuntenmakers' }] : []),
        ]
      : []),
    ...(hasStadium ? [{ href: '#stadion', label: 'Stadion' }] : []),
  ]
}

/**
 * How many played matches with a result we need against a club before its page has the card
 * Doelpuntenmakers: with fewer the list says little, and a card with one name is mostly empty.
 */
export const clubScorersMinimum = 5

/**
 * Whether the page of a club has the card Doelpuntenmakers: we played it at least
 * `clubScorersMinimum` times, in all competitions together. It doesn't depend on the choice,
 * so the card doesn't vanish when the visitor switches to the Eredivisie; the list in it does
 * follow the choice.
 */
export const hasClubScorers = (matches: readonly PublicClubMatch[]) =>
  meetingsOf(matches, 'all').length >= clubScorersMinimum

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

/**
 * The matches against a club that are still to come, for the choice: those of the Eredivisie
 * alone for `league`, all of them for `all`. What is to come is what Programma has (see
 * `programmeOf`), the postponed matches included, and the order is the one of Programma too:
 * by the day and the kick-off, the next one first. The matches are given newest first, as the
 * query has them, so they are turned round.
 */
export function upcomingOf(matches: readonly PublicClubMatch[], choice: CompetitionChoice, now: Date) {
  return programmeOf(
    matches.filter((match) => choice === 'all' || match.competition === 'Eredivisie').toReversed(),
    now,
  )
}

/** The result of a meeting from the side of sc Heerenveen: `W`, `G` or `V` by the score. */
const resultOf = ({ goalsAgainst, goalsFor }: Meeting): FormResult =>
  goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'G' : 'V'

/** How many of the latest meetings the row Laatste wedstrijden shows, and needs. */
const lastCount = 5

/**
 * The results of the latest five meetings from the side of sc Heerenveen, as `W`, `G` and `V`
 * by the score `tallyOf` counts, the oldest first and the newest last, as a `MarkRow` has
 * them. The meetings are given newest first. With fewer than five there is no row: it is
 * undefined, because a row that is half empty reads as a gap.
 */
export function lastResultsOf(meetings: readonly Meeting[]): FormResult[] | undefined {
  if (meetings.length < lastCount) {
    return undefined
  }

  return meetings.slice(0, lastCount).map(resultOf).reverse()
}

/** The places of a season on the axis of the card Resultaten sinds: two matches. */
export const timelinePerYear = 2

/** The most matches the line of that card averages over: four seasons of two matches. */
export const timelineWindow = 8

/**
 * How many played matches in the Eredivisie we need against a club before its page has the card
 * Resultaten sinds. It is fewer than the window of the line: a card with fewer matches has bars
 * and no line.
 */
export const timelineMinimum = 4

/** The year a season starts in, `2025/26` being 2025. */
export const startYearOf = (season: string) => Number(season.slice(0, 4))

/**
 * The place of every played match of the Eredivisie against a club on the axis of the card
 * Resultaten sinds, for the choice `league` whatever the visitor chose. The axis starts with
 * the season that starts in `firstYear`: the first season we have matches of, for any club.
 * There are two places for each season up to and including the season of `now` (a season
 * starts on 1 July): the first match of the season on the day, then the second.
 * A place is a result from the side of sc Heerenveen, or `null` when the match was not played,
 * there was none (the club, or we, played in another division) or it is a third match, which
 * the chart cannot show.
 * A match from before that season has no place.
 * The matches may be in any order.
 */
export function timelineOf(matches: readonly PublicClubMatch[], now: Date, firstYear: number): (FormResult | null)[] {
  const lastYear = startYearOf(seasonOf(now))
  const places: (FormResult | null)[] = Array.from(
    { length: Math.max(0, lastYear - firstYear + 1) * timelinePerYear },
    () => null,
  )
  const bySeason = new Map<number, Meeting[]>()

  for (const meeting of meetingsOf(matches, 'league')) {
    const year = startYearOf(meeting.season)

    if (year >= firstYear && year <= lastYear) {
      bySeason.set(year, [...(bySeason.get(year) ?? []), meeting])
    }
  }

  for (const [year, meetings] of bySeason) {
    meetings
      .toSorted((a, b) => a.matchDate.localeCompare(b.matchDate) || a.id - b.id)
      .slice(0, timelinePerYear)
      .forEach((meeting, index) => {
        places[(year - firstYear) * timelinePerYear + index] = resultOf(meeting)
      })
  }

  return places
}

/**
 * Whether the page of a club has the card Resultaten sinds: we played it at least
 * `timelineMinimum` times in the Eredivisie. It doesn't depend on the choice of the page.
 */
export const hasTimeline = (matches: readonly PublicClubMatch[]) =>
  meetingsOf(matches, 'league').length >= timelineMinimum

const difference = (meeting: Meeting) => meeting.goalsFor - meeting.goalsAgainst

/**
 * A name of the own list of names of a club, with when it held and the note the editors wrote
 * with it (see `ownListPeriods`).
 */
export type ClubNameView = { name: string; note?: string | undefined; period?: string | undefined }

/**
 * The names of the own list of a club with their periods and notes, in the order of the list.
 * A club without a list, or with one name, has none: one name says nothing about a change.
 */
export function clubNameViewsOf(own: readonly NamePeriodLine[]): ClubNameView[] {
  if (own.length < 2) {
    return []
  }

  const periods = ownListPeriods(own)

  return own.map((line, index) => ({ name: line.name, note: line.note ?? undefined, period: periods[index] }))
}

/**
 * The text for "Eerder: …" under the name of a club: the names of its own list before the name
 * it has now, each with its period, such as "FC Zwolle t/m 2011/12". The last name of the list
 * is the name of now when it is the name in the heading (`heading`, whatever the capitals,
 * accents and punctuation); when it is another name, the heading comes from the import and
 * every name of the list is earlier. A club without a list, or with one name, has no line.
 */
export function earlierNames(own: readonly NamePeriodLine[], heading: string): string | undefined {
  const views = clubNameViewsOf(own)
  const last = views.at(-1)
  const earlier = last !== undefined && sameName(last.name, heading) ? views.slice(0, -1) : views

  return earlier.length === 0
    ? undefined
    : earlier.map((view) => (view.period === undefined ? view.name : `${view.name} ${view.period}`)).join(', ')
}

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

/** Whether two spellings are one name for the importer: capitals and dots do not count. */
const sameName = (a: string, b: string) => normaliseClubName(a) === normaliseClubName(b)

/**
 * A name of the stadium of a club, as Wikipedia wrote it, with the first and the last season
 * (such as "2019/20") of the league matches in which we saw that name. A season is all we know:
 * we visit a club once a season, so the matches say nothing about the day the name changed.
 */
export type Stadium = { firstSeason: string; lastSeason: string; name: string }

/**
 * A line of the card with the stadium of a club: the name, a note that the editors wrote with
 * it, and what it says about the time (see `stadiumPeriods` and `ownListPeriods`).
 */
export type StadiumView = { name: string; note?: string | undefined; period?: string | undefined }

/**
 * The lines of the card with the stadium of a club. A club whose editors made a list of its own
 * shows that list, with their notes, and nothing of the matches; a club without a list shows
 * the names of the matches (`stadiumsOf`).
 */
export function stadiumViewsOf(own: readonly StadiumLine[], matches: readonly PublicClubMatch[]): StadiumView[] {
  if (own.length > 0) {
    const periods = ownListPeriods(own)

    return own.map((line, index) => ({ name: line.name, note: line.note ?? undefined, period: periods[index] }))
  }

  const stadiums = stadiumsOf(matches)
  const periods = stadiumPeriods(stadiums)

  return stadiums.map((stadium, index) => ({ name: stadium.name, period: periods[index] }))
}

/**
 * The key by which two spellings of a stadium count as one name: capitals, the amount of
 * spaces and a hyphen or dash instead of a space make no difference. Nothing else does, so
 * "Stadion Galgenwaard" and "Galgenwaard" stay two names.
 */
const stadiumKey = (name: string) =>
  name
    .normalize('NFC')
    .toLowerCase()
    .replaceAll(/[\s‐-―-]+/g, ' ')
    .trim()

/** The order the matches were played in: the day, then the kick-off, then the import order. */
const byPlayedOrder = (a: PublicClubMatch, b: PublicClubMatch) =>
  a.matchDate.localeCompare(b.matchDate) || (a.kickoffAt?.getTime() ?? 0) - (b.kickoffAt?.getTime() ?? 0) || a.id - b.id

/**
 * The names of the stadium of a club in the order we saw them, each with the first and the last
 * season of the matches that had it. The names come from the Eredivisie matches that were
 * played away, where sc Heerenveen visited the club: the stadium of a match is then the one of
 * the club. A cup tie or a play-off can be at a neutral ground, so those do not count. A match
 * that was stopped counts for where it began, as the match does, so it gives the club's
 * stadium. A match without a stadium is left out.
 *
 * Spellings that only differ in capitals, spaces or hyphens are one name, written as the first
 * match of it wrote it. A name that returns after another is a line of its own, because the
 * list is the order in which we saw them. A club that we never visited gives an empty list.
 */
export function stadiumsOf(matches: readonly PublicClubMatch[]): Stadium[] {
  const stadiums: (Stadium & { key: string })[] = []

  for (const { season, stadium } of meetingsOf(matches, 'league')
    .filter((meeting) => !meeting.home)
    .toSorted(byPlayedOrder)) {
    const name = stadium?.trim() ?? ''

    if (name === '') {
      continue
    }

    const key = stadiumKey(name)
    const last = stadiums.at(-1)

    if (last?.key === key) {
      last.lastSeason = season
    } else {
      stadiums.push({ firstSeason: season, key, lastSeason: season, name })
    }
  }

  return stadiums.map(({ firstSeason, lastSeason, name }) => ({ firstSeason, lastSeason, name }))
}

/** The points against a club: 3 for a win and 1 for a draw, in the cup too. */
export const pointsOf = (record: { drawn: number; won: number }) => record.won * 3 + record.drawn

/** How many matches a club needs for the top 10 of the average points, and its places. */
export const topPointsMinimum = 5
export const topPointsPlaces = 10

/** A place in the top 10 of the average points per match: the club, its figures, its place. */
export type PointsPlace = { name: string; place: number; played: number; points: number; slug: string }

/**
 * The top 10 of the clubs against which sc Heerenveen took the most points per match, from the
 * records the page already has, so for the choice of the page. The points are the ones of the
 * column Punten (`pointsOf`) and the average is those points per played match. Only a club with
 * at least `topPointsMinimum` played matches counts, because a club met once or twice would
 * otherwise be on top. Level averages go by the number of matches, then by name; the order
 * compares the real ratio and not the rounded number, and every club has a place of its own.
 * `played` is the number of matches of all the clubs that count, not only of the ten shown.
 * With no club that counts, `places` is empty.
 */
export function topPointsOf(records: readonly PublicClubRecord[]) {
  const counting = records.filter((record) => record.played >= topPointsMinimum)
  const places = counting
    .map((record) => ({ name: record.name, played: record.played, points: pointsOf(record), slug: record.slug }))
    // Compare points/played without dividing, so 7 out of 3 is not the same as 2,33 rounded.
    .toSorted(
      (a, b) => b.points * a.played - a.points * b.played || b.played - a.played || a.name.localeCompare(b.name, 'nl'),
    )
    .slice(0, topPointsPlaces)
    .map((place, index) => ({ ...place, place: index + 1 }))

  return { places, played: counting.reduce((sum, record) => sum + record.played, 0) }
}

/** The seasons of the meetings, the newest first, each once. */
export const seasonsOf = (matches: readonly PublicClubMatch[]) =>
  [...new Set(matches.map((match) => match.season))].sort().reverse()

const clubRecords = cacheForKey(period, (choice) =>
  listClubRecords(getDatabase().db, choice === 'league' ? { competition: 'Eredivisie' } : {}),
)

/** The club and every match against it, whatever the competition. */
export type ClubPage = {
  club: NonNullable<Awaited<ReturnType<typeof findClubBySlug>>>
  matches: PublicClubMatch[]
  /** The own list of names of the club, which is empty for a club that has none. */
  names: NamePeriodLine[]
  /** The own list of stadium names of the club, which is empty for a club that has none. */
  stadiums: StadiumLine[]
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

  return club === undefined
    ? undefined
    : {
        club,
        matches: await listClubMatches(db, club.id),
        names: await listClubNamePeriods(db, club.id),
        stadiums: await listClubStadiums(db, club.id),
      }
})

/** One season of the card "De plek van <club> en de onze": both places in the Eredivisie. */
export type ClubPlace = { ours: number; season: string; theirs: number }

/**
 * The names a club goes by, normalised (see `normaliseClubName`): its name, the other spellings
 * in `club_names`, the names of its own list with their periods, and the name of every match
 * against it. The table of a season writes the club as Wikipedia did that season, so a club
 * that changed its name is found under each of them.
 */
export function clubKeysOf(page: Pick<ClubPage, 'club' | 'matches' | 'names'>): Set<string> {
  return new Set(
    [
      page.club.name,
      ...page.club.otherNames,
      ...page.names.map((line) => line.name),
      ...page.matches.map((match) => match.opponent),
    ].map(normaliseClubName),
  )
}

/**
 * The seasons in which both sc Heerenveen and the club are in the table of the Eredivisie, the
 * newest first, with the two places. `ours` are the places of every season (`getFinalPlaces`),
 * `table` the rows of every club (`listStandingsPlaces`) and `keys` the names of the club
 * (`clubKeysOf`). The season that is going on is left out: its table is not final, and these
 * are the places a season ended in. A season in which the club is not in the table, or we are
 * not, is not in the list.
 */
export function clubPlacesOf(
  ours: readonly FinalPlace[],
  table: readonly { club: string; position: number; season: string }[],
  keys: ReadonlySet<string>,
): ClubPlace[] {
  const places: ClubPlace[] = []

  for (const { now, row, season } of ours) {
    const theirs = table.find((candidate) => candidate.season === season && keys.has(normaliseClubName(candidate.club)))

    if (!now && row !== undefined && theirs !== undefined) {
      places.push({ ours: row.position, season, theirs: theirs.position })
    }
  }

  return places.reverse()
}

const standingsPlaces = cacheFor(period, () => listStandingsPlaces(getDatabase().db))

/**
 * The club with that address part and its matches, or undefined for a slug that no club has.
 * The slug is checked against the clubs that have a match before it is used as a key, because
 * a visitor can make up any address and the cache keeps an entry for every key it is asked for.
 */
export async function getClubPage(slug: string): Promise<ClubPage | undefined> {
  const known = await getClubRecords('all')

  return known.some((record) => record.slug === slug) ? clubPages(slug) : undefined
}

/**
 * The places of a club and ours per season (see `clubPlacesOf`). Our places are the ones of the
 * card "Onze plek door de jaren" (`getFinalPlaces`), so there is no second question for them.
 */
export async function getClubPlaces(page: ClubPage): Promise<ClubPlace[]> {
  const [ours, table] = await Promise.all([getFinalPlaces(), standingsPlaces()])

  return clubPlacesOf(ours, table, clubKeysOf(page))
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
