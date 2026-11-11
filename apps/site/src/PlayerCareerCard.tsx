import { Card, CareerTimeline, Heading, Text } from '@fansite/design-system'

import type { PlayerSeason } from './player-seasons'

import { careerCoverage, type CareerOptions, careerPeriods } from './player-career'

/** The id of the heading that names the card. */
export const playerCareerCardId = 'loopbaan'

/**
 * The card "Loopbaan bij sc Heerenveen" of the page of a player (#1084): for how many seasons
 * we have the line-ups, and then the periods he was with us with the gaps between them, each
 * season with its shirt number, the goals by competition and at most one moment (see
 * `careerMoments`).
 * The numbers of a season are in the table above, so they are not repeated here.
 */
export function PlayerCareerCard({ options, seasons }: { options: CareerOptions; seasons: readonly PlayerSeason[] }) {
  if (seasons.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={playerCareerCardId}>
      <Heading id={playerCareerCardId} level={2}>
        Loopbaan bij sc Heerenveen
      </Heading>
      <Text appearance="meta">{careerCoverage(seasons)}</Text>
      <CareerTimeline level={3} periods={careerPeriods(seasons, options)} />
    </Card>
  )
}
