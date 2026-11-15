import { countryName } from '@fansite/design-system'

import { type CompetitionChoice } from './competition'
import { resultOf } from './match-result'
import { competitionGroups } from './match-search'
import { type AllMatch, playedMatchesOf } from './matches'

/**
 * What sc Heerenveen did against the clubs of one country in the European matches: the matches
 * played, the results and the goals, ours first. `country` is the code of two letters of the
 * club of the opponent as the club has it now (#1264), or `null` for the matches against clubs
 * of which we do not know the country.
 */
export type CountryTally = {
  country: null | string
  drawn: number
  goalsAgainst: number
  goalsFor: number
  lost: number
  played: number
  won: number
}

const europe: readonly string[] = competitionGroups.find(({ value }) => value === 'europa')?.members ?? []

/**
 * The tally of the played European matches (the competitions of `Europa`, without the
 * play-offs: those are matches against Dutch clubs, see #1282) per country of the opponent,
 * with the choice of competition of the page applied: a choice that is not Europa or all
 * competitions leaves no European match, so no card. The countries with the most matches come
 * first and, with as many, in the order of their name in Dutch. The matches against clubs
 * without a country are the last row, whatever their number, so the totals are those of the
 * row Europa of the card Per competitie. A shoot-out decides a win or a loss, as everywhere
 * (see `resultOf`).
 */
export function countryTalliesOf(matches: readonly AllMatch[], competition: CompetitionChoice = 'all'): CountryTally[] {
  const played = playedMatchesOf(matches, competition).filter((match) => europe.includes(match.competition))
  const perCountry = new Map<null | string, typeof played>()

  for (const match of played) {
    const country = match.opponentCountry === null ? null : match.opponentCountry.toUpperCase()

    perCountry.set(country, [...(perCountry.get(country) ?? []), match])
  }

  const nameOf = (country: string) => countryName(country) ?? country
  const tallies = [...perCountry].map(([country, own]): CountryTally => {
    const results = own.map((match) => resultOf(match))

    return {
      country,
      drawn: results.filter((result) => result === 'draw').length,
      goalsAgainst: own.reduce((sum, match) => sum + match.goalsAgainst, 0),
      goalsFor: own.reduce((sum, match) => sum + match.goalsFor, 0),
      lost: results.filter((result) => result === 'loss').length,
      played: own.length,
      won: results.filter((result) => result === 'win').length,
    }
  })

  return [
    ...tallies
      .filter(({ country }) => country !== null)
      .sort((a, b) => b.played - a.played || nameOf(a.country ?? '').localeCompare(nameOf(b.country ?? ''), 'nl')),
    ...tallies.filter(({ country }) => country === null),
  ]
}
