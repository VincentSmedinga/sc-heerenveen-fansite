import { Card, CardColumns, Heading, List, PlayerName, ShortFact, Text } from '@fansite/design-system'

import type { SquadChanges } from './squad-changes'

import { DataLine } from './DataLine'

/**
 * The card Mutaties on the page Spelers: who is new compared with the season before (Erin) and
 * who is no longer in the squad (Eruit), as two lists of names with their number in the
 * heading and a link to the page of a player who has one. The two parts stand side by side
 * when the card is wide enough (`CardColumns`). It gives no date, destination or reason: we
 * don't know them. When one of the two seasons is only nearly complete, the last line says a
 * name may be there by mistake.
 */
export function SquadChangesCard({ changes }: { changes: SquadChanges }) {
  const parts = [
    { id: 'erin', label: 'Erin', players: changes.arrived },
    { id: 'eruit', label: 'Eruit', players: changes.departed },
  ]

  return (
    <Card aria-labelledby="mutaties">
      <Heading id="mutaties" level={2}>
        Mutaties
      </Heading>
      <CardColumns>
        {parts.map((part) => (
          <Card as="div" key={part.id} surface="transparent">
            <Heading id={part.id} level={3}>
              {`${part.label} (${part.players.length})`}
            </Heading>
            {part.players.length === 0 ? (
              <Text>Niemand.</Text>
            ) : (
              <List aria-labelledby={part.id} role="list">
                {part.players.map((player) => (
                  <List.Item key={player.key}>
                    <ShortFact>
                      <PlayerName givenName={player.givenName} href={player.href} surname={player.surname} />
                    </ShortFact>
                  </List.Item>
                ))}
              </List>
            )}
          </Card>
        ))}
      </CardColumns>
      <DataLine
        limits={[
          changes.incomplete.length > 0 &&
            `Van ${changes.incomplete.join(' en ')} missen we waarschijnlijk een paar spelers, ` +
              'dus een naam kan hier ten onrechte staan.',
        ]}
      />
    </Card>
  )
}
