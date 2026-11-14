import type { PlayerPosition } from '@fansite/db/schema'

import type { ScoredMatch } from './matches'

import { type CompetitionChoice, countsFor } from './competition'
import { nameOfCountry } from './players-overview'

/** One bar of a card: what it counts, its name in words, and the goals. */
export type GoalGroup = { goals: number; key: string; name: string }

/** The groups of a card, and how many goals they rest on out of all that count. */
export type GoalGroups = {
  /** The goals that have the trait: the groups hold some of them when the card shows a few. */
  counted: number
  groups: GoalGroup[]
  /** All the goals of ours that count, with a person or not. */
  total: number
}

/** What we know of a person for the cards Doelpunten per linie and Doelpunten per land. */
export type PersonTraits = { country: null | string; line: null | PlayerPosition }

/** The lines in the order the card shows them, with their name in the plural. */
export const lines = [
  ['aanvaller', 'Aanvallers'],
  ['middenvelder', 'Middenvelders'],
  ['verdediger', 'Verdedigers'],
  ['doelman', 'Doelmannen'],
] as const satisfies readonly (readonly [PlayerPosition, string])[]

/** How many countries the card Doelpunten per land shows. */
export const countriesShown = 5

/**
 * The goals by the country of the player who scored them: the `countriesShown` countries with
 * the most goals, the most first and by name when level. A goal without a person, or of a
 * person without a country, is in `total` and not in `counted`. `counted` counts the goals of
 * every country, not only the five shown.
 */
export function goalsByCountryOf(
  matches: readonly Pick<ScoredMatch, 'competition' | 'goals'>[],
  choice: CompetitionChoice,
  traits: ReadonlyMap<number, PersonTraits>,
): GoalGroups {
  const goals = countedGoals(matches, choice)
  const perCountry = new Map<string, number>()

  for (const person of goals) {
    const country = person === undefined ? undefined : traits.get(person)?.country

    if (country !== undefined && country !== null) {
      perCountry.set(country, (perCountry.get(country) ?? 0) + 1)
    }
  }

  const all = [...perCountry].map(([key, count]) => ({ goals: count, key, name: nameOfCountry(key) }))

  return {
    counted: all.reduce((sum, group) => sum + group.goals, 0),
    groups: all.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'nl')).slice(0, countriesShown),
    total: goals.length,
  }
}

/**
 * The goals by the line of the player who scored them, in the order of `lines`; a line without
 * goals is left out. A goal without a person, or of a person without a line, is in `total` and
 * not in `counted`.
 */
export function goalsByLineOf(
  matches: readonly Pick<ScoredMatch, 'competition' | 'goals'>[],
  choice: CompetitionChoice,
  traits: ReadonlyMap<number, PersonTraits>,
): GoalGroups {
  const goals = countedGoals(matches, choice)
  const lineOf = (person: number | undefined) => (person === undefined ? undefined : traits.get(person)?.line)
  const groups = lines.flatMap(([line, name]) => {
    const count = goals.filter((person) => lineOf(person) === line).length

    return count === 0 ? [] : [{ goals: count, key: line, name }]
  })

  return { counted: groups.reduce((sum, group) => sum + group.goals, 0), groups, total: goals.length }
}

/**
 * The goals of ours that count, as the list of scorers counts them (`topScorersOf`): a goal of
 * ours that is not an own goal, in a match of the chosen competition. An own goal of the
 * opponent and a goal of the opponent are left out. Each goal goes with the id of its person,
 * or undefined for a goal without one.
 */
function countedGoals(matches: readonly Pick<ScoredMatch, 'competition' | 'goals'>[], choice: CompetitionChoice) {
  return matches
    .filter((match) => countsFor(match.competition, choice))
    .flatMap((match) => match.goals)
    .filter((goal) => goal.ours && !goal.ownGoal)
    .map((goal) => goal.personId ?? undefined)
}
