/*
 * The worked examples of the game Fjouwer (issue 1477): players in a match, with what they
 * did and the points they come to. The rules page shows them, and the tests of the scoring
 * check each one, so an example cannot disagree with the sum. The points on the page come from
 * `fantasyPoints`, not from the `points` here: this number is what the example must come to.
 */

import type { FantasyFacts, FantasyLine } from './fantasy-points.ts'

/** What a player did in an example, without the line: that is given next to it. */
export type ExampleFacts = Partial<FantasyFacts> & { line: FantasyLine }

/** One player in an example: who, in words, what he did, and the points it must come to. */
export type FantasyExample = {
  facts: ExampleFacts
  /** The player in words: "Een middenvelder van 72 minuten met een assist". */
  name: string
  /** The points the example must come to. */
  points: number
}

/** The facts with the defaults of a player who played the whole match without incident. */
export const exampleFacts = (more: ExampleFacts): FantasyFacts => ({
  assists: 0,
  cleanSheet: false,
  goals: 0,
  minutes: 90,
  ownGoals: 0,
  red: false,
  yellow: false,
  ...more,
})

/** A whole match, four players: the goalkeeper, a defender, a midfielder and an attacker. */
export const fullMatchExample: readonly FantasyExample[] = [
  { facts: { cleanSheet: false, line: 'doelman' }, name: 'Doelman, 90 minuten, één tegendoelpunt', points: 5 },
  {
    facts: { line: 'verdediger', ownGoals: 1 },
    name: 'Verdediger, 90 minuten, een eigen doelpunt dat het enige tegendoelpunt was',
    points: 0,
  },
  {
    facts: { assists: 1, line: 'middenvelder', minutes: 72 },
    name: 'Middenvelder, gewisseld na 72 minuten, een assist',
    points: 13,
  },
  {
    facts: { goals: 2, line: 'aanvaller', yellow: true },
    name: 'Aanvaller, 90 minuten, twee doelpunten en een gele kaart',
    points: 22,
  },
]

/** The totals of a whole match: what the four came to together. */
export const fullMatchTotal = 40

/** The cards: a red card replaces the yellow, also when it comes after two yellow cards. */
export const cardExamples: readonly FantasyExample[] = [
  {
    facts: { line: 'middenvelder', minutes: 30, red: true },
    name: 'Middenvelder, 30 minuten, een rode kaart',
    points: -6,
  },
  {
    facts: { line: 'aanvaller', minutes: 70, red: true, yellow: true },
    name: 'Aanvaller, 70 minuten, twee gele kaarten en dus rood',
    points: -3,
  },
  {
    facts: { line: 'verdediger', minutes: 30, ownGoals: 1, red: true },
    name: 'Verdediger, 30 minuten, een eigen doelpunt en een rode kaart',
    points: -11,
  },
]

/** The minutes and the goal against: where the line of 60 minutes and the whole match count. */
export const minutesExamples: readonly FantasyExample[] = [
  {
    facts: { cleanSheet: true, line: 'doelman' },
    name: 'Doelman, 90 minuten, geen tegendoelpunt',
    points: 13,
  },
  {
    facts: { goals: 1, line: 'verdediger', minutes: 55 },
    name: 'Verdediger, 55 minuten, een doelpunt',
    points: 17,
  },
  {
    facts: { cleanSheet: true, line: 'verdediger', minutes: 59 },
    name: 'Verdediger, 59 minuten, geen tegendoelpunt',
    points: 2,
  },
  { facts: { line: 'aanvaller', minutes: 0 }, name: 'Invaller die niet inviel', points: 0 },
]
