import type { CareerPeriod, CareerSeason } from '@fansite/design-system'

import { competitions } from '@fansite/db/schema'

import type { CareerGoal, CareerMatch, PlayerSeason } from './player-seasons'

import { ourClub } from './match-page'
import { nextSeason } from './player-page'

/** The moment chosen for a season: the match, what happened and his goals in it. */
export type CareerMomentChoice = {
  /** His goals in that match, the first first. Empty for a match he only played. */
  goals: readonly CareerGoal[]
  kind: MomentKind
  match: CareerMatch
}

/** What a moment says happened, in the order that `momentsOf` prefers them. */
export type MomentKind = 'double' | 'first-goal' | 'first-match' | 'hattrick' | 'last-goal' | 'last-match'

/** The season before a season: `2003/04` before `2004/05`, `1999/00` before `2000/01`. */
const previousSeason = (season: string) => {
  const start = Number(season.slice(0, 4)) - 1

  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

/**
 * One moment for each season that has one (#1084), the first of these that exists:
 *
 * 1. his first match for us, when we have every line-up of that season and of each season
 *    before it;
 * 2. his first goal for us;
 * 3. a match with three or more goals of his, the one with the most (the first when they tie);
 * 4. a match with two goals of his, the first;
 * 5. his last goal for us;
 * 6. his last match for us, when we have every line-up of that season and of each later season.
 *
 * The first and the last match and goal are those of his whole career, so they belong to one
 * season. A match is the moment of one season only: the seasons are handled from the oldest,
 * and a match that an older season took is not a candidate for a newer one.
 */
export function careerMoments(seasons: readonly PlayerSeason[]): Map<string, CareerMomentChoice> {
  const oldestFirst = [...seasons].sort((first, second) => first.season.localeCompare(second.season))
  const complete = (season: PlayerSeason) => season.source === 'lineups'
  const firstMatchSeason = oldestFirst.find((season) => season.lineupMatches.length > 0)
  const lastMatchSeason = oldestFirst.findLast((season) => season.lineupMatches.length > 0)
  const firstGoalSeason = oldestFirst.find((season) => season.goalMoments.length > 0)
  const lastGoalSeason = oldestFirst.findLast((season) => season.goalMoments.length > 0)
  const firstMatchKnown =
    firstMatchSeason !== undefined &&
    oldestFirst.filter(({ season }) => season <= firstMatchSeason.season).every(complete)
  const lastMatchKnown =
    lastMatchSeason !== undefined &&
    oldestFirst.filter(({ season }) => season >= lastMatchSeason.season).every(complete)
  const chosen = new Map<string, CareerMomentChoice>()
  const taken = new Set<number>()

  for (const season of oldestFirst) {
    const candidates: (CareerMomentChoice | undefined)[] = []
    const byMatch = new Map<number, CareerGoal[]>()

    for (const goal of season.goalMoments) {
      byMatch.set(goal.match.id, [...(byMatch.get(goal.match.id) ?? []), goal])
    }

    const multi = [...byMatch.values()]
    const most = multi.reduce((top, goals) => Math.max(top, goals.length), 0)
    const withGoals = (count: number, kind: MomentKind) => {
      const goals = multi.find((found) => found.length === count)

      return goals === undefined || goals[0] === undefined ? undefined : { goals, kind, match: goals[0].match }
    }
    const firstGoal = season.goalMoments[0]
    const lastGoal = season.goalMoments.at(-1)
    const firstMatch = season.lineupMatches[0]
    const lastMatch = season.lineupMatches.at(-1)

    candidates.push(
      season === firstMatchSeason && firstMatchKnown && firstMatch !== undefined
        ? { goals: [], kind: 'first-match', match: firstMatch }
        : undefined,
      season === firstGoalSeason && firstGoal !== undefined
        ? { goals: [firstGoal], kind: 'first-goal', match: firstGoal.match }
        : undefined,
      most >= 3 ? withGoals(most, 'hattrick') : undefined,
      most >= 2 ? withGoals(2, 'double') : undefined,
      season === lastGoalSeason && lastGoal !== undefined
        ? { goals: [lastGoal], kind: 'last-goal', match: lastGoal.match }
        : undefined,
      season === lastMatchSeason && lastMatchKnown && lastMatch !== undefined
        ? { goals: [], kind: 'last-match', match: lastMatch }
        : undefined,
    )

    // A match that an older season has is skipped, but never one that this season only plays.
    const found = candidates.find((candidate) => candidate !== undefined && !taken.has(candidate.match.id))

    if (found !== undefined) {
      chosen.set(season.season, found)
      taken.add(found.match.id)
    }
  }

  return chosen
}

const dayFormat = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' })

/** A day as words: `10 april 2004`. */
export const dayText = (day: string) => dayFormat.format(new Date(`${day}T12:00:00Z`))

/** Words as a list in Dutch: "a", "a en b", "a, b en c". */
export const listText = (words: readonly string[]) =>
  words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} en ${words.at(-1)}`

/** The minute of a goal with its added time, such as `25′` or `90+2′`. */
export const minuteText = ({ minute, stoppage }: CareerGoal) =>
  minute === undefined ? undefined : `${minute}${stoppage === undefined ? '' : `+${stoppage}`}′`

const countWords: Record<number, string> = { 2: 'twee', 4: 'vier', 5: 'vijf', 6: 'zes', 7: 'zeven', 8: 'acht' }

/** What the page needs to fill in: the addresses and the season that is running. */
export type CareerOptions = {
  /** The season that is running now, such as `2026/27`. */
  current: string
  /** The page of a match, or `undefined` when it has none. */
  matchHref: (match: CareerMatch) => string | undefined
  moments: ReadonlyMap<string, CareerMomentChoice>
  /** The page Spelers of a season. */
  seasonHref: (season: string) => string
}

/**
 * The sentence above the career: for how many of his seasons we have the line-ups. A season has
 * them when every match of that season has a report.
 */
export function careerCoverage(seasons: readonly PlayerSeason[]) {
  const total = seasons.length
  const lineups = seasons.filter((season) => season.source === 'lineups').length

  if (total === 1) {
    return lineups === 1
      ? 'Van zijn enige seizoen hebben we de opstellingen.'
      : 'Van zijn enige seizoen hebben we alleen de doelpunten.'
  }
  if (lineups === total) {
    return `Van alle ${total} seizoenen hebben we de opstellingen.`
  }
  if (lineups === 0) {
    return `Van zijn ${total} seizoenen hebben we alleen de doelpunten.`
  }

  return `Van ${lineups} van zijn ${total} seizoenen hebben we de opstellingen. Van de andere alleen de doelpunten.`
}

/**
 * The periods of the career for `CareerTimeline`, the newest first: seasons that follow each
 * other are one period with the years as its heading (`2007–2010`, or `2024–nu` when it has the
 * season that is running), and the seasons we have no row for are the gap under the period.
 */
export function careerPeriods(seasons: readonly PlayerSeason[], options: CareerOptions): CareerPeriod[] {
  const oldestFirst = [...seasons].sort((first, second) => first.season.localeCompare(second.season))
  const groups: PlayerSeason[][] = []

  for (const season of oldestFirst) {
    const group = groups.at(-1)

    if (group !== undefined && nextSeason(group.at(-1)?.season ?? '') === season.season) {
      group.push(season)
    } else {
      groups.push([season])
    }
  }

  return groups
    .map((group, index): CareerPeriod => {
      const first = group[0]?.season ?? ''
      const last = group.at(-1)?.season ?? ''
      const olderLast = groups[index - 1]?.at(-1)?.season
      // The gap is written under the newer period: the seasons between it and the older one.
      const gapFrom = olderLast === undefined ? undefined : nextSeason(olderLast)
      const gapTo = previousSeason(first)
      const gap =
        gapFrom === undefined
          ? undefined
          : `${gapFrom === gapTo ? gapFrom : `${gapFrom} tot en met ${gapTo}`}: niet in de selectie`

      return {
        ...(gap === undefined ? {} : { gap }),
        seasons: group.map((season) => careerSeason(season, options)).reverse(),
        years: `${first.slice(0, 4)}–${last === options.current ? 'nu' : Number(last.slice(0, 4)) + 1}`,
      }
    })
    .reverse()
}

/** The two clubs, the home club first, with the score when it is asked for: `A – B 2–1`. */
export function matchTitle({ goalsAgainst, goalsFor, home, opponent }: CareerMatch, withScore: boolean) {
  const clubs = home ? [ourClub, opponent] : [opponent, ourClub]
  const score = home ? `${goalsFor}–${goalsAgainst}` : `${goalsAgainst}–${goalsFor}`

  return `${clubs.join(' – ')}${withScore ? ` ${score}` : ''}`
}

/** What happened in the match, with the minutes we know: "hattrick: 25′, 30′ en 32′". */
export function momentText({ goals, kind }: Pick<CareerMomentChoice, 'goals' | 'kind'>) {
  const minutes = listText(goals.flatMap((goal) => minuteText(goal) ?? []))
  const what = {
    double: `${countWords[goals.length] ?? goals.length} doelpunten`,
    'first-goal': 'eerste doelpunt',
    'first-match': 'eerste wedstrijd',
    hattrick: goals.length === 3 ? 'hattrick' : `${countWords[goals.length] ?? goals.length} doelpunten`,
    'last-goal': 'laatste doelpunt',
    'last-match': 'laatste wedstrijd',
  }[kind]

  return minutes === '' ? what : `${what}: ${minutes}`
}

/** One season of the career: the number, the goals by competition, the moment and a remark. */
function careerSeason(season: PlayerSeason, { current, matchHref, moments, seasonHref }: CareerOptions): CareerSeason {
  const choice = moments.get(season.season)
  const competitionLine = competitionsText(season)
  const remark =
    season.reportedMatches === 0
      ? 'Geen opstellingen van dit seizoen.'
      : season.source === 'lineups'
        ? undefined
        : 'Nog niet alle wedstrijden van dit seizoen staan op de site.'
  const href = choice === undefined ? undefined : matchHref(choice.match)

  return {
    ...(competitionLine === '' ? {} : { competitions: competitionLine }),
    ...(season.season === current ? { current: true } : {}),
    href: seasonHref(season.season),
    ...(choice === undefined
      ? {}
      : {
          moment: {
            ...(href === undefined ? {} : { href }),
            note: `${dayText(choice.match.matchDate)} · ${momentText(choice)}`,
            title: matchTitle(choice.match, href === undefined),
          },
        }),
    ...(season.shirtNumber === undefined ? {} : { number: String(season.shirtNumber) }),
    ...(remark === undefined ? {} : { remark }),
    season: season.season,
  }
}

/** The goals of a season by competition, the most first: "Eredivisie 11 · Europa League 3". */
function competitionsText(season: PlayerSeason) {
  const entries = competitions.flatMap((competition) => {
    const count = season.goalsByCompetition[competition]

    return count === undefined ? [] : [{ competition, count }]
  })

  return entries
    .sort((first, second) => second.count - first.count)
    .map(({ competition, count }) => `${competition} ${count}`)
    .join(' · ')
}
