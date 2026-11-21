import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { logInPaths } from '#src/fans/log-in'
import { findPrediction, predictionMatches } from '#src/fans/prediction'
import { crowdFigures, scoredPredictions } from '#src/fans/prediction-results'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageAreas } from '#src/page-areas'

import { CrowdCard, PointsCard, ScoringCard, YourPredictionsCard } from './PointsCards'
import { ClosedCard, NoMatchCard, OpenCard } from './PredictionCards'

// The cards with the match and the points stand in the wide column, the cards with the scoring
// and the figures of everybody in the narrow one; on a phone the narrow column comes last.
const areas = pageAreas({ after: ['side'], main: ['next', 'mine', 'points'] })

// Render on each request: what is open, the deadline and the session are not known at build
// time, and the page must never be cached or indexed.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('prognose', notFound)

  return { robots: { follow: false, index: false }, title: 'Prognose' }
}

/**
 * The page of the game Prognose: the match that can be predicted now, with the form for a
 * supporter who is logged in and the way in for a visitor who is not. From the kick-off the
 * card shows the match as closed, and under it the next match is already open. The page is the
 * same for a visitor, so it names no personal data; the personal part (the prediction) is read
 * only with a session. A blocked account goes to the page that says so.
 */
export default async function PredictionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('prognose', notFound)

  const supporter = await currentSupporter()

  if (supporter?.disabledAt !== null && supporter !== undefined) {
    redirect(logInPaths.blocked)
  }

  const { alle } = await searchParams
  const now = new Date()
  const { db } = getDatabase()
  const { next, started } = await predictionMatches(db, now)
  const supporterId = supporter?.id
  const savedOf = async (match: undefined | { id: number }) =>
    supporterId === undefined || match === undefined ? undefined : findPrediction(db, supporterId, match.id)
  const loggedIn = supporterId !== undefined
  const mine = supporterId === undefined ? [] : await scoredPredictions(db, supporterId, now)
  // The card of the last match that has a result, with the points and how everybody did.
  const lastPlayed = mine.find((item) => item.match.state === 'played')
  const crowd = lastPlayed === undefined ? undefined : await crowdFigures(lastPlayed.match.id)

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Prognose</Heading>
        <Text appearance="intro">Voorspel de rust- en eindstand van de volgende wedstrijd van sc Heerenveen.</Text>
      </Page.Cell>
      <Page.Cell area="next">
        {started === undefined ? (
          next === undefined ? (
            <NoMatchCard heading="Volgende wedstrijd" id="volgende-wedstrijd" />
          ) : (
            <OpenCard
              heading="Volgende wedstrijd"
              id="volgende-wedstrijd"
              loggedIn={loggedIn}
              match={next}
              now={now}
              saved={await savedOf(next)}
            />
          )
        ) : (
          <>
            <ClosedCard
              id="volgende-wedstrijd"
              loggedIn={loggedIn}
              match={started}
              now={now}
              saved={await savedOf(started)}
            />
            {next === undefined ? (
              <NoMatchCard heading="Daarna" id="daarna" />
            ) : (
              <OpenCard
                heading="Daarna"
                id="daarna"
                inDisclosure
                loggedIn={loggedIn}
                match={next}
                now={now}
                saved={await savedOf(next)}
              />
            )}
          </>
        )}
      </Page.Cell>
      <Page.Cell area="mine">
        {loggedIn ? <YourPredictionsCard all={alle === 'ja'} items={mine} now={now} /> : null}
      </Page.Cell>
      <Page.Cell area="points">
        {lastPlayed === undefined ? null : <PointsCard item={lastPlayed} now={now} />}
      </Page.Cell>
      <Page.Section area="side" aria-label="De telling en hoe iedereen het deed">
        {crowd === undefined ? null : <CrowdCard figures={crowd} />}
        <ScoringCard />
      </Page.Section>
    </Page.Main>
  )
}
