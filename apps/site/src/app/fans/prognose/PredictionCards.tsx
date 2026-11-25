import type { ReactNode } from 'react'

import { Card, CardLink, Heading, PredictionCrowd, ScoreGrid, Tag, Text } from '@fansite/design-system'

import { NoMatchCard as GameNoMatchCard, MatchLine } from '#src/fans/GameCards'
import {
  clubsOf,
  deadlineText,
  isOpen,
  type PredictionMatch,
  predictionPath,
  type PredictionValues,
} from '#src/fans/prediction'
import { crowdProps, type PredictionCrowdData } from '#src/PredictionCrowdCard'
import { reportAddress } from '#src/report-data'

import { LogInCard } from '../inloggen/LogInCard'
import { PredictionForm } from './PredictionForm'

/** The line about the points, for somebody who is not logged in. */
const scoringLine = 'Hoogstens 30 punten per wedstrijd.'

/**
 * The card of a match that has begun: the Tag Gesloten, what that means, the prediction of the
 * supporter without fields (or that there was none), and the link to the match.
 */
export function ClosedCard({
  crowd,
  id,
  loggedIn,
  match,
  now,
  saved,
}: {
  /** What supporters predicted, the same as on the page of the match, or `undefined`. */
  crowd?: PredictionCrowdData | undefined
  id: string
  loggedIn: boolean
  match: PredictionMatch
  now: Date
  saved: PredictionValues | undefined
}) {
  const clubs = clubsOf(match)

  return (
    <Card aria-labelledby={id} game="prognose">
      <Heading id={id} level={2}>
        Volgende wedstrijd
      </Heading>
      <Text>
        <Tag tone="closed">Gesloten</Tag>
      </Text>
      <MatchLine match={match} now={now} />
      <Text>De wedstrijd is begonnen. Na de rust zie je je eerste punten.</Text>
      {loggedIn ? (
        saved === undefined ? (
          <Text>Je hebt niet voorspeld.</Text>
        ) : (
          <ScoreGrid awayName={clubs.away} homeName={clubs.home} legend="Jouw voorspelling" readOnly values={saved} />
        )
      ) : null}
      {crowd === undefined ? null : <PredictionCrowd {...crowdProps(crowd)} headingLevel={3} />}
      <CardLink href={reportAddress(match.season, match.matchDate, match.clubSlug)}>Naar de wedstrijd</CardLink>
    </Card>
  )
}

/** The card for the time that no match is known: one line. */
export function NoMatchCard({ heading, id }: { heading: string; id: string }) {
  return (
    <GameNoMatchCard game="prognose" heading={heading} id={id}>
      De volgende wedstrijd is nog niet bekend.
    </GameNoMatchCard>
  )
}

/**
 * The card of the match that can be predicted: the heading with the Tag and the deadline, the
 * match, and then the form for a supporter who is logged in, or the way in for a visitor. With
 * no known kick-off the form stays closed and a line says why. `heading` is "Volgende
 * wedstrijd" for the first card, and "Daarna" for the one under a match that has begun, whose
 * form is behind a Disclosure.
 */
export function OpenCard({
  heading,
  id,
  inDisclosure = false,
  loggedIn,
  match,
  now,
  remindByEmail = false,
  saved,
}: {
  heading: string
  id: string
  inDisclosure?: boolean
  loggedIn: boolean
  match: PredictionMatch
  now: Date
  /** Whether the supporter has the reminder by e-mail on. */
  remindByEmail?: boolean
  saved: PredictionValues | undefined
}) {
  const open = isOpen(match, now)
  const clubs = clubsOf(match)

  let body: ReactNode

  if (!open || match.kickoffAt === null) {
    body = <Text>Zodra de aftrap bekend is, kun je hier voorspellen.</Text>
  } else if (!loggedIn) {
    body = (
      <LogInCard
        {...(inDisclosure ? { before: <Text>{scoringLine}</Text>, behind: 'Voorspellen' } : {})}
        level={3}
        message="Log in om te voorspellen."
        returnTo={predictionPath}
      />
    )
  } else {
    body = (
      <PredictionForm
        awayName={clubs.away}
        behindButton={inDisclosure}
        homeName={clubs.home}
        matchId={match.id}
        remindByEmail={remindByEmail}
        saved={saved}
      />
    )
  }

  return (
    <Card aria-labelledby={id} game="prognose">
      <Heading id={id} level={2}>
        {heading}
      </Heading>
      <Text>
        {open && match.kickoffAt !== null ? (
          <Tag tone="open">{deadlineText(match.kickoffAt, now)}</Tag>
        ) : (
          <Tag>Aftrap nog niet bekend</Tag>
        )}
      </Text>
      <MatchLine match={match} now={now} />
      {!loggedIn && !inDisclosure && open ? <Text>{scoringLine}</Text> : null}
      {body}
    </Card>
  )
}
