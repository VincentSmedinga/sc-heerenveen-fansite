import {
  DataTable,
  GameStatusCard,
  KeyFigures,
  Match,
  tableColumns,
  tableLegend,
  Text,
  Winner,
} from '@fansite/design-system'

import type { GameCardData } from './game-card-data'

/** The card of one game on the page Fans: what everybody sees, and then what is yours. */
export function GameCard({ action, game, heading, lines, match, mine, ranking, tag, winner }: GameCardData) {
  return (
    <GameStatusCard action={action} game={game} heading={heading} tag={tag}>
      {match === undefined ? null : <Match {...match} />}
      {lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
      {winner === undefined ? null : (
        <>
          {winner.seal === undefined ? null : <Winner label="Uitblinker vorige wedstrijd" {...winner.seal} />}
          <Text appearance="meta">{winner.count}</Text>
        </>
      )}
      {mine?.lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
      {mine?.figures === undefined ? null : <KeyFigures figures={mine.figures} />}
      {ranking === undefined ? null : (
        <DataTable
          caption={ranking.caption}
          columns={['Fan', { ...tableColumns.points, key: true }]}
          legend={tableLegend([tableColumns.points])}
          rows={ranking.rows}
          sortable={false}
        />
      )}
    </GameStatusCard>
  )
}
