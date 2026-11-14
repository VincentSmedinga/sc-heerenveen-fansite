import { listSeasonPlayerBirths } from '@fansite/db/queries'
import { seasonOf } from '@fansite/db/season'

import { cacheForKey } from './cache'
import { getDatabase } from './database'
import { ageOf } from './player-page'
import { cardPlayers, type SeasonSquad, showsPlayers } from './season-squad'

/** A player of the card as the figures need him: the age of today and the country. */
export type SquadFigure = { age: number | undefined; country: null | string | undefined }

/**
 * The figures of the card "De selectie in het kort": how many players the card Selectie shows,
 * from how many countries, and, in the current season, how old they are. `ages` is absent when
 * the card leaves the three lines with an age out, and `countries` when nobody has a country.
 * `basis` is set when the figures rest on fewer players than the card shows: the number of
 * players the smallest basis has, and how many players there are.
 */
export type SquadSummary = {
  ages?: { average: number; oldest: number; youngest: number }
  basis?: { known: number; total: number }
  countries?: number
  players: number
}

/** The share of the players who need an age before the card shows the lines with an age. */
const enoughAges = 3 / 4

/**
 * The figures of the card from its players. `withAges` is false in a season that is over: an
 * age of today says nothing about the players of that season. The lines with an age need an age
 * for at least three quarters of the players. When some players lack an age or a country the
 * figures use, `basis` names the smallest number of players the figures rest on. Nobody with a
 * country: no `countries`. No players: undefined, which is no card.
 */
export function squadSummary(figures: readonly SquadFigure[], withAges: boolean): SquadSummary | undefined {
  const total = figures.length

  if (total === 0) {
    return undefined
  }

  const ages = figures.flatMap(({ age }) => (age === undefined ? [] : [age]))
  const countries = new Set(
    figures.flatMap(({ country }) => (country === null || country === undefined ? [] : [country])),
  )
  const countryKnown = figures.filter(({ country }) => country !== null && country !== undefined).length
  const showsAges = withAges && ages.length > 0 && ages.length >= total * enoughAges
  // What each shown line rests on: the smallest of them is the number the sentence names.
  const rests = [...(countryKnown > 0 ? [countryKnown] : []), ...(showsAges ? [ages.length] : [])]
  const known = Math.min(...rests, total)

  return {
    ...(showsAges
      ? {
          ages: {
            average: ages.reduce((sum, age) => sum + age, 0) / ages.length,
            oldest: Math.max(...ages),
            youngest: Math.min(...ages),
          },
        }
      : {}),
    ...(known < total ? { basis: { known, total } } : {}),
    ...(countryKnown > 0 ? { countries: countries.size } : {}),
    players: total,
  }
}

/** How long the dates of birth are kept, like the squad itself (see `season-squad.ts`). */
const keptFor = 5 * 60 * 1000

async function loadBirths(season: string) {
  const { db } = getDatabase()

  return new Map((await listSeasonPlayerBirths(db, season)).map(({ name, ...birth }) => [name, birth]))
}

const seasonBirths = cacheForKey(keptFor, loadBirths)

/**
 * The figures of the card for a season, or undefined when the card has no figures: the squad is
 * not known. Ages are worked out only for the current season, on the day of today in the
 * Netherlands (`ageOf`, as the page of a player does). The dates of birth stay in this
 * function: only the figures leave it.
 */
export async function getSquadSummary(squad: SeasonSquad, season: string, today: Date) {
  if (!showsPlayers(squad)) {
    return undefined
  }

  const withAges = season === seasonOf(today)
  const births = withAges ? await seasonBirths(season) : new Map()

  return squadSummary(
    cardPlayers(squad).map((player) => {
      const birth = births.get(player.name)

      return { age: birth === undefined ? undefined : ageOf(birth, today), country: player.country }
    }),
    withAges,
  )
}
