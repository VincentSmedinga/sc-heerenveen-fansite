import type { FormResult } from '@fansite/design-system'

import { listClubStadiums, type StadiumLine } from '@fansite/db/club-stadiums'
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
import { type CompetitionChoice } from './competition'
import { getDatabase } from './database'
import { ownStadiumPeriods, stadiumPeriods } from './match-format'
import { programmeOf } from './matches'

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

  return meetings
    .slice(0, lastCount)
    .map(({ goalsAgainst, goalsFor }): FormResult =>
      goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'G' : 'V',
    )
    .reverse()
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

/**
 * A name of the stadium of a club, as Wikipedia wrote it, with the first and the last season
 * (such as "2019/20") of the league matches in which we saw that name. A season is all we know:
 * we visit a club once a season, so the matches say nothing about the day the name changed.
 */
export type Stadium = { firstSeason: string; lastSeason: string; name: string }

/**
 * A line of the card with the stadium of a club: the name, a note that the editors wrote with
 * it, and what it says about the time (see `stadiumPeriods` and `ownStadiumPeriods`).
 */
export type StadiumView = { name: string; note?: string | undefined; period?: string | undefined }

/**
 * The lines of the card with the stadium of a club. A club whose editors made a list of its own
 * shows that list, with their notes, and nothing of the matches; a club without a list shows
 * the names of the matches (`stadiumsOf`).
 */
export function stadiumViewsOf(own: readonly StadiumLine[], matches: readonly PublicClubMatch[]): StadiumView[] {
  if (own.length > 0) {
    const periods = ownStadiumPeriods(own)

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
    : { club, matches: await listClubMatches(db, club.id), stadiums: await listClubStadiums(db, club.id) }
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
