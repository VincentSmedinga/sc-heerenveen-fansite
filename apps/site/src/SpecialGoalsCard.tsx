import type { PublicMatch } from '@fansite/db/queries'

import { Card, Heading, List, PlayerName, Text } from '@fansite/design-system'

import type { MultiGoalScorer } from './matches'

import { type CompetitionChoice } from './competition'
import { specialGoalsOf } from './matches'
import { BasedOn, imageCredit } from './MatchViews'

/**
 * The card of the page Spelers with the goals that stand out: the hattricks and doubles of the
 * season with the players who scored them, the penalties out of all our goals, and the own
 * goals for and against. Every part has a heading of its own. The hattricks and the doubles
 * show a sentence when nobody has any ("Nog geen hattricks."), because a visitor may well look
 * for them; the penalties and the own goals are numbers, so a zero stays. Without a goal in a
 * played match the card is a sentence for visitors, with no parts and no button for an image.
 * The line under it says how many matches the numbers are based on.
 */
export function SpecialGoalsCard({
  competition,
  matches,
  seasonOnImage,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  seasonOnImage?: string | undefined
}) {
  const { doubles, goalsFor, hattricks, known, ownGoalsAgainst, ownGoalsFor, penalties, played } = specialGoalsOf(
    matches,
    competition,
  )
  const hasGoals = goalsFor > 0

  return (
    <Card aria-labelledby="bijzondere-doelpunten" shareable={imageCredit(hasGoals, seasonOnImage)} surface="soft">
      <Heading anchor id="bijzondere-doelpunten" level={2}>
        Bijzondere doelpunten
      </Heading>
      {hasGoals ? (
        <>
          <Heading level={3}>Hattricks</Heading>
          {hattricks.length === 0 ? <Text>Nog geen hattricks.</Text> : <MultiGoalList players={hattricks} />}
          <Heading level={3}>Dubbelslagen</Heading>
          {doubles.length === 0 ? <Text>Nog geen dubbelslagen.</Text> : <MultiGoalList players={doubles} />}
          <Heading level={3}>Strafschoppen</Heading>
          <Text>{`${penalties} van de ${goalsFor} doelpunten`}</Text>
          <Heading level={3}>Eigen doelpunten</Heading>
          <List role="list">
            <List.Item>{`Door de tegenstander in eigen doel: ${ownGoalsFor}`}</List.Item>
            <List.Item>{`Door ons in eigen doel: ${ownGoalsAgainst}`}</List.Item>
          </List>
          <BasedOn known={known} played={played} />
        </>
      ) : (
        <Text>We hebben nog geen doelpunten van dit seizoen. Kijk straks nog eens.</Text>
      )}
    </Card>
  )
}

/**
 * The players of a list of hattricks or doubles, each with his name as one name (see
 * `PlayerName`) and, for a player who did it more than once, how often (`2×`). The sentence for
 * an empty list is the caller's.
 */
function MultiGoalList({ players }: { players: MultiGoalScorer[] }) {
  return (
    <List role="list">
      {players.map(({ givenName, id, surname, times }) => (
        <List.Item key={id}>
          <PlayerName givenName={givenName} surname={surname} />
          {times > 1 && `, ${times}×`}
        </List.Item>
      ))}
    </List>
  )
}
