import type { PlaceInRound } from './matches'

/** A place in the table after a round, `null` for a round that is still open. */
type Places = readonly (null | PlaceInRound)[]

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
 * The lines above the table: the highest and the lowest place, and how far the place moved. A
 * season with one place the whole time has one line and no shift. Empty without a round.
 */
export function placeLines(places: Places) {
  const extremes = extremesOfPlaces(places)

  if (extremes === undefined) {
    return []
  }

  const { highest, lowest } = extremes

  if (highest.position === lowest.position) {
    return [`Plek: ${highest.position}, alle rondes`]
  }

  const shift = totalShift(places)

  return [
    `Hoogste: plek ${highest.position}, ${roundRanges(highest.rounds)}`,
    `Laagste: plek ${lowest.position}, ${roundRanges(lowest.rounds)}`,
    `Totaal verschoven: ${shift} ${shift === 1 ? 'plek' : 'plekken'}`,
  ]
}

/**
 * The rounds as stretches of consecutive rounds: `[3, 6, 7, 10, 11]` is `ronde 3, 6 t/m 7 en
 * 10 t/m 11`. One round is "ronde 20". Only the first stretch has the word "ronde".
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

  const texts = stretches.map(([from, to]) => (from === to ? String(from) : `${from} t/m ${to}`))
  const joined = texts.length > 1 ? `${texts.slice(0, -1).join(', ')} en ${texts.at(-1)}` : (texts[0] ?? '')

  return `ronde ${joined}`
}

/**
 * How far our place moved in the season: the sum of the differences between two complete rounds
 * that follow each other, without the sign. An open round between two of them does not matter:
 * the two complete rounds count.
 */
export function totalShift(places: Places) {
  const positions = places.filter((place): place is PlaceInRound => place !== null).map(({ position }) => position)

  return positions
    .slice(1)
    .reduce((sum, position, index) => sum + Math.abs(position - (positions[index] ?? position)), 0)
}
