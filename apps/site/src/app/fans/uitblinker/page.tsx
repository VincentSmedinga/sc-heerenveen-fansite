import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Heading, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { logInPaths } from '#src/fans/log-in'
import { fansMatchRatings, loadRunningRatings, seasonWinners } from '#src/fans/match-ratings'
import { findOwnRatings, findRatingWindow } from '#src/fans/rating'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageAreas } from '#src/page-areas'

import {
  ClosedResultCard,
  HowItWorksCard,
  JoinCard,
  LateNotice,
  NextMatchCard,
  OpenCard,
  SavedView,
  SeasonWinnersCard,
  WaitingCard,
} from './RatingCards'
import { RatingForm } from './RatingForm'

// The card with the form stands in the wide column, the card that says how it works in the
// narrow one; on a phone the narrow column comes last.
const areas = pageAreas({ after: ['side'], main: ['rate'] })

// Render on each request: the window, the list and the session are not known at build time, and
// the page must never be cached or indexed.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('uitblinker', notFound)

  return { robots: { follow: false, index: false }, title: 'Uitblinker' }
}

/**
 * The page of the game Uitblinker: the last match, with the form for a supporter who is logged
 * in and may take part, and the way in for a visitor. Without a finished report there is no
 * form, and when the window is closed there is a card for the next match. The page is the same
 * for a visitor, so it names no personal data; the grades of a supporter are read only with a
 * session. A blocked account goes to the page that says so. Once the window is closed the page
 * shows its result and the Uitblinkers of the season to everyone, and a supporter who gave all
 * the grades sees the standing so far while it is open (issue 1472).
 */
export default async function RatingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('uitblinker', notFound)

  const supporter = await currentSupporter()

  if (supporter !== undefined && supporter.disabledAt !== null) {
    redirect(logInPaths.blocked)
  }

  const { wijzigen } = await searchParams
  const now = new Date()
  const { db } = getDatabase()
  const window = await findRatingWindow(db, now)

  let card: ReactNode

  if (window.state === 'none' || window.state === 'closed') {
    // A window that closed shows its result to everyone, under the card for the next match.
    const result = window.state === 'closed' ? await fansMatchRatings(window.match.id) : undefined

    card = (
      <>
        <NextMatchCard next={window.next} />
        {result === undefined || window.state !== 'closed' ? null : (
          <ClosedResultCard match={window.match} now={now} ratings={result} />
        )}
      </>
    )
  } else if (window.state === 'waiting') {
    card = <WaitingCard match={window.match} now={now} />
  } else if (supporter === undefined) {
    card = (
      <>
        <OpenCard closesAt={window.closesAt} match={window.match} now={now}>
          {null}
        </OpenCard>
        <JoinCard />
      </>
    )
  } else if (supporter.createdAt.getTime() >= window.startsAt.getTime()) {
    card = (
      <OpenCard closesAt={window.closesAt} match={window.match} now={now}>
        <LateNotice />
      </OpenCard>
    )
  } else {
    const grades = await findOwnRatings(db, supporter.id, window.match.id)
    const complete = window.players.every((player) => grades.has(player.appearanceId))

    const saved = complete && wijzigen !== '1'
    // The standing so far is for a supporter who gave all the grades, on the saved view only.
    const running = saved ? await loadRunningRatings(db, window.match.id) : []

    card = (
      <OpenCard
        closesAt={window.closesAt}
        heading={saved ? 'Je cijfers staan' : 'Geef je cijfers'}
        match={window.match}
        now={now}
      >
        {saved ? (
          <SavedView closesAt={window.closesAt} grades={grades} players={window.players} running={running} />
        ) : (
          <RatingForm
            matchId={window.match.id}
            players={window.players}
            saved={Object.fromEntries([...grades].map(([appearanceId, grade]) => [appearanceId, String(grade)]))}
          />
        )}
      </OpenCard>
    )
  }

  // The Uitblinkers of the season stand beside the card, for everyone.
  const winners = window.state === 'none' ? [] : await seasonWinners(window.match.season)

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Uitblinker</Heading>
        <Text appearance="intro">Geef de spelers van de laatste wedstrijd van sc Heerenveen een cijfer.</Text>
      </Page.Cell>
      <Page.Cell area="rate">{card}</Page.Cell>
      <Page.Section area="side" aria-label="Uitleg van het spel">
        {window.state === 'none' ? null : <SeasonWinnersCard season={window.match.season} winners={winners} />}
        <HowItWorksCard />
      </Page.Section>
    </Page.Main>
  )
}
