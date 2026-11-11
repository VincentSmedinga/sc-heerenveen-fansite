import { type Competition, competitions } from '@fansite/db/schema'

import type { CareerGoal, CareerMatch, PlayerSeason, PlayerSeasonFacts } from './player-seasons'

/** A goal of his, or a goal against us, with the match it was scored in. */
export type AsideGoal = CareerGoal

/** The club scored against most: the name as the newest match writes it, and its page. */
export type AsideOpponent = { goals: number; name: string; slug: string }

/** What the side column of the page of a player (#1086) shows, each part when we know it. */
export type PlayerAside = {
  /** The goals he scored against us, newest first, with the sentence that says when. */
  against: undefined | { goals: readonly AsideGoal[]; intro: string }
  /** Who gave him the most assists, with at least two. */
  assistGiver: undefined | { assists: number; name: string; slug: null | string }
  /** The competitions with the goals (or, for a goalkeeper, the matches), the most first. */
  competitions: undefined | { rows: readonly { competition: Competition; count: number }[]; title: string }
  /** The matches in Europe, from the line-ups, and how many of them in the Champions League. */
  europe: undefined | { championsLeague: number; matches: number; partial: boolean }
  /** The Dutch day of the first goal he scored for us, with the goal. */
  firstGoal: AsideGoal | undefined
  /** The clubs he scored against most, at most four, each with at least two goals. */
  opponents: readonly AsideOpponent[]
}

/** The competitions of Europe, the Champions League and its play-offs among them. */
const europeanCompetitions: readonly Competition[] = [
  'Champions League',
  'Europa League',
  'Europacup II',
  'Intertoto Cup',
  'Play-offs Champions League',
  'Play-offs Conference League',
  'Play-offs Europa League',
  'Play-offs UEFA Cup',
  'UEFA Cup',
]

const championsLeague: readonly Competition[] = ['Champions League', 'Play-offs Champions League']

/** How many clubs "Vaakst raak tegen" shows, and how many goals a club needs to be in it. */
const opponentLimit = 4
const minimumRepeats = 2

const numberWords: Record<number, string> = {
  1: 'één',
  2: 'twee',
  3: 'drie',
  4: 'vier',
  5: 'vijf',
  6: 'zes',
  7: 'zeven',
  8: 'acht',
  9: 'negen',
  10: 'tien',
}

const byDay = (first: AsideGoal, second: AsideGoal) =>
  first.match.matchDate.localeCompare(second.match.matchDate) ||
  first.match.id - second.match.id ||
  (first.minute ?? 0) - (second.minute ?? 0)

/**
 * The side column of the page of a player, from his seasons and what was read with them. A part
 * we know nothing of is `undefined` (or empty) so the page leaves its card out.
 */
export function playerAsideOf(
  seasons: readonly PlayerSeason[],
  facts: Pick<PlayerSeasonFacts, 'againstUs' | 'assistGivers'>,
  goalkeeper: boolean,
): PlayerAside {
  const goals = seasons.flatMap((season) => season.goalMoments).sort(byDay)
  const matches = seasons.flatMap((season) => season.lineupMatches)
  const european = matches.filter((match) => europeanCompetitions.includes(match.competition))

  return {
    against: againstOf(seasons, facts.againstUs ?? []),
    assistGiver: assistGiverOf(facts.assistGivers ?? []),
    competitions: competitionsOf(seasons, matches, goalkeeper),
    europe:
      european.length === 0
        ? undefined
        : {
            championsLeague: european.filter((match) => championsLeague.includes(match.competition)).length,
            matches: european.length,
            partial: seasons.some((season) => season.source !== 'lineups'),
          },
    firstGoal: goals[0],
    opponents: opponentsOf(goals),
  }
}

/**
 * The goals he scored against us, newest first, with the sentence above them: "voor hij hier
 * kwam", "nadat hij hier wegging" or, when it fits neither (or both), "tegen sc Heerenveen".
 */
function againstOf(
  seasons: readonly PlayerSeason[],
  against: NonNullable<PlayerSeasonFacts['againstUs']>,
): PlayerAside['against'] {
  const goals = against
    .map(({ match, minute, stoppage }) => ({ match, minute: minute ?? undefined, stoppage: stoppage ?? undefined }))
    .sort((first, second) => byDay(second, first))
  const first = seasons.map((season) => season.season).sort()[0]
  const last = seasons
    .map((season) => season.season)
    .sort()
    .at(-1)

  if (goals.length === 0 || first === undefined || last === undefined) {
    return undefined
  }

  const times = `${numberWords[goals.length] ?? goals.length} keer`
  const before = goals.every(({ match }) => match.season < first)
  const after = goals.every(({ match }) => match.season > last)
  const intro = before
    ? `Voor hij hier kwam, scoorde hij ${times} tegen sc Heerenveen.`
    : after
      ? `Nadat hij hier wegging, scoorde hij ${times} tegen sc Heerenveen.`
      : `Hij scoorde ${times} tegen sc Heerenveen.`

  return { goals, intro }
}

/** Who gave him the most assists. With two on top of the list, none: we cannot say who. */
function assistGiverOf(givers: NonNullable<PlayerSeasonFacts['assistGivers']>): PlayerAside['assistGiver'] {
  const counts = new Map<string, { assists: number; name: string; slug: null | string }>()

  for (const { name, slug } of givers) {
    const key = slug ?? name

    counts.set(key, { assists: (counts.get(key)?.assists ?? 0) + 1, name, slug })
  }

  const [first, second] = [...counts.values()].sort((a, b) => b.assists - a.assists)

  return first === undefined || first.assists < minimumRepeats || first.assists === second?.assists ? undefined : first
}

/** The goals of each competition (matches for a goalkeeper), the most first, none empty. */
function competitionsOf(seasons: readonly PlayerSeason[], matches: readonly CareerMatch[], goalkeeper: boolean) {
  const counts = new Map<Competition, number>()

  if (goalkeeper) {
    for (const { competition } of matches) {
      counts.set(competition, (counts.get(competition) ?? 0) + 1)
    }
  } else {
    for (const season of seasons) {
      for (const [competition, count] of Object.entries(season.goalsByCompetition) as [Competition, number][]) {
        counts.set(competition, (counts.get(competition) ?? 0) + count)
      }
    }
  }

  const rows = competitions
    .flatMap((competition) => {
      const count = counts.get(competition) ?? 0

      return count > 0 ? [{ competition, count }] : []
    })
    .sort((first, second) => second.count - first.count)

  return rows.length === 0
    ? undefined
    : { rows, title: goalkeeper ? 'Wedstrijden per competitie' : 'Doelpunten per competitie' }
}

/** The clubs he scored against at least twice, the most first, at most four. */
function opponentsOf(goals: readonly AsideGoal[]): AsideOpponent[] {
  const clubs = new Map<string, AsideOpponent>()

  // The goals run oldest first, so the name that stays is the one of the newest match.
  for (const { match } of goals) {
    if (match.clubSlug === undefined) {
      continue
    }

    clubs.set(match.clubSlug, {
      goals: (clubs.get(match.clubSlug)?.goals ?? 0) + 1,
      name: match.opponent,
      slug: match.clubSlug,
    })
  }

  return [...clubs.values()]
    .filter((club) => club.goals >= minimumRepeats)
    .sort((first, second) => second.goals - first.goals || first.name.localeCompare(second.name, 'nl'))
    .slice(0, opponentLimit)
}
