import type { PublicMatch } from '@fansite/db/queries'

import { Card, Heading, List, PlayerName, ShortFact, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import type { SourceVersion } from './card-sources'
import type { MultiGoalScorer } from './matches'

import { CardLastModified } from './CardLastModified'
import { type CompetitionChoice } from './competition'
import { specialGoalsOf } from './matches'
import { BasedOn, imageCredit } from './MatchViews'

/**
 * The card of the page Spelers with the goals that stand out: the hattricks and doubles of the
 * season with the players who scored them, the penalties out of all our goals, and the own
 * goals for and against. It is built as the card Uitersten: a list with a line per part, each
 * with its name as quiet text above the value, in the same item, so a screen reader reads the
 * name and its value together and the thin lines come from the design system (`ShortFact`).
 * The hattricks and the doubles say "Nog geen" when nobody has any; the penalties and the own
 * goals are numbers, so a zero stays. Without a goal in a played match the card is a sentence
 * for visitors, with no parts and no button for an image. The line under it says how many
 * matches the numbers are based on.
 */
export function SpecialGoalsCard({
  competition,
  matches,
  now,
  seasonOnImage,
  sources,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  now: Date
  seasonOnImage?: string | undefined
  sources: readonly SourceVersion[]
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
          <List role="list">
            <List.Item>
              <Text appearance="meta">Hattricks</Text>
              <MultiGoalFact players={hattricks} />
            </List.Item>
            <List.Item>
              <Text appearance="meta">Dubbelslagen</Text>
              <MultiGoalFact players={doubles} />
            </List.Item>
            <List.Item>
              <Text appearance="meta">Strafschoppen</Text>
              <ShortFact>{`${penalties} van de ${goalsFor} ${goalsFor === 1 ? 'doelpunt' : 'doelpunten'}`}</ShortFact>
            </List.Item>
            <List.Item>
              <Text appearance="meta">Eigen doelpunten</Text>
              <ShortFact>
                {`${ownGoalsFor} door de tegenstander`}
                {/* The dot is only for the eye; the spaces stay outside, so the parts don't run together. */}{' '}
                <Text aria-hidden="true" as="span">
                  ·
                </Text>{' '}
                {`${ownGoalsAgainst} door ons`}
              </ShortFact>
            </List.Item>
          </List>
          <BasedOn known={known} played={played} />
          <CardLastModified card="bijzondere-doelpunten" now={now} sources={sources} />
        </>
      ) : (
        <Text>We hebben nog geen doelpunten van dit seizoen. Kijk straks nog eens.</Text>
      )}
    </Card>
  )
}

/**
 * The players of the hattricks or the doubles on one line, each with his name as one name (see
 * `PlayerName`), separated by commas, and for a player who did it more than once how often
 * (`2×`). Nobody has any: "Nog geen", in the quiet style.
 */
function MultiGoalFact({ players }: { players: MultiGoalScorer[] }) {
  if (players.length === 0) {
    return <ShortFact empty>Nog geen</ShortFact>
  }

  return (
    <ShortFact>
      {players.map(({ givenName, id, surname, times }, index) => (
        <Fragment key={id}>
          {index > 0 && ', '}
          <PlayerName givenName={givenName} surname={surname} />
          {times > 1 && ` ${times}×`}
        </Fragment>
      ))}
    </ShortFact>
  )
}
