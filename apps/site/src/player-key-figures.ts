import type { KeyFigure } from '@fansite/design-system'

import type { PlayerPage } from './player-page'
import type { PlayerSeason } from './player-seasons'

/** The figures a player can have in the row, in the words of the page. */
type FigureId = 'assists' | 'cleanSheets' | 'concededPerMatch' | 'goals' | 'matches' | 'seasons'

/** The figures of each line in the order the row shows them (#1083); `none` has no line. */
const figuresByLine: Record<'none' | NonNullable<PlayerPage['line']>, readonly FigureId[]> = {
  aanvaller: ['goals', 'seasons', 'matches', 'assists'],
  doelman: ['matches', 'cleanSheets', 'concededPerMatch', 'seasons'],
  middenvelder: ['matches', 'goals', 'assists', 'seasons'],
  none: ['seasons', 'goals', 'matches'],
  verdediger: ['matches', 'cleanSheets', 'goals', 'seasons'],
}

/** A number in Dutch: with a decimal comma, and the decimals only where there are some. */
const numberText = (value: number, decimals = 0) =>
  value.toLocaleString('nl-NL', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })

/** A noun in the singular or the plural. */
const noun = (count: number, one: string, many: string) => (count === 1 ? one : many)

/**
 * The key figures of a player for the row under his name (#1083): three or four, by his line,
 * from the seasons of `loadPlayerSeasons`. A figure we have of no season falls away, and the
 * line under a figure says what it counts. Fewer than two figures is no row.
 */
export function playerKeyFigures(seasons: readonly PlayerSeason[], line: PlayerPage['line']): KeyFigure[] {
  const goalkeeper = line === 'doelman'
  const figures = (figuresByLine[line ?? 'none'] as readonly FigureId[]).flatMap((id): KeyFigure[] => {
    switch (id) {
      case 'assists': {
        const total = sumOf(seasons, (season) => season.assists)

        return total === undefined
          ? []
          : [
              {
                figure: numberText(total),
                label: noun(total, 'assist', 'assists'),
                note: scopeNote(seasons, (s) => s.assists),
              },
            ]
      }
      case 'cleanSheets': {
        const total = sumOf(seasons, (season) => season.cleanSheets)

        return total === undefined
          ? []
          : [
              {
                figure: numberText(total),
                label: 'keer de nul',
                note: `${goalkeeper ? '' : 'met hem in de basis, '}${scopeNote(seasons, (s) => s.cleanSheets)}`,
              },
            ]
      }
      case 'concededPerMatch': {
        // The matches that the goals conceded belong to: only the seasons that have both.
        const both = seasons.filter((season) => season.conceded !== undefined && season.played !== undefined)
        const matches = sumOf(both, (season) => season.played)
        const conceded = sumOf(both, (season) => season.conceded)

        return matches === undefined || matches === 0 || conceded === undefined
          ? []
          : [
              {
                figure: numberText(conceded / matches, 2),
                label: 'tegendoelpunten',
                note: `per wedstrijd, ${scopeNote(seasons, (s) => s.conceded)}`,
              },
            ]
      }
      case 'goals': {
        const total = sumOf(seasons, (season) => season.goals)

        return total === undefined
          ? []
          : [
              {
                figure: numberText(total),
                label: noun(total, 'doelpunt', 'doelpunten'),
                note: scopeNote(seasons, (s) => s.goals),
              },
            ]
      }
      case 'matches': {
        const total = sumOf(seasons, (season) => season.played)

        return total === undefined
          ? []
          : [
              {
                figure: numberText(total),
                label: noun(total, 'wedstrijd', 'wedstrijden'),
                note: scopeNote(seasons, (s) => s.played),
              },
            ]
      }
      case 'seasons':
        return seasons.length === 0
          ? []
          : [
              {
                figure: numberText(seasons.length),
                label: noun(seasons.length, 'seizoen', 'seizoenen'),
                note: periodNote(seasons),
              },
            ]
    }
  })

  return figures.length < 2 ? [] : figures
}

/**
 * The first and last year of the seasons, as "tussen 2002 en 2012", or "in 2004/05" for one
 * season. The seasons are newest first, as the module has them.
 */
function periodNote(seasons: readonly PlayerSeason[]) {
  const names = seasons.map((season) => season.season).sort()
  const first = names[0] ?? ''
  const last = names.at(-1) ?? ''

  return first === last ? `in ${first}` : `tussen ${first.slice(0, 4)} en ${(Number(last.slice(0, 4)) + 1).toString()}`
}

/**
 * What a figure that is not known of every season counts, in words. A figure that every season
 * has says "in alle competities" when the line-ups give it, and what the table of Wikipedia
 * leaves out when that gives it; a figure that only some seasons have says which.
 */
function scopeNote(seasons: readonly PlayerSeason[], pick: (season: PlayerSeason) => number | undefined) {
  const known = seasons.filter((season) => pick(season) !== undefined)

  if (known.length < seasons.length) {
    return `in ${known.length} van de ${seasons.length} seizoenen`
  }
  if (known.some((season) => season.source === 'wikipedia')) {
    return 'uit de tabel van Wikipedia, niet alle competities'
  }
  if (known.some((season) => season.source === 'some-lineups')) {
    return 'uit de wedstrijden met een opstelling'
  }

  return 'in alle competities'
}

/** The sum of a figure over the seasons that have it, or `undefined` when none has it. */
function sumOf(seasons: readonly PlayerSeason[], pick: (season: PlayerSeason) => number | undefined) {
  const values = seasons.map(pick).filter((value) => value !== undefined)

  return values.length === 0 ? undefined : values.reduce((total, value) => total + value, 0)
}
