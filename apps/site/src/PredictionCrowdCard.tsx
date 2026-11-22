import {
  Card,
  CardLink,
  GameHeading,
  Heading,
  PredictionCrowd,
  type PredictionCrowdProps,
  Text,
} from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import { isOpen, predictionMatches, predictionPath } from '#src/fans/prediction'
import { type MatchCrowd, matchCrowd, oldMatchCrowd, shareText } from '#src/fans/prediction-crowd'

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
  count === 1 ? '1 fan voorspelde deze wedstrijd.' : `${count} fans voorspelden deze wedstrijd.`

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
 * The card for an old match (issue 1457): what visitors of the old fansite predicted, from the
 * counts of the import. It is the card of `PredictionCrowdCard` after the match, without the
 * figures about points and the average, and with the source under it. It has no card without
 * counts, and none while the game is off.
 */
export async function loadOldPredictionCrowd(match: { id: number }): Promise<MatchCrowd | undefined> {
  return isFansPartOn('prognose') ? oldMatchCrowd(match.id) : undefined
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

export function OldPredictionCrowdCard({ crowd }: { crowd: MatchCrowd }) {
  return (
    <Card aria-labelledby="prognose-supporters" game="prognose">
      <GameHeading id="prognose-supporters" level={2} meta="Van de fans">
        Prognose
      </GameHeading>
      <Heading appearance={3} level={3}>
        Wat fans toen voorspelden
      </Heading>
      <PredictionCrowd {...crowdProps({ crowd, reveal: true })} headingLevel={3} />
      <Text appearance="meta">Voorspellingen van bezoekers van de Fansite, 2001 tot 2007.</Text>
    </Card>
  )
}

/**
 * The card Prognose: the heading with "Van de fans" beside it, and the figures. The link
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
      <GameHeading id="prognose-supporters" level={2} meta="Van de fans">
        Prognose
      </GameHeading>
      <PredictionCrowd {...crowdProps(data)} />
      {data.formOpen ? <CardLink href={predictionPath}>Voorspel ook</CardLink> : null}
      {played && data.crowd.after !== undefined ? (
        <CardLink href={`${predictionPath}/stand?wedstrijd=${matchId}`}>Stand Prognose</CardLink>
      ) : null}
    </Card>
  )
}

/** The counts for an old match. A failed reading leaves the card out and logs it. */
export async function readOldPredictionCrowd(match: { id: number }) {
  try {
    return await loadOldPredictionCrowd(match)
  } catch (error) {
    console.error(`Could not read what supporters predicted for old match ${match.id}: ${reasonOf(error)}`)

    return undefined
  }
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
