import { Card, Heading, List, PlayerName, ShortFact, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { cardPlayers, completenessSentence, type SeasonSquad, showsPlayers, squadParts } from './season-squad'

/**
 * The card Selectie on the page Spelers: every player of the season in parts by position, and
 * under the heading how complete the list is. A player is the shirt number, the flag of the
 * country and the name (a `PlayerName` with `shirtNumber` and `country`, on a line of a
 * `ShortFact` for the thin lines), with no link and no photo. A season whose squad we don't
 * know has the heading and the sentence alone. The card has no button for an image: it is a
 * list, not a figure to share.
 */
export function SeasonSquadCard({ squad }: { squad: SeasonSquad }) {
  const parts = showsPlayers(squad) ? squadParts(cardPlayers(squad)) : []

  return (
    <Card aria-labelledby="selectie">
      <Heading anchor id="selectie" level={2}>
        Selectie
      </Heading>
      <Text>{completenessSentence(squad.completeness, cardPlayers(squad).length)}</Text>
      {parts.map((part) => (
        <Fragment key={part.label ?? 'selectie'}>
          {part.label === null ? null : <Heading level={3}>{part.label}</Heading>}
          <List role="list">
            {part.players.map((player) => (
              <List.Item key={player.key}>
                <ShortFact>
                  <PlayerName
                    country={player.country}
                    givenName={player.givenName}
                    shirtNumber={player.shirtNumber}
                    surname={player.surname}
                  />
                </ShortFact>
              </List.Item>
            ))}
          </List>
        </Fragment>
      ))}
    </Card>
  )
}
