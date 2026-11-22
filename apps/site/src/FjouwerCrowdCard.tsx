import { BarList, Card, GameHeading, Heading, Text } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { reasonOf } from '#src/errors'
import { type FjouwerCrowd, fjouwerCrowd } from '#src/fans/fjouwer-crowd'

// The card Fjouwer on the page of a match (issue 1475): which players supporters had in their
// four, as figures for a group and never a name of a supporter. The page is the same for every
// visitor, so the card reads nothing personal: only the cached figures of the match.

/** The number of supporters with a four, without a full stop: "87 fans kozen hun vier". */
export const choosersText = (count: number) => (count === 1 ? '1 fan koos zijn vier' : `${count} fans kozen hun vier`)

/**
 * The card Fjouwer: the heading with "Van de fans" beside it, the list of the most chosen
 * players with their share, and the number of supporters. With too few supporters (see
 * `crowdMinimum`) the list stays out, because a share says little and could point to a person.
 */
export function FjouwerCrowdCard({ crowd }: { crowd: FjouwerCrowd }) {
  return (
    <Card aria-labelledby="fjouwer-supporters" game="fjouwer">
      <GameHeading id="fjouwer-supporters" level={2} meta="Van de fans">
        Fjouwer
      </GameHeading>
      {crowd.players === undefined ? (
        <Text>{choosersText(crowd.count)}. Er deden te weinig fans mee om de keuzes te laten zien.</Text>
      ) : (
        <>
          <Heading appearance={3} level={3}>
            Het vaakst gekozen
          </Heading>
          <BarList
            aria-label="Het vaakst gekozen spelers, met het deel van de fans"
            rows={crowd.players.map(({ name, percentage }) => ({ label: name, value: percentage }))}
            unit="%"
            wide
          />
          <Text appearance="meta">{choosersText(crowd.count)}.</Text>
        </>
      )}
    </Card>
  )
}

/**
 * What the card shows for a match: nothing while the game is off, before the kick-off (not even
 * a count, so nobody sees what the others choose while they can still change it) and for a
 * match without a four. The match is the one of the page, so the cache gets keys of matches
 * that exist.
 */
export async function loadFjouwerCard(
  match: { id: number; kickoffAt: Date | null },
  now = new Date(),
): Promise<FjouwerCrowd | undefined> {
  if (!isFansPartOn('vier') || match.kickoffAt === null || match.kickoffAt.getTime() > now.getTime()) {
    return undefined
  }

  return fjouwerCrowd(match.id)
}

/** The card for a page of a match, or nothing. A failed reading leaves it out and logs it. */
export async function readFjouwerCard(match: { id: number; kickoffAt: Date | null }, now = new Date()) {
  try {
    return await loadFjouwerCard(match, now)
  } catch (error) {
    console.error(`Could not read what supporters chose for match ${match.id}: ${reasonOf(error)}`)

    return undefined
  }
}
