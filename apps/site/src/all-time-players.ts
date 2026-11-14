import type { listAllMatchGoals } from '@fansite/db/queries'

import { type CompetitionChoice, countsFor } from './competition'
import {
  keyOf,
  type ScorerGoal,
  scorerLine,
  scorersByPlace,
  scorersCoverage,
  scorerSortName,
  type TopScorer,
  topScorersOf,
} from './matches'
import { playerHref } from './player-address'
import { dayText, listText } from './player-career'
import { type NameParts, personNameParts, personSortName } from './player-name'

/**
 * The figures of the players over every season, for the page Spelers · Cijfers with the choice
 * "Alle seizoenen". The matches have the season, the day and the opponent, which the hattricks
 * need, and the goals. Nothing here lists matches, minutes, assists or cards per player: we
 * have line-ups for part of the seasons only (see `lineupSentence`).
 */

/** A match of any season with its goals, as `getAllTimeMatches` gives it. */
export type AllTimeMatch = Awaited<ReturnType<typeof listAllMatchGoals>>[number]

/** How many places the card Topscorers shows, and how many with the closed block under it. */
export const scorersShown = 10
export const scorersMore = 25

/** How many places the short lists of the hattricks and the penalties have. */
export const shortListPlaces = 5

/** A place of a list of scorers, with the years each player was with the club. */
export type YearsPlace = {
  goals: number
  players: [TopScorer & { years: string }, ...(TopScorer & { years: string })[]]
  position: number
}

/** The seasons a scorer was with the club as years: `2012/13` and `2013/14` are `2012–2014`. */
export function yearsAtClub(seasons: readonly string[] | undefined): string {
  const years = (seasons ?? []).map((season) => Number(season.slice(0, 4))).filter((year) => !Number.isNaN(year))

  if (years.length === 0) {
    return '–'
  }

  return `${Math.min(...years)}–${Math.max(...years) + 1}`
}

/** The person a key of `keyOf` stands for, or undefined for a goal without a person. */
const personOfKey = (key: string) => (key.startsWith('person:') ? Number(key.slice('person:'.length)) : undefined)

/**
 * The scorers of all time: the first ten places, the places 11 to 25 for the block that opens,
 * how many people scored, the goals of the top scorer (the full bar of both tables), and the
 * first season, from which the list counts. The count is the one of the card of a season, so a
 * person who scored in two seasons is one row. A player who shares the last place of a part is
 * in that part, so a place never splits over the two.
 */
export function allTimeScorersOf(
  matches: readonly AllTimeMatch[],
  choice: CompetitionChoice,
  seasonsOfPerson: ReadonlyMap<number, readonly string[]>,
) {
  const scorers = topScorersOf([...matches], choice)
  const withYears = (list: TopScorer[]): YearsPlace[] =>
    scorersByPlace(list).map((place) => ({
      ...place,
      players: place.players.map((player) => {
        const person = personOfKey(player.id)

        return { ...player, years: yearsAtClub(person === undefined ? undefined : seasonsOfPerson.get(person)) }
      }) as YearsPlace['players'],
    }))

  return {
    more: withYears(scorers.filter((scorer) => scorer.position > scorersShown && scorer.position <= scorersMore)),
    since: matches.map((match) => match.season).sort()[0],
    top: withYears(scorers.filter((scorer) => scorer.position <= scorersShown)),
    topGoals: scorers[0]?.goals ?? 0,
    total: scorers.length,
  }
}

/** How many seasons the card Clubtopscorer per seizoen shows before its closed block. */
export const clubTopScorerSeasonsShown = 5

/** The top scorer or scorers of one season, with the goals they share. */
export type ClubTopScorerSeason = {
  goals: number
  /** Whether we don't know the scorers of some of the matches of the season. */
  incomplete: boolean
  players: [TopScorer, ...TopScorer[]]
  season: string
}

/**
 * The club top scorer of every season, the newest first: the first place of the list of goal
 * scorers of that season, counted as the card of a season counts it (`topScorersOf`), so the
 * two cards agree. Players who share the first place are all in the row. A season without a
 * goal of ours by a known scorer has no row, and a season whose competition has no match in
 * the choice has none either. `incomplete` says that some played matches of the season have no
 * scorers, so the top scorer may have scored more.
 */
export function clubTopScorersOf(matches: readonly AllTimeMatch[], choice: CompetitionChoice) {
  const bySeason = new Map<string, AllTimeMatch[]>()

  for (const match of matches) {
    bySeason.set(match.season, [...(bySeason.get(match.season) ?? []), match])
  }

  const rows: ClubTopScorerSeason[] = []

  for (const [season, inSeason] of bySeason) {
    const [first, ...rest] = topScorersOf([...inSeason], choice).filter((scorer) => scorer.position === 1)

    if (first === undefined) {
      continue
    }

    const { known, played } = scorersCoverage([...inSeason], choice)

    rows.push({ goals: first.goals, incomplete: known < played, players: [first, ...rest], season })
  }

  return rows.sort((a, b) => b.season.localeCompare(a.season))
}

/** Whether a match has a played score with its goals known, as the cards of a season count. */
const isKnown = (match: AllTimeMatch) =>
  match.status === 'played' &&
  match.goalsFor !== null &&
  match.goalsAgainst !== null &&
  (match.goals.length > 0 || match.goalsFor + match.goalsAgainst === 0)

const counted = (matches: readonly AllTimeMatch[], choice: CompetitionChoice) =>
  matches.filter((match) => countsFor(match.competition, choice) && isKnown(match))

/** A player with how often he did something, for the short lists, with the place he shares. */
export type CountPlace = {
  id: string
  position: number
  scorer: ReturnType<typeof scorerLine>
  times: number
}

/** One hattrick: who scored it, how many goals, and in which match. */
export type Hattrick = {
  goals: number
  id: string
  match: {
    competition: string
    date: string
    home: boolean
    label: string
    opponent: string
    round: string
    season: string
  }
  scorer: ReturnType<typeof scorerLine>
}

/** The first `places` places of a count per player, with all who share the last of them. */
function countPlaces(counts: Map<string, { goal: ScorerGoal; times: number }>, places: number): CountPlace[] {
  const sorted = [...counts.entries()]
    .map(([id, { goal, times }]) => ({ id, scorer: scorerLine(goal), sort: scorerSortName(goal), times }))
    .sort(
      (a, b) =>
        b.times - a.times ||
        a.sort.localeCompare(b.sort, 'nl') ||
        (a.scorer.givenName ?? '').localeCompare(b.scorer.givenName ?? '', 'nl'),
    )

  return sorted
    .map((entry) => ({
      id: entry.id,
      position: sorted.findIndex((other) => other.times === entry.times) + 1,
      scorer: entry.scorer,
      times: entry.times,
    }))
    .filter((place) => place.position <= places)
}

/** The match as a line: the home side first, with our goals first only when we play at home. */
const matchLabel = ({ goalsAgainst, goalsFor, home, opponent }: AllTimeMatch) =>
  home
    ? `sc Heerenveen ${goalsFor}–${goalsAgainst} ${opponent}`
    : `${opponent} ${goalsAgainst}–${goalsFor} sc Heerenveen`

/**
 * The hattricks of all time: three goals or more by one player in one match (an own goal is
 * nobody's goal, a penalty is). The players with the most of them, from the first five places,
 * and every hattrick, the newest first. A match whose goals we don't know counts for nothing.
 */
export function hattricksOf(matches: readonly AllTimeMatch[], choice: CompetitionChoice) {
  const all: Hattrick[] = []
  const perPlayer = new Map<string, { goal: ScorerGoal; times: number }>()

  for (const match of counted(matches, choice)) {
    const goals = new Map<string, { count: number; goal: ScorerGoal }>()

    for (const goal of match.goals.filter((item) => item.ours && !item.ownGoal)) {
      const key = keyOf(goal)

      goals.set(key, { count: (goals.get(key)?.count ?? 0) + 1, goal })
    }

    for (const [id, { count, goal }] of goals) {
      if (count < 3) {
        continue
      }

      all.push({
        goals: count,
        id,
        match: {
          competition: match.competition,
          date: match.matchDate,
          home: match.home,
          label: matchLabel(match),
          opponent: match.opponent,
          round: match.round,
          season: match.season,
        },
        scorer: scorerLine(goal),
      })
      perPlayer.set(id, { goal, times: (perPlayer.get(id)?.times ?? 0) + 1 })
    }
  }

  return {
    list: all.sort((a, b) => b.match.date.localeCompare(a.match.date) || a.id.localeCompare(b.id)),
    top: countPlaces(perPlayer, shortListPlaces),
    total: all.length,
  }
}

/**
 * The penalties that sc Heerenveen scored in all seasons: the first five places of the
 * players who took them, and the total. A penalty in a match whose goals we don't know is not
 * in it.
 */
export function penaltiesOf(matches: readonly AllTimeMatch[], choice: CompetitionChoice) {
  const perPlayer = new Map<string, { goal: ScorerGoal; times: number }>()
  let total = 0

  for (const match of counted(matches, choice)) {
    for (const goal of match.goals.filter((item) => item.ours && item.penalty && !item.ownGoal)) {
      const key = keyOf(goal)

      perPlayer.set(key, { goal, times: (perPlayer.get(key)?.times ?? 0) + 1 })
      total += 1
    }
  }

  return { top: countPlaces(perPlayer, shortListPlaces), total }
}

/** The day of a hattrick as words, such as `12 september 1998`. */
export const hattrickDay = dayText

/** The places of a short list as rows of `TopScorersTable`; equal counts share a row. */
export function countRows(places: readonly CountPlace[]) {
  const rows: {
    goals: number
    players: [CountPlace['scorer'] & { id: string }, ...(CountPlace['scorer'] & { id: string })[]]
    position: number
  }[] = []

  for (const { id, position, scorer, times } of places) {
    const last = rows.at(-1)

    if (last?.position === position) {
      last.players.push({ ...scorer, id })
    } else {
      rows.push({ goals: times, players: [{ ...scorer, id }], position })
    }
  }

  return rows
}

/**
 * The sentence that says why this page has no list of matches, minutes and assists of all
 * time: the seasons whose line-ups we have, from the data. Seasons that follow each other are
 * one stretch (`van 1992/93 tot en met 2005/06`), and a stretch that reaches the current season
 * is open (`vanaf 2026/27`).
 */
export function lineupSentence(seasons: readonly string[], current: string): string {
  const start = (season: string) => Number(season.slice(0, 4))
  const stretches: { from: string; to: string }[] = []

  for (const season of [...seasons].sort()) {
    const last = stretches.at(-1)

    if (last !== undefined && start(season) - start(last.to) === 1) {
      last.to = season
    } else {
      stretches.push({ from: season, to: season })
    }
  }

  if (stretches.length === 0) {
    return 'Wedstrijden, minuten en assists per speler hebben we nog van geen enkel seizoen. Daarom heeft deze pagina er geen lijst aller tijden van.'
  }

  const words = stretches.map(({ from, to }) =>
    to === current ? `vanaf ${from}` : from === to ? `in ${from}` : `van ${from} tot en met ${to}`,
  )

  return `Wedstrijden, minuten en assists per speler kennen we alleen ${listText(words)}. Daarom heeft deze pagina er geen lijst aller tijden van.`
}

/** The key of a match in the addresses of its page: season, competition and round. */
export const matchKey = (season: string, competition: string, round: string) => `${season}|${competition}|${round}`

/** One record: the figure, and everyone who shares it. */
export type PlayerRecord = { entries: [RecordEntry, ...RecordEntry[]]; value: number }

/** The five records of the players, each of them missing when the data has nothing for it. */
export type PlayerRecords = {
  fastest?: PlayerRecord
  mostInMatch?: PlayerRecord
  mostInSeason?: PlayerRecord
  oldest?: PlayerRecord
  youngest?: PlayerRecord
}

/** What one record says about a goal: the player, the match and the figure behind it. */
export type RecordEntry = {
  /** The age on the day of the match, for the youngest and the oldest scorer. */
  age?: { days: number; years: number }
  id: string
  /** The match, for every record but the most goals in a season. */
  match?: {
    competition: string
    date: string
    label: string
    round: string
    season: string
  }
  /** The minute, for the fastest goal. */
  minute?: number
  scorer: ReturnType<typeof scorerLine>
  season: string
}

/** A date `YYYY-MM-DD` as a number of days, so a difference is a number of days. */
const dayNumber = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.slice(0, 10).split('-').map(Number)

  return Date.UTC(year, month - 1, day) / 86_400_000
}

/** The age on a day, in whole years and the days since the last birthday. */
export function ageOnDay(birthDate: string, day: string): undefined | { days: number; years: number } {
  const [birthYear = 0, birthMonth = 1, birthDay = 1] = birthDate.slice(0, 10).split('-').map(Number)
  const year = Number(day.slice(0, 4))

  if (dayNumber(day) < dayNumber(birthDate)) {
    return undefined
  }

  let years = year - birthYear

  // A birthday on 29 February is on 1 March in a year that has none.
  const birthdayIn = (inYear: number) => {
    const leap = new Date(Date.UTC(inYear, 1, 29)).getUTCMonth() === 1

    return birthMonth === 2 && birthDay === 29 && !leap
      ? `${inYear}-03-01`
      : `${inYear}-${pad(birthMonth)}-${pad(birthDay)}`
  }

  if (dayNumber(day) < dayNumber(birthdayIn(year))) {
    years -= 1
  }

  return { days: dayNumber(day) - dayNumber(birthdayIn(birthYear + years)), years }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** A person of the squads, as `getSquadPeople` gives them. */
export type SquadPerson = {
  familyName: null | string
  familyNamePrefix: null | string
  givenName: null | string
  slug: null | string
}

export type SquadSeasons = ReturnType<typeof squadSeasonsOf>

type SquadRowPlayer = NameParts & { href: string | undefined; id: string; years: string }

/**
 * The records of the players: the most goals in one season (the first place of the card
 * Clubtopscorer per seizoen, so the two agree), the most in one match, the youngest and the
 * oldest scorer, and the fastest goal. A goal counts when it is one of ours and not an own
 * goal, in a match whose goals we know. The age is in whole years and days on the day of the
 * match, from a full date of birth, so a player known by a year or a month alone is not in the
 * youngest or the oldest. The fastest goal needs a minute from 1 to 90. Players who share a
 * record are all in it, once for each season or match. `birthDates` maps a person to the full
 * date of birth.
 */
export function playerRecordsOf(
  matches: readonly AllTimeMatch[],
  choice: CompetitionChoice,
  birthDates: ReadonlyMap<number, string>,
): PlayerRecords {
  const records: PlayerRecords = {}
  const bestOf = (entries: { entry: RecordEntry; score: number }[], best: 'high' | 'low') => {
    const [first] = entries

    if (first === undefined) {
      return undefined
    }

    const target = entries.reduce(
      (value, { score }) => (best === 'high' ? Math.max(value, score) : Math.min(value, score)),
      first.score,
    )
    const winners = entries.filter(({ score }) => score === target).map(({ entry }) => entry)
    const [head, ...rest] = winners

    return head === undefined ? undefined : { entries: [head, ...rest] as PlayerRecord['entries'], value: target }
  }
  const sorted = (list: RecordEntry[]) =>
    list.sort((a, b) => (a.match?.date ?? '').localeCompare(b.match?.date ?? '') || a.id.localeCompare(b.id))

  const seasons = clubTopScorersOf(matches, choice)
  const topSeason = seasons.reduce((most, { goals }) => Math.max(most, goals), 0)

  if (topSeason > 0) {
    const entries = seasons
      .filter(({ goals }) => goals === topSeason)
      .flatMap(({ players, season }) =>
        players.map((player): RecordEntry => ({ id: player.id, scorer: player, season })),
      )
      .sort((a, b) => a.season.localeCompare(b.season) || a.id.localeCompare(b.id))
    const [head, ...rest] = entries

    if (head !== undefined) {
      records.mostInSeason = { entries: [head, ...rest], value: topSeason }
    }
  }

  const inMatch: { entry: RecordEntry; score: number }[] = []
  const youngOld: { entry: RecordEntry; score: number }[] = []
  const quick: { entry: RecordEntry; score: number }[] = []

  for (const match of counted(matches, choice)) {
    const where = {
      competition: match.competition,
      date: match.matchDate,
      label: matchLabel(match),
      round: match.round,
      season: match.season,
    }
    const perPlayer = new Map<string, { count: number; goal: ScorerGoal }>()

    for (const goal of match.goals.filter((item) => item.ours && !item.ownGoal)) {
      const key = keyOf(goal)

      perPlayer.set(key, { count: (perPlayer.get(key)?.count ?? 0) + 1, goal })

      const entry = (extra: Partial<RecordEntry>): RecordEntry => ({
        id: key,
        match: where,
        scorer: scorerLine(goal),
        season: match.season,
        ...extra,
      })

      if (goal.minute !== null && goal.minute >= 1 && goal.minute <= 90) {
        quick.push({ entry: entry({ minute: goal.minute }), score: goal.minute })
      }

      const person = personOfKey(key)
      const born = person === undefined ? undefined : birthDates.get(person)
      const age = born === undefined ? undefined : ageOnDay(born, match.matchDate)

      if (born !== undefined && age !== undefined) {
        youngOld.push({ entry: entry({ age }), score: dayNumber(match.matchDate) - dayNumber(born) })
      }
    }

    for (const [key, { count, goal }] of perPlayer) {
      inMatch.push({ entry: { id: key, match: where, scorer: scorerLine(goal), season: match.season }, score: count })
    }
  }

  const most = bestOf(inMatch, 'high')
  const fastest = bestOf(quick, 'low')
  const youngest = bestOf(youngOld, 'low')
  const oldest = bestOf(youngOld, 'high')

  // A player with two goals at the same minute, or two on the day of the record, is one line.
  const once = (record: PlayerRecord | undefined): PlayerRecord | undefined => {
    if (record === undefined) {
      return undefined
    }

    const seen = new Set<string>()
    const unique = sorted(
      record.entries.filter((entry) => {
        const key = `${entry.id}|${entry.match?.date ?? entry.season}`

        return seen.has(key) ? false : (seen.add(key), true)
      }),
    )
    const [head, ...rest] = unique

    return head === undefined ? undefined : { entries: [head, ...rest], value: record.value }
  }

  const mostRecord = once(most)
  const fastestRecord = once(fastest)

  if (mostRecord !== undefined) records.mostInMatch = mostRecord
  if (fastestRecord !== undefined) records.fastest = fastestRecord

  // The youngest and the oldest are told in years and days, so the value is the first entry's.
  for (const [name, record] of [
    ['youngest', youngest],
    ['oldest', oldest],
  ] as const) {
    const unique = once(record)

    if (unique !== undefined) records[name] = unique
  }

  return records
}

/**
 * The card Meeste seizoenen in de selectie: the first five places of the people who were in the
 * squad of the most seasons, as the rows of `TopScorersTable` (`goals` is the number of
 * seasons) with the years each was with the club. A person who left and came back counts each
 * season once, and the count is the one of the seasons of the person (`seasonsOfPerson`), so
 * it agrees with the number of seasons on the page of the player. Players who share a place are
 * all in it, by name. A person we know no name of is left out.
 */
export function squadSeasonsOf(
  seasonsOfPerson: ReadonlyMap<number, readonly string[]>,
  people: ReadonlyMap<number, SquadPerson>,
) {
  const counted = [...seasonsOfPerson.entries()].flatMap(([id, seasons]) => {
    const person = people.get(id)
    const parts = person === undefined ? undefined : personNameParts(personNames(person))

    return person === undefined || parts === undefined
      ? []
      : [
          {
            count: new Set(seasons).size,
            href: playerHref(person.slug),
            id,
            parts,
            sort: personSortName(personNames(person)),
            years: yearsAtClub(seasons),
          },
        ]
  })
  const sorted = counted.sort((a, b) => b.count - a.count || a.sort.localeCompare(b.sort, 'nl') || a.id - b.id)
  const rows: {
    goals: number
    players: [SquadRowPlayer, ...SquadRowPlayer[]]
    position: number
  }[] = []

  for (const entry of sorted) {
    const position = sorted.findIndex((other) => other.count === entry.count) + 1
    const player = { ...entry.parts, href: entry.href, id: `person:${entry.id}`, years: entry.years }
    const last = rows.at(-1)

    if (last?.position === position) {
      last.players.push(player)
    } else if (position <= shortListPlaces) {
      rows.push({ goals: entry.count, players: [player], position })
    }
  }

  return rows
}

const personNames = (person: SquadPerson) => ({
  personFamilyName: person.familyName,
  personFamilyNamePrefix: person.familyNamePrefix,
  personGivenName: person.givenName,
})
