import { Card, Heading, List, PlayerName, ShortFact, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import type { SquadChanges } from './squad-changes'

import { DataLine } from './DataLine'

/**
 * The card Veranderingen in de selectie on the page Spelers: who is new compared with the
 * season before and who is no longer in the squad, as two lists of names with a link to the
 * page of a player who has one. It gives no date, destination or reason: we don't know them.
 * When one of the two seasons is only nearly complete, the last line says a name may be there
 * by mistake.
 */
export function SquadChangesCard({ changes }: { changes: SquadChanges }) {
  const parts = [
    { id: 'nieuw-in-de-selectie', label: 'Nieuw', players: changes.arrived },
    { id: 'niet-meer-in-de-selectie', label: 'Niet meer in de selectie', players: changes.departed },
  ]

  return (
    <Card aria-labelledby="veranderingen-in-de-selectie" surface="soft">
      <Heading id="veranderingen-in-de-selectie" level={2}>
        Veranderingen in de selectie
      </Heading>
      <Text>{`Vergeleken met ${changes.previous}.`}</Text>
      {parts.map((part) => (
        <Fragment key={part.id}>
          <Heading id={part.id} level={3}>
            {part.label}
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
        </Fragment>
      ))}
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
