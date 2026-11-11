import type { PlayerPage } from './player-page'
import type { PlayerSeason } from './player-seasons'

import { resultOf } from './match-result'

/** The fewest goals (with a minute) that make a chart worth drawing. */
const fewestGoals = 5

/** The six quarters of a match, as the labels of the chart and the card. */
export const quarters = ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90'] as const

/** The card Wanneer hij scoort: the goals per quarter, and those that have no minute. */
export type GoalQuarters = {
  /** The goals per quarter, in the order of `quarters`. */
  counts: number[]
  /** All his goals for us, with or without a minute. */
  total: number
  /** The goals that have no minute. */
  unknown: number
}

/** The card Uitslagen: the matches he was in, won, drawn and lost. */
export type PlayerRecord = { draws: number; losses: number; title: string; wins: number }

/** The card with a bar per season: what it counts and the rows, the oldest season first. */
export type SeasonBars = {
  kind: SeasonBarsKind
  rows: { season: string; value: number }[]
  title: string
}

/** What the bars of the card per season count. */
export type SeasonBarsKind = 'cleanSheets' | 'goals' | 'played'

/** The titles of the cards per season. */
const seasonTitles: Record<SeasonBarsKind, string> = {
  cleanSheets: 'De nul per seizoen',
  goals: 'Doelpunten per seizoen',
  played: 'Wedstrijden per seizoen',
}

/**
 * His goals per quarter of an hour. A goal in added time counts in the quarter before it (its
 * minute is the last of the half), and a goal in extra time, after the 90th minute, falls away.
 * There is no card with fewer than 5 goals that have a minute.
 */
export function goalQuartersOf(seasons: readonly PlayerSeason[]): GoalQuarters | undefined {
  const goals = seasons.flatMap((season) => season.goalMoments)
  const known = goals.filter((goal) => goal.minute !== undefined)

  if (known.length < fewestGoals) {
    return undefined
  }

  const counts = quarters.map(() => 0)

  for (const { minute } of known) {
    if (minute !== undefined && minute <= 90) {
      const index = Math.min(5, Math.floor((Math.max(1, minute) - 1) / 15))

      counts[index] = (counts[index] ?? 0) + 1
    }
  }

  return { counts, total: goals.length, unknown: goals.length - known.length }
}

/**
 * The results of the matches he was in, from the line-ups (a place on the bench too, as the
 * table Per seizoen counts them). A match decided on penalties is a win or a loss
 * (`resultOf`). A player without a line-up has no card.
 */
export function playerRecordOf(seasons: readonly PlayerSeason[], goalkeeper: boolean): PlayerRecord | undefined {
  const matches = seasons.flatMap((season) => season.lineupMatches)

  if (matches.length === 0) {
    return undefined
  }

  const results = matches.map((match) => resultOf(match))
  const count = (wanted: string) => results.filter((result) => result === wanted).length

  return {
    draws: count('draw'),
    losses: count('loss'),
    title: goalkeeper ? 'Uitslagen met hem in het doel' : 'Uitslagen met hem in het veld',
    wins: count('win'),
  }
}

/**
 * The bars per season, the oldest first. An attacker, a midfielder and a player without a line
 * get his goals, when there are 5 or more in all. A defender gets the matches he played (as the
 * table Per seizoen counts them, a place on the bench too) and a goalkeeper the clean sheets,
 * both only with numbers from at least two seasons. A season without a number is left out.
 */
export function seasonBarsOf(seasons: readonly PlayerSeason[], line: PlayerPage['line']): SeasonBars | undefined {
  const kind: SeasonBarsKind = line === 'verdediger' ? 'played' : line === 'doelman' ? 'cleanSheets' : 'goals'
  const rows = [...seasons]
    .reverse()
    .flatMap((season) => (season[kind] === undefined ? [] : [{ season: season.season, value: season[kind] }]))

  if (kind === 'goals' ? rows.reduce((total, { value }) => total + value, 0) < fewestGoals : rows.length < 2) {
    return undefined
  }

  return { kind, rows, title: seasonTitles[kind] }
}
