import type { PublicStandingsRow } from '@fansite/db/queries'
import type { KeyFigure } from '@fansite/design-system'

import type { CompetitionChoice } from './competition'
import type { HomeAwayTally } from './matches'

import { ourClub } from './match-page'

/** What the matches of each choice are called under the figures: "in de Eredivisie". */
const scopes: Record<CompetitionChoice, string> = {
  all: 'in alle competities',
  cup: 'in de Beker',
  europe: 'in Europa',
  league: 'in de Eredivisie',
}

/** A number in Dutch, with a point between the thousands. */
const numberText = (value: number) => value.toLocaleString('nl-NL')

/**
 * The key figures of Wedstrijden · Cijfers with all seasons: the matches played, how many we
 * won, drew and lost, and the goals for and against, all of the matches of the choice since
 * `since`, the first season we have matches of. There is no place, because a table is one
 * season's. Without a played match there is nothing to count, and there are no figures.
 */
export function allSeasonsKeyFigures(total: HomeAwayTally, choice: CompetitionChoice, since: string): KeyFigure[] {
  if (total.played === 0) {
    return []
  }

  return [
    {
      figure: numberText(total.played),
      label: total.played === 1 ? 'wedstrijd' : 'wedstrijden',
      note: `gespeeld ${scopes[choice]} sinds ${since}`,
    },
    {
      figure: `${numberText(total.won)}–${numberText(total.drawn)}–${numberText(total.lost)}`,
      label: 'gewonnen, gelijk, verloren',
      note: `${scopes[choice]} sinds ${since}`,
    },
    {
      figure: `${numberText(total.goalsFor)}–${numberText(total.goalsAgainst)}`,
      label: 'doelpunten',
      note: `voor en tegen ${scopes[choice]} sinds ${since}`,
    },
  ]
}

/**
 * The key figures at the top of Wedstrijden · Cijfers (#1210): our place in the Eredivisie, the
 * matches played, how many we won, drew and lost, and the goals for and against. The place is
 * the one of the table, whatever the choice of competition, and is left out when the table has
 * no row of us. The other three count the matches of the choice. Without a played match there
 * are no figures to count, so only the place is left, and a row of fewer than two is no row.
 */
export function statisticsKeyFigures(
  standings: readonly PublicStandingsRow[],
  total: HomeAwayTally,
  choice: CompetitionChoice,
): KeyFigure[] {
  const ours = standings.find((row) => row.club === ourClub && row.played > 0)
  const place: KeyFigure[] =
    ours === undefined ? [] : [{ figure: `${ours.position}e`, label: 'plek', note: 'in de Eredivisie' }]
  const counted: KeyFigure[] =
    total.played === 0
      ? []
      : [
          {
            figure: numberText(total.played),
            label: total.played === 1 ? 'wedstrijd' : 'wedstrijden',
            note: `gespeeld ${scopes[choice]}`,
          },
          {
            figure: `${total.won}–${total.drawn}–${total.lost}`,
            label: 'gewonnen, gelijk, verloren',
            note: scopes[choice],
          },
          {
            figure: `${numberText(total.goalsFor)}–${numberText(total.goalsAgainst)}`,
            label: 'doelpunten',
            note: `voor en tegen ${scopes[choice]}`,
          },
        ]
  const figures = [...place, ...counted]

  return figures.length < 2 ? [] : figures
}
