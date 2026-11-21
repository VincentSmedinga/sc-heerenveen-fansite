import { Card, GameHeading, Link, PredictionCrowd, type PredictionCrowdProps, Text } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import { isOpen, predictionMatches, predictionPath } from '#src/fans/prediction'
import { type MatchCrowd, matchCrowd, shareText } from '#src/fans/prediction-crowd'

// The card Prognose on the page of a match (issue 1453): what supporters predicted, as figures
// for a group and never a name. The page is the same for every visitor, so the card reads
// nothing personal: only the cached figures of the match and the state of the form.

/** What the card needs, or nothing when the match has no card. */
export type PredictionCrowdData = {
  crowd: MatchCrowd
  /** Whether the form is open for this match, so the card can link to it. */
  formOpen: boolean
  /** Whether the kick-off has been. */
  reveal: boolean
}

const people = (count: number) =>
  count === 1 ? '1 supporter voorspelde deze wedstrijd.' : `${count} supporters voorspelden deze wedstrijd.`

/** The properties of `PredictionCrowd` for the figures of a match. */
export function crowdProps({ crowd, reveal }: Pick<PredictionCrowdData, 'crowd' | 'reveal'>): PredictionCrowdProps {
  const { after, count, spread } = crowd

  if (spread === undefined) {
    return { children: reveal ? people(count) : `${people(count)} Wat ze voorspelden, zie je bij de aftrap.` }
  }

  const listed = spread.scores.some((score) => score.label === spread.actual?.score)
  const scores = [
    ...spread.scores.map((score) => ({ ...score, actual: score.label === spread.actual?.score })),
    ...(spread.other > 0 ? [{ count: spread.other, label: 'anders' }] : []),
  ]

  return {
    children:
      spread.actual === undefined || listed
        ? people(count)
        : `${people(count)} De eindstand was ${spread.actual.score}.`,
    ...(after === undefined
      ? {}
      : {
          figures: [
            { figure: after.average, label: 'gemiddeld voorspeld', note: `van ${count} voorspellingen` },
            { figure: String(after.exact), label: 'precies goed', note: shareText(after.exact, count) },
            { figure: String(after.outcome), label: 'goede uitslag', note: shareText(after.outcome, count) },
          ],
        }),
    outcomes: {
      ...(spread.actual === undefined ? {} : { actual: spread.actual.outcome }),
      draws: spread.draws,
      losses: spread.losses,
      wins: spread.wins,
    },
    scores,
  }
}

/**
 * What the card shows for a match: nothing when the game is off or nobody predicted. Before
 * the kick-off it is the count; from the kick-off the figures too. The match is the one of the
 * page, so the cache gets keys of matches that exist.
 */
export async function loadPredictionCrowd(
  match: { id: number; kickoffAt: Date | null },
  now = new Date(),
): Promise<PredictionCrowdData | undefined> {
  if (!isFansPartOn('prognose')) {
    return undefined
  }

  const reveal = match.kickoffAt !== null && match.kickoffAt.getTime() <= now.getTime()
  const crowd = await matchCrowd(match.id, reveal)

  if (crowd === undefined) {
    return undefined
  }

  // The form is for the first match that has not begun, which is not always this one.
  const formOpen =
    !reveal && isOpen(match, now) && (await predictionMatches(getDatabase().db, now)).next?.id === match.id

  return { crowd, formOpen, reveal }
}

/**
 * The card Prognose: the heading with "Van supporters" beside it, and the figures. The link
 * "Voorspel ook" stands there while the form of this match is open; "Stand Prognose" after the
 * match goes to the ranking of this match.
 */
export function PredictionCrowdCard({
  data,
  matchId,
  played,
}: {
  data: PredictionCrowdData
  matchId: number
  played: boolean
}) {
  return (
    <Card aria-labelledby="prognose-supporters" game="prognose">
      <GameHeading id="prognose-supporters" level={2} meta="Van supporters">
        Prognose
      </GameHeading>
      <PredictionCrowd {...crowdProps(data)} />
      {data.formOpen ? (
        <Text>
          <Link href={predictionPath}>Voorspel ook</Link>
        </Text>
      ) : null}
      {played && data.crowd.after !== undefined ? (
        <Text>
          <Link href={`${predictionPath}/stand?wedstrijd=${matchId}`}>Stand Prognose</Link>
        </Text>
      ) : null}
    </Card>
  )
}

/**
 * The card for a page of a match, or nothing. A failed reading leaves the card out and logs it,
 * so a problem with the card never takes the page of the match with it.
 */
export async function readPredictionCrowd(match: { id: number; kickoffAt: Date | null }, now = new Date()) {
  try {
    return await loadPredictionCrowd(match, now)
  } catch (error) {
    console.error(`Could not read what supporters predicted for match ${match.id}: ${reasonOf(error)}`)

    return undefined
  }
}
