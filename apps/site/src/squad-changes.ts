import { listSeasonPlayerPersons } from '@fansite/db/queries'

import { cacheForKey } from './cache'
import { getDatabase } from './database'
import { cardPlayers, getSeasonSquad, type SeasonSquad, squadParts, type SquadPlayer } from './season-squad'

/** One season as the comparison needs it. */
export type ComparedSeason = { persons: readonly RowPerson[]; season: string; squad: SeasonSquad }

/**
 * Who a row of a season is: the name we show for it, the name of its source, which tells the
 * rows of a season apart, and the person behind it, if there is one.
 */
export type RowPerson = { name: string; personId: null | number; sourceName: string }

/**
 * The card Veranderingen in de selectie: who is new compared with the season before and who is
 * no longer there, each in the order of the card Selectie. `incomplete` has the seasons of the
 * two that are nearly complete, the older one first. `source` is where the squad of the season
 * before comes from, for the credit of the page.
 */
export type SquadChanges = {
  arrived: SquadPlayer[]
  departed: SquadPlayer[]
  incomplete: string[]
  previous: string
  source: { pages: SeasonSquad['pages']; wikidata: boolean }
}

/** How long the persons of a season are kept, like the squad itself (see `season-squad.ts`). */
const keptFor = 5 * 60 * 1000

async function loadPersons(season: string) {
  return listSeasonPlayerPersons(getDatabase().db, season)
}

const seasonPersons = cacheForKey(keptFor, loadPersons)

/**
 * The changes of a season compared with the one before, or undefined: no card. Both squads have
 * to say enough (`saysEnough`), and the season before has to be one of the site (`seasons`).
 */
export async function getSquadChanges(
  squad: SeasonSquad,
  season: string,
  seasons: readonly string[],
): Promise<SquadChanges | undefined> {
  const previous = seasonBefore(season)

  if (!saysEnough(squad) || !seasons.includes(previous)) {
    return undefined
  }

  const before = await getSeasonSquad(previous)

  if (!saysEnough(before)) {
    return undefined
  }

  const [persons, personsBefore] = await Promise.all([seasonPersons(season), seasonPersons(previous)])

  return squadChanges({ persons, season, squad }, { persons: personsBefore, season: previous, squad: before })
}

/**
 * Whether the list of a season says enough to count it or to compare it: its stored level is
 * `bijna` or `compleet` (a mark of the editors gives `compleet`).
 */
export function saysEnough({ completeness }: SeasonSquad) {
  return completeness?.level === 'bijna' || completeness?.level === 'compleet'
}

/** The season before a season: `1999/00` follows `1998/99`. */
export function seasonBefore(season: string) {
  const year = Number(season.slice(0, 4))

  return `${year - 1}/${String(year).slice(2)}`
}

/**
 * Compares two seasons. A player of the card Selectie of one season is a change when no row of
 * the other season is that player, whatever its source: a player who is only in our reports in
 * one of them is not new and not gone. `in_squad` and `left_squad_at` play no part.
 */
export function squadChanges(current: ComparedSeason, before: ComparedSeason): SquadChanges {
  return {
    arrived: onlyIn(current, before),
    departed: onlyIn(before, current),
    incomplete: [before, current]
      .filter(({ squad }) => squad.completeness?.level === 'bijna')
      .map(({ season }) => season),
    previous: before.season,
    source: {
      pages: before.squad.pages,
      wikidata: before.squad.players.some((player) => player.source === 'wikidata'),
    },
  }
}

/**
 * The players on the card Selectie of `season` who have no row in `other`, in the order of that
 * card. Two rows are the same player when their person is the same, and, when one of the two
 * has no person, when a name of theirs is: the one we show or that of the source.
 */
function onlyIn(season: ComparedSeason, other: ComparedSeason) {
  const personOf = new Map(season.persons.map((row) => [row.sourceName, row.personId]))
  const people = new Set(other.persons.map((row) => row.personId))
  const players = cardPlayers(season.squad).filter(({ name, sourceName }) => {
    const person = personOf.get(sourceName) ?? null

    if (person !== null && people.has(person)) return false

    const namesakes = other.persons.filter((row) =>
      [row.name, row.sourceName].some((one) => one === name || one === sourceName),
    )

    // A row with the same name is the same player, unless both have a person of their own.
    return namesakes.every((row) => person !== null && row.personId !== null)
  })

  return squadParts(players).flatMap((part) => part.players)
}
