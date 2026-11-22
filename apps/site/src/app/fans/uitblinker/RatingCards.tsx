import type { ReactNode } from 'react'

import { Button, Card, DataTable, Form, Heading, List, Match, Notice, Tag, Text } from '@fansite/design-system'

import { logInPaths } from '#src/fans/log-in'
import { returnParameter } from '#src/fans/log-in-form'
import { clubsOf } from '#src/fans/prediction'
import {
  closingText,
  deadlineTag,
  lateMessage,
  nextDayText,
  type RatingMatch,
  ratingPath,
  type RatingPlayer,
  waitingText,
} from '#src/fans/rating'
import { signUpPaths } from '#src/fans/sign-up'
import { matchMoment } from '#src/match-format'
import { reportAddress } from '#src/report-data'

// The cards of the page of the game Uitblinker (issue 1470). Each one is a server component
// that gets what it shows; the form is a client component of its own (RatingForm).

/** The side card that says how the game works, in a few short lines. */
export function HowItWorksCard() {
  return (
    <Card aria-labelledby="zo-werkt-het" surface="soft">
      <Heading id="zo-werkt-het" level={2}>
        Zo werkt het
      </Heading>
      <List>
        <List.Item>Elke supporter met een account geeft de spelers van de laatste wedstrijd een cijfer.</List.Item>
        <List.Item>
          Het venster sluit als de volgende wedstrijd begint, en uiterlijk zeven dagen na de wedstrijd.
        </List.Item>
        <List.Item>Tot dan kun je je cijfers wijzigen.</List.Item>
        <List.Item>Als het venster dicht is, zien alle supporters de uitslag.</List.Item>
      </List>
    </Card>
  )
}

/** The way in for a visitor who is not logged in: what is needed, and the two buttons. */
export function JoinCard() {
  return (
    <Card aria-labelledby="doe-mee" surface="strong">
      <Heading id="doe-mee" level={2}>
        Doe mee
      </Heading>
      <Text>
        Om cijfers te geven heb je alleen een schermnaam en een e-mailadres nodig. Een wachtwoord is niet nodig.
      </Text>
      {/* Forms that only go to a page: the design system has no link as a button. */}
      <Form action={signUpPaths.form}>
        <Button type="submit">Account maken</Button>
      </Form>
      <Form action={logInPaths.form} method="get">
        {/* The button carries the page to come back to: a form sends its name and value. */}
        <Button appearance="soft" name={returnParameter} type="submit" value={ratingPath}>
          Inloggen
        </Button>
      </Form>
    </Card>
  )
}

/** The text for an account that was made after the match began. */
export function LateNotice() {
  return <Notice>{lateMessage}</Notice>
}

/**
 * The card for the time that no window is open: when the next match is known, the one after
 * which the grades can be given, and otherwise a line without a date.
 */
export function NextMatchCard({ next }: { next: RatingMatch | undefined }) {
  const clubs = next === undefined ? undefined : clubsOf(next)

  return (
    <Card aria-labelledby="volgende-wedstrijd" game="uitblinker">
      <Heading id="volgende-wedstrijd" level={2}>
        Volgende wedstrijd
      </Heading>
      <Text>
        {next === undefined || clubs === undefined
          ? 'De volgende wedstrijd is nog niet bekend. Zodra die is gespeeld en het verslag af is, geef je hier je cijfers.'
          : `Na ${clubs.home} – ${clubs.away} (${nextDayText(next)}) geef je hier je cijfers, zodra het verslag af is.`}
      </Text>
    </Card>
  )
}

/**
 * The card of the match that can be rated: the heading with the Tag and the moment the window
 * closes, the match, what to do, and then `children`: the form, the way in, or what was saved.
 */
export function OpenCard({
  children,
  closesAt,
  match,
  now,
}: {
  children: ReactNode
  closesAt: Date
  match: RatingMatch
  now: Date
}) {
  return (
    <Card aria-labelledby="geef-je-cijfers" game="uitblinker">
      <Heading id="geef-je-cijfers" level={2}>
        Geef je cijfers
      </Heading>
      <Text>
        <Tag tone="open">{deadlineTag(closesAt, now)}</Tag>
      </Text>
      <MatchLine match={match} now={now} />
      <Text>
        Geef elke speler die 30 minuten of langer speelde een cijfer van 1 tot 10. Je kunt ze wijzigen tot{' '}
        {closingText(closesAt)}.
      </Text>
      {children}
    </Card>
  )
}

/**
 * What a supporter sees after giving the grades: a notice with the moment the window closes and
 * the button to change them, and the table with their own grades. Nobody else's grades show
 * yet: the averages come when the window is closed.
 */
export function SavedView({
  closesAt,
  grades,
  players,
}: {
  closesAt: Date
  /** The grades of the supporter, by the number of the appearance. */
  grades: ReadonlyMap<number, number>
  players: readonly RatingPlayer[]
}) {
  return (
    <>
      <Notice>Je kunt ze wijzigen tot {closingText(closesAt)}.</Notice>
      <Form action={ratingPath} method="get">
        <Button appearance="soft" name="wijzigen" type="submit" value="1">
          Wijzigen
        </Button>
      </Form>
      <Text>Omdat je zelf cijfers gaf, zie je de tussenstand al. De rest ziet hem als het venster dicht is.</Text>
      <DataTable
        caption="Jouw cijfers"
        columns={['Speler', 'Jij']}
        rows={players.map((player) => ({ cells: [grades.get(player.appearanceId) ?? 0], header: player.name }))}
        sortable={false}
      />
    </>
  )
}

/** The card of a match whose report is not finished: no form yet, and what to wait for. */
export function WaitingCard({ match, now }: { match: RatingMatch; now: Date }) {
  return (
    <Card aria-labelledby="geef-je-cijfers" game="uitblinker">
      <Heading id="geef-je-cijfers" level={2}>
        Geef je cijfers
      </Heading>
      <Text>
        <Tag>Nog niet open</Tag>
      </Text>
      <MatchLine match={match} now={now} />
      <Text>{waitingText}</Text>
    </Card>
  )
}

/** The match of a card, in the look of the lists: the day and the competition small above. */
function MatchLine({ match, now }: { match: RatingMatch; now: Date }) {
  return (
    <Match
      competition={match.competition}
      {...matchMoment({ ...match, status: 'played' }, now)}
      extraTime={match.extraTime}
      goalsAgainst={match.goalsAgainst ?? 0}
      goalsFor={match.goalsFor ?? 0}
      home={match.home}
      opponent={match.opponent}
      reportHref={reportAddress(match.season, match.matchDate, match.clubSlug)}
      round={match.round}
      status="played"
    />
  )
}
