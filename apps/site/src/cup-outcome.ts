import type { PublicMatch } from '@fansite/db/queries'

/** How a season of the cup ended for sc Heerenveen, when it is known (#1397). */
export type CupOutcome = { kind: 'lost'; line: string } | { kind: 'won' }

type CupMatch = Pick<
  PublicMatch,
  'competition' | 'goalsAgainst' | 'goalsFor' | 'matchDate' | 'penaltiesAgainst' | 'penaltiesFor' | 'round' | 'status'
>

/** The rounds that have a name we can put in a sentence; `Wedstrijd 6` has not. */
const roundNames = /^(?:(?:Eerste|Tweede|Derde|Vierde|Vijfde) ronde|Achtste finale|Kwartfinale|Halve finale|Finale)$/u

/**
 * How the cup ended for us in a season: `won` when the last match is a won final, and a line
 * such as "Uitgeschakeld in de achtste finale" when the last match is a lost one in a round
 * we can name (a lost final says "Verloren in de finale"). Undefined while the cup is still
 * going (a match that is not played yet), when the last result is missing, and for a round
 * without a name, such as `Wedstrijd 6` of the old matches. A season without cup matches has
 * no outcome.
 */
export function cupOutcomeOf(matches: readonly CupMatch[]): CupOutcome | undefined {
  const cup = matches
    .filter((match) => match.competition === 'KNVB Beker')
    .toSorted((a, b) => a.matchDate.localeCompare(b.matchDate))
  const last = cup.at(-1)

  if (last === undefined || last.status !== 'played' || !roundNames.test(last.round)) {
    return undefined
  }

  const won = wonBy(last)

  if (won === undefined) {
    return undefined
  }
  if (won) {
    return last.round === 'Finale' ? { kind: 'won' } : undefined
  }

  return {
    kind: 'lost',
    line: last.round === 'Finale' ? 'Verloren in de finale' : `Uitgeschakeld in de ${last.round.toLowerCase()}`,
  }
}

/**
 * Whether sc Heerenveen won a played match: on the goals, and when those are level, on the
 * shoot-out. Undefined when the result is missing, or level without a shoot-out.
 */
function wonBy(match: CupMatch): boolean | undefined {
  if (match.goalsFor === null || match.goalsAgainst === null) {
    return undefined
  }
  if (match.goalsFor !== match.goalsAgainst) {
    return match.goalsFor > match.goalsAgainst
  }
  if (match.penaltiesFor === null || match.penaltiesAgainst === null || match.penaltiesFor === match.penaltiesAgainst) {
    return undefined
  }

  return match.penaltiesFor > match.penaltiesAgainst
}
