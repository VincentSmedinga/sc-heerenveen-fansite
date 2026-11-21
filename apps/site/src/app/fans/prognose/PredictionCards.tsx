import type { ReactNode } from 'react'

import {
  Button,
  Card,
  Disclosure,
  Form,
  Heading,
  Link,
  Match,
  Notice,
  ScoreGrid,
  Tag,
  Text,
} from '@fansite/design-system'

import { logInPaths } from '#src/fans/log-in'
import { returnParameter } from '#src/fans/log-in-form'
import {
  clubsOf,
  deadlineText,
  isOpen,
  type PredictionMatch,
  predictionPath,
  type PredictionValues,
} from '#src/fans/prediction'
import { signUpPaths } from '#src/fans/sign-up'
import { matchMoment } from '#src/match-format'
import { reportAddress } from '#src/report-data'

import { PredictionForm } from './PredictionForm'

/** The logged-out visitor's way in: a notice and the two buttons, as on Fans. */
function LogInNotice() {
  return (
    <>
      <Notice>Log in om te voorspellen. Nog geen account? Dat maak je in een minuut.</Notice>
      {/* Forms that only go to a page: the design system has no link as a button. */}
      <Form action={logInPaths.form} method="get">
        {/* The button carries the page to come back to: a form sends its name and value. */}
        <Button name={returnParameter} type="submit" value={predictionPath}>
          Inloggen
        </Button>
      </Form>
      <Form action={signUpPaths.form}>
        <Button appearance="soft" type="submit">
          Account maken
        </Button>
      </Form>
    </>
  )
}

/** The match of a card, in the look of the lists: the day and the competition small above. */
function MatchLine({ match, now }: { match: PredictionMatch; now: Date }) {
  return (
    <Match
      competition={match.competition}
      {...matchMoment({ ...match, status: 'scheduled' }, now)}
      home={match.home}
      opponent={match.opponent}
      round={match.round}
      status="scheduled"
    />
  )
}

/** The line about the points, for somebody who is not logged in. */
const scoringLine = 'Hoogstens 30 punten per wedstrijd.'

/**
 * The card of a match that has begun: the Tag Gesloten, what that means, the prediction of the
 * supporter without fields (or that there was none), and the link to the match.
 */
export function ClosedCard({
  id,
  loggedIn,
  match,
  now,
  saved,
}: {
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
      <Text>
        <Link href={reportAddress(match.season, match.matchDate, match.clubSlug)}>Naar de wedstrijd</Link>
      </Text>
    </Card>
  )
}

/** The card for the time that no match is known: one line. */
export function NoMatchCard({ heading, id }: { heading: string; id: string }) {
  return (
    <Card aria-labelledby={id} game="prognose">
      <Heading id={id} level={2}>
        {heading}
      </Heading>
      <Text>De volgende wedstrijd is nog niet bekend.</Text>
    </Card>
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
  saved,
}: {
  heading: string
  id: string
  inDisclosure?: boolean
  loggedIn: boolean
  match: PredictionMatch
  now: Date
  saved: PredictionValues | undefined
}) {
  const open = isOpen(match, now)
  const clubs = clubsOf(match)

  let body: ReactNode

  if (!open || match.kickoffAt === null) {
    body = (
      <Text>De aanvangstijd van deze wedstrijd is nog niet bekend. Zodra die vaststaat, kun je hier voorspellen.</Text>
    )
  } else if (!loggedIn) {
    body = inDisclosure ? (
      <Disclosure summary="Voorspellen">
        <LogInNotice />
      </Disclosure>
    ) : (
      <LogInNotice />
    )
  } else {
    body = (
      <PredictionForm
        awayName={clubs.away}
        behindButton={inDisclosure}
        homeName={clubs.home}
        matchId={match.id}
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
          <Tag>Aanvangstijd nog niet bekend</Tag>
        )}
      </Text>
      <MatchLine match={match} now={now} />
      {!loggedIn && !inDisclosure && open ? <Text>{scoringLine}</Text> : null}
      {body}
    </Card>
  )
}
