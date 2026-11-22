import type { ReportedPlayerName } from '@fansite/db/match-reports'

import { Card, DataTable, type DataTableRow, GameHeading, PlayerName, Text, Winner } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { reasonOf } from '#src/errors'
import { type MatchRatings, oldMatchRatings, type RatedPlayer, ratingMinimum } from '#src/fans/match-ratings'
import { nameOfPlayer } from '#src/report-view'

// The card Uitblinker on the page of an old match (issue 1467): the ratings that visitors of
// the old fansite gave, with the Uitblinker of the match in a seal.

/** A grade with a decimal comma: `7,8`. */
const gradeText = (value: number) => value.toFixed(1).replace('.', ',')

/** The ratings of an old match, or nothing while the game is off. */
export async function loadOldMatchRatings(match: { id: number }): Promise<MatchRatings | undefined> {
  return isFansPartOn('uitblinker') ? oldMatchRatings(match.id) : undefined
}

/**
 * The card Uitblinker: the heading with "Van supporters" beside it, the seal of the Uitblinker
 * of the match (not when nobody has enough ratings), the table of the players in the order of
 * the line-up, and the source.
 */
export function OldMatchRatingsCard({
  names,
  ratings,
}: {
  names: ReadonlyMap<number, ReportedPlayerName>
  ratings: MatchRatings
}) {
  const { players, winner } = ratings

  return (
    <Card aria-labelledby="uitblinker-supporters" game="uitblinker">
      <GameHeading id="uitblinker-supporters" level={2} meta="Van supporters">
        Uitblinker
      </GameHeading>
      {winner === undefined ? null : (
        <Winner
          average={gradeText(winner.average)}
          label="Uitblinker van de wedstrijd"
          line={`Gemiddelde van ${winner.count} cijfers`}
          name={winner.name}
        />
      )}
      <DataTable
        caption="Cijfers van supporters per speler"
        columns={['Speler', { key: true, name: 'Gem' }, { name: 'Cijfers' }]}
        rows={players.map((player) => rowOf(player, winner, names))}
        sortable={false}
      />
      <Text appearance="meta">Cijfers van bezoekers van de Fansite, 2001 tot 2007.</Text>
    </Card>
  )
}

/** The ratings of an old match. A failed reading leaves the card out and logs it. */
export async function readOldMatchRatings(match: { id: number }) {
  try {
    return await loadOldMatchRatings(match)
  } catch (error) {
    console.error(`Could not read what supporters rated at old match ${match.id}: ${reasonOf(error)}`)

    return undefined
  }
}

function rowOf(
  player: RatedPlayer,
  winner: RatedPlayer | undefined,
  names: ReadonlyMap<number, ReportedPlayerName>,
): DataTableRow {
  const known = player.appearanceId === null ? undefined : names.get(player.appearanceId)
  const name = nameOfPlayer(player.name, known)

  return {
    cells: [player.count >= ratingMinimum ? gradeText(player.average) : 'nog te weinig cijfers', player.count],
    display: <PlayerName {...name} />,
    header: player.name,
    // In words and on a line of its own: a label in the cell is too wide for the narrow column.
    ...(winner?.playerId === player.playerId ? { secondary: 'Uitblinker' } : {}),
  }
}
