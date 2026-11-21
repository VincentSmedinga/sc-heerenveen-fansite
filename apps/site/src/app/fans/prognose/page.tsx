import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { logInPaths } from '#src/fans/log-in'
import { findPrediction, predictionMatches } from '#src/fans/prediction'
import { currentSupporter } from '#src/fans/require-supporter'

import { ClosedCard, NoMatchCard, OpenCard } from './PredictionCards'

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
export default async function PredictionPage() {
  requireFansPart('prognose', notFound)

  const supporter = await currentSupporter()

  if (supporter?.disabledAt !== null && supporter !== undefined) {
    redirect(logInPaths.blocked)
  }

  const now = new Date()
  const { db } = getDatabase()
  const { next, started } = await predictionMatches(db, now)
  const supporterId = supporter?.id
  const savedOf = async (match: undefined | { id: number }) =>
    supporterId === undefined || match === undefined ? undefined : findPrediction(db, supporterId, match.id)
  const loggedIn = supporterId !== undefined
  const remindByEmail = supporter?.remindByEmail ?? false

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Prognose</Heading>
        <Text appearance="intro">Voorspel de rust- en eindstand van de volgende wedstrijd van sc Heerenveen.</Text>
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
              remindByEmail={remindByEmail}
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
                remindByEmail={remindByEmail}
                saved={await savedOf(next)}
              />
            )}
          </>
        )}
      </Page.Cell>
    </Page.Main>
  )
}
