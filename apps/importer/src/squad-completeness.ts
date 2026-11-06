// How likely it is that the list of players of a season holds everyone who was in the squad,
// also those who did not play. It is an estimate and never a measured truth. The rule starts
// at the ceiling of the best source the season has, because a source can only know so much (a
// table of who played does not know the bench), and the checks only ever lower that number. A
// check that cannot run changes nothing, so we claim no more than we can check. The numbers
// come from a measurement on ten seasons with a table of the whole squad
// (docs/volledigheid-selectie.md).
// The function reads nothing and asks nothing: the caller gives it the facts of one season.
import type { PlayerSource } from '@fansite/db/schema'

import { nameKey } from './read-squad.ts'

export type CompletenessCheck = {
  /** What the check found, in one sentence. */
  detail: string
  name: CompletenessCheckName
  /** `unavailable`: the check could not run, so it changed nothing. */
  outcome: 'failed' | 'passed' | 'unavailable'
}

export type CompletenessCheckName = 'goals' | 'matches' | 'scorers' | 'size'

export type CompletenessLevel = 'bijna' | 'compleet' | 'deels' | 'onbekend' | 'weinig'

export type CompletenessPlayer = { name: string; personId: null | number }

export type CompletenessScorer = {
  goals: number
  name: string
  personId: null | number
}

export type SquadCompleteness = {
  checks: CompletenessCheck[]
  level: CompletenessLevel
  /** A whole number from 0 to 100. */
  probability: number
}

export type SquadCompletenessInput = {
  /** The goals the table of the season gave added up, or null when it gave none. */
  goalsTotal: null | number
  /** The matches the table of the season gave added up, or null when it gave none. */
  matchesTotal: null | number
  /** The players of the season, as they are stored. */
  players: CompletenessPlayer[]
  /** How many players each source gave, such as `{ selectie: 27 }` (`playerSources`). */
  playersPerSource: Partial<Record<PlayerSource, number>>
  /**
   * The players who scored for us in `match_goals` this season, own goals left out, or null
   * when the season has no goals in the database.
   */
  scorers: CompletenessScorer[] | null
}

/**
 * What a source can know, as the chance that its list is the whole squad. The order is the
 * order of the sources, from the most to the least complete; a test fixes it.
 */
export const sourceCeilings: Record<PlayerSource, number> = {
  doelpunten: 30,
  engels: 70,
  selectie: 95,
  statistieken: 60,
  transfers: 40,
  wikidata: 50,
}

/** A squad of fewer players than this is rarely whole: the measured seasons have 22 to 36. */
export const smallSquad = 20

/** A squad of fewer players than this is a few names of a squad. */
export const tinySquad = 15

/** A table of who played has at least eleven players in each of the 34 matches. */
export const minimumMatches = 11 * 34

/** The most a check that failed leaves of the probability, so the level drops below `bijna`. */
const failedCap = 45

/** The most that one missing scorer leaves: a proven gap, so below `bijna`. */
const scorerCap = 50

type Checked = { cap: number; check: CompletenessCheck }

/** The level of a probability: `compleet` from 80, `bijna` from 55, `deels` from 25. */
export function levelOf(probability: number): CompletenessLevel {
  if (probability >= 80) {
    return 'compleet'
  }
  if (probability >= 55) {
    return 'bijna'
  }
  if (probability >= 25) {
    return 'deels'
  }
  return probability >= 1 ? 'weinig' : 'onbekend'
}

export function squadCompleteness(input: SquadCompletenessInput): SquadCompleteness {
  const count = input.players.length
  const sources = (Object.keys(sourceCeilings) as PlayerSource[]).filter(
    (source) => (input.playersPerSource[source] ?? 0) > 0,
  )

  if (count === 0 || sources.length === 0) {
    return { checks: [], level: 'onbekend', probability: 0 }
  }

  let probability = Math.max(...sources.map((source) => sourceCeilings[source]))
  const checks = [sizeCheck(count), scorersCheck(input), matchesCheck(input, sources), goalsCheck(input)]

  for (const { cap, check } of checks) {
    if (check.outcome === 'failed') {
      probability = Math.min(probability, cap)
    }
  }
  probability = Math.round(Math.max(1, probability))

  return { checks: checks.map(({ check }) => check), level: levelOf(probability), probability }
}

function failed(name: CompletenessCheckName, cap: number, detail: string): Checked {
  return { cap, check: { detail, name, outcome: 'failed' } }
}

function goalsCheck({ goalsTotal, scorers }: SquadCompletenessInput): Checked {
  const name = 'goals'

  if (goalsTotal === null || scorers === null) {
    return unavailable(name, 'the table gives no goals, or the season has none in the database')
  }

  const ours = scorers.reduce((total, scorer) => total + scorer.goals, 0)

  return goalsTotal < ours
    ? failed(name, failedCap, `the table adds up to ${goalsTotal} goals and we have ${ours} of ours`)
    : passed(name, `the table adds up to ${goalsTotal} goals and we have ${ours} of ours`)
}

function matchesCheck({ matchesTotal }: SquadCompletenessInput, sources: PlayerSource[]): Checked {
  const name = 'matches'

  // Only a list of who played adds up to a number of matches that can be too small.
  if (!sources.includes('statistieken') || matchesTotal === null) {
    return unavailable(name, 'the table of who played gives no matches')
  }

  return matchesTotal < minimumMatches
    ? failed(name, failedCap, `the matches add up to ${matchesTotal}, fewer than ${minimumMatches}`)
    : passed(name, `the matches add up to ${matchesTotal}, at least ${minimumMatches}`)
}

function passed(name: CompletenessCheckName, detail: string): Checked {
  return { cap: 100, check: { detail, name, outcome: 'passed' } }
}

function scorersCheck({ players, scorers }: SquadCompletenessInput): Checked {
  const name = 'scorers'

  if (scorers === null || scorers.length === 0) {
    return unavailable(name, 'the season has no scorers of ours in the database')
  }

  const persons = new Set(players.flatMap((player) => (player.personId === null ? [] : [player.personId])))
  const names = new Set(players.map((player) => nameKey(player.name)))
  // A scorer is in the list by his person or by his name: English squads have no persons.
  const found = scorers.filter(
    (scorer) => (scorer.personId !== null && persons.has(scorer.personId)) || names.has(nameKey(scorer.name)),
  ).length
  const detail = `${found} of the ${scorers.length} scorers of ours are in the list`

  if (found === scorers.length) {
    return passed(name, detail)
  }

  // One scorer who is missing proves a gap. More missing scorers make a lower chance.
  return failed(name, Math.max(5, Math.round((scorerCap * found) / scorers.length)), detail)
}

function sizeCheck(count: number): Checked {
  const detail = `the list has ${count} players, a squad has ${smallSquad} or more`

  if (count < tinySquad) {
    return failed('size', 20, detail)
  }
  return count < smallSquad ? failed('size', failedCap, detail) : passed('size', detail)
}

function unavailable(name: CompletenessCheckName, detail: string): Checked {
  return { cap: 100, check: { detail, name, outcome: 'unavailable' } }
}
