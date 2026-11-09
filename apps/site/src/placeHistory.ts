import type { PlaceInRound } from './matches'

import { roundNumberOf } from './last-five'

/** One head coach with the rounds they led and our place then; `undefined` where not known. */
export type CoachLine = {
  coach: CoachOfLine
  /** The place after the first and after the last complete round of the coach. */
  places: undefined | { first: number; last: number }
  /** The first and the last round, `undefined` for a coach without a match in the season. */
  rounds: undefined | { first: number; last: number }
}

/** What the lines of the head coaches need of one coach, in the order they began. */
export type CoachOfLine = { interim: boolean; name: string; startDate: string }

/** What they need of a match: the competition, the round as the matches have it and the day. */
export type MatchOfCoach = { competition: string; matchDate: string; round: string }

/** A place in the table after a round, `null` for a round that is still open. */
type Places = readonly (null | PlaceInRound)[]

/**
 * The places and the rounds that get a number on the axes of the card: the first, the half and
 * the last place (1, 9 and 18 for 18 clubs), and the first round, a quarter, the half, three
 * quarters and the last round (1, 8, 17, 25 and 34 for 34 rounds), the steps rounded down.
 * A number that falls on the one before it is left out, so a short season has no double tick.
 */
export function axisTicks(clubs: number, rounds: number) {
  const spread = (last: number, parts: number) => {
    const wanted = [
      1,
      ...Array.from({ length: parts - 1 }, (_, index) => Math.floor((last * (index + 1)) / parts)),
      last,
    ]

    return wanted.filter((value, index) => value >= 1 && wanted.indexOf(value) === index)
  }

  return { places: spread(clubs, 2), rounds: spread(rounds, 4) }
}

/**
 * The rounds of each head coach, from the matches and not from dates: the first round of one
 * is the round of their first Eredivisie match, counting the matches from the day they began
 * until the day the next coach began. The last round is the one before the first round of the
 * next coach who has a match, or the last round of the season (`places.length`). A coach
 * without a match has no rounds and no places. The places are the ones after the first and
 * after the last complete round (not `null`) of the coach; without one they are `undefined`.
 */
export function coachLines(
  coaches: readonly CoachOfLine[],
  matches: readonly MatchOfCoach[],
  places: Places,
): CoachLine[] {
  const firstRounds = coaches.map((coach, index) => {
    const next = coaches[index + 1]
    const rounds = matches
      .filter(
        (match) =>
          match.competition === 'Eredivisie' &&
          match.matchDate >= coach.startDate &&
          (next === undefined || match.matchDate < next.startDate),
      )
      .map((match) => roundNumberOf(match.round))
      .filter((round) => round > 0)

    return rounds.length === 0 ? undefined : Math.min(...rounds)
  })

  return coaches.map((coach, index) => {
    const first = firstRounds[index]

    if (first === undefined) {
      return { coach, places: undefined, rounds: undefined }
    }

    const following = firstRounds.slice(index + 1).find((round) => round !== undefined)
    const last = following === undefined ? places.length : Math.max(first, following - 1)
    const complete = places.slice(first - 1, last).filter((place): place is PlaceInRound => place !== null)
    const start = complete[0]
    const end = complete.at(-1)

    return {
      coach,
      places: start === undefined || end === undefined ? undefined : { first: start.position, last: end.position },
      rounds: { first, last },
    }
  })
}

/**
 * The line under the name of a coach: `Ronde 1–12 · plek 5 → 9`. A coach who begins in the
 * middle and stays to the end has `Vanaf ronde 13`, one round is `Ronde 5`, the same place at
 * both ends is `plek 5`, and a coach without a complete round has no place. The card gives the
 * dash the word "t/m" and the arrow the word "naar" for a screen reader. Undefined for a coach
 * without a match.
 */
export function coachText({ places, rounds }: Pick<CoachLine, 'places' | 'rounds'>, lastRound: number) {
  if (rounds === undefined) {
    return undefined
  }

  const { first, last } = rounds
  const roundsText =
    last === lastRound && first > 1
      ? `Vanaf ronde ${first}`
      : first === last
        ? `Ronde ${first}`
        : `Ronde ${first}–${last}`

  if (places === undefined) {
    return roundsText
  }

  return places.first === places.last
    ? `${roundsText} · plek ${places.first}`
    : `${roundsText} · plek ${places.first} → ${places.last}`
}

/**
 * The highest and the lowest place of the season, each with all the rounds we were there. An
 * open round is never in it, so it breaks a stretch. Undefined without a round.
 */
export function extremesOfPlaces(places: Places) {
  const known = places.filter((place): place is PlaceInRound => place !== null)

  if (known.length === 0) {
    return undefined
  }

  const positions = known.map(({ position }) => position)
  const roundsAt = (position: number) => known.filter((place) => place.position === position).map(({ round }) => round)
  const highest = Math.min(...positions)
  const lowest = Math.max(...positions)

  return {
    highest: { position: highest, rounds: roundsAt(highest) },
    lowest: { position: lowest, rounds: roundsAt(lowest) },
  }
}

/**
 * The facts above the table, each a term and its description: the highest and the lowest place
 * with their rounds. A season with one place the whole time has one fact, `Plek`. Empty without
 * a round.
 */
export function placeLines(places: Places) {
  const extremes = extremesOfPlaces(places)

  if (extremes === undefined) {
    return []
  }

  const { highest, lowest } = extremes

  if (highest.position === lowest.position) {
    return [{ description: `${highest.position}, alle rondes`, term: 'Plek' }]
  }

  return [
    { description: `plek ${highest.position}, ${roundRanges(highest.rounds)}`, term: 'Hoogste' },
    { description: `plek ${lowest.position}, ${roundRanges(lowest.rounds)}`, term: 'Laagste' },
  ]
}

/**
 * The rounds as stretches of consecutive rounds: `[3, 6, 7, 10, 11]` is `ronde 3, 6–7 en
 * 10–11`, with an en dash. One round is "ronde 20". Only the first stretch has the word
 * "ronde".
 */
export function roundRanges(rounds: readonly number[]) {
  const stretches: [number, number][] = []

  for (const round of rounds) {
    const last = stretches.at(-1)

    if (last !== undefined && last[1] + 1 === round) {
      last[1] = round
    } else {
      stretches.push([round, round])
    }
  }

  const texts = stretches.map(([from, to]) => (from === to ? String(from) : `${from}–${to}`))
  const joined = texts.length > 1 ? `${texts.slice(0, -1).join(', ')} en ${texts.at(-1)}` : (texts[0] ?? '')

  return `ronde ${joined}`
}
