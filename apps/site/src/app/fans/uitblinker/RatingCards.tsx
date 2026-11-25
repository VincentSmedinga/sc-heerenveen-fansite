import type { ReactNode } from 'react'

import { seasonOf } from '@fansite/db/season'
import {
  Button,
  Card,
  CardLink,
  DataTable,
  Form,
  Heading,
  List,
  Notice,
  Tag,
  Text,
  WinnerList,
} from '@fansite/design-system'

import { rulesPath, yearWinnersPath } from '#src/fans-paths'
import { MatchLine } from '#src/fans/GameCards'
import {
  type MatchRatings,
  orderRatings,
  type RatedCoach,
  type RatedPlayer,
  ratingMinimum,
  resultLine,
  type SeasonWinner,
  uitblinkerOf,
} from '#src/fans/match-ratings'
import { clubsOf } from '#src/fans/prediction'
import {
  closingText,
  coachRow,
  deadlineTag,
  lateMessage,
  nextDayText,
  type RatingCoach,
  type RatingMatch,
  ratingPath,
  type RatingPlayer,
  waitingText,
} from '#src/fans/rating'
import { gradeText, RatingsTable, supportersText } from '#src/MatchRatingsCard'
import { matchesPath } from '#src/season-page'
import { seasonAddress } from '#src/seasons'

// The cards of the page of the game Uitblinker (issue 1470). Each one is a server component
// that gets what it shows; the form is a client component of its own (RatingForm).

/**
 * The card of a match whose window is closed, for everyone: the seal, the averages and the
 * number of supporters. It has nothing for a match that no supporter rated.
 */
export function ClosedResultCard({ match, now, ratings }: { match: RatingMatch; now: Date; ratings: MatchRatings }) {
  return (
    <Card aria-labelledby="uitslag" game="uitblinker">
      <Heading id="uitslag" level={2}>
        Uitslag van de laatste wedstrijd
      </Heading>
      <MatchLine match={match} now={now} played />
      {ratings.supporters < ratingMinimum ? null : <RatingsTable ratings={ratings} />}
      <Text appearance="meta">{supportersText(ratings.supporters)}.</Text>
    </Card>
  )
}

/**
 * The side card with the Uitblinker of each match of the season, the newest first, the link to
 * the matches and the link to the Uitblinkers of the year. It is always there (issue 1661), so
 * that last link is too: a season without an Uitblinker says so instead of the list.
 */
export function EarlierWinnersCard({ season, winners }: { season: string; winners: readonly SeasonWinner[] }) {
  return (
    <Card aria-labelledby="eerdere-winnaars" game="uitblinker">
      <Heading id="eerdere-winnaars" level={2}>
        Eerdere winnaars
      </Heading>
      {winners.length === 0 ? (
        <Text>Dit seizoen is er nog geen Uitblinker.</Text>
      ) : (
        <WinnerList
          items={winners.map((winner) => ({
            average: gradeText(winner.average),
            line: resultLine(winner),
            name: winner.name,
          }))}
        />
      )}
      <CardLink href={seasonAddress(matchesPath, season, seasonOf(new Date()))}>Alle wedstrijden</CardLink>
      <CardLink href={yearWinnersPath}>Uitblinker van het jaar</CardLink>
    </Card>
  )
}

/** The side card that says how the game works, in a few short lines. */
export function HowItWorksCard() {
  return (
    <Card aria-labelledby="zo-werkt-het" game="uitblinker">
      <Heading id="zo-werkt-het" level={2}>
        Zo werkt het
      </Heading>
      <List>
        <List.Item>
          Elke fan met een account geeft de spelers en de trainer van de laatste wedstrijd een cijfer.
        </List.Item>
        <List.Item>
          Het venster sluit als de volgende wedstrijd begint, en uiterlijk zeven dagen na de wedstrijd.
        </List.Item>
        <List.Item>Tot dan kun je je cijfers wijzigen.</List.Item>
        <List.Item>Als het venster dicht is, zien alle fans de uitslag.</List.Item>
      </List>
      <CardLink href={ratingRulesPath}>Spelregels</CardLink>
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
  heading = 'Geef je cijfers',
  match,
  now,
  withCoach = false,
}: {
  children: ReactNode
  closesAt: Date
  /** The heading: "Je cijfers staan" once the supporter has given them all. */
  heading?: string
  match: RatingMatch
  now: Date
  /** The match has a head coach, who gets a grade too. */
  withCoach?: boolean
}) {
  return (
    <Card aria-labelledby="geef-je-cijfers" game="uitblinker">
      <Heading id="geef-je-cijfers" level={2}>
        {heading}
      </Heading>
      <Text>
        <Tag tone="open">{deadlineTag(closesAt, now)}</Tag>
      </Text>
      <MatchLine match={match} now={now} played />
      <Text>
        Geef elke speler die 30 minuten of langer speelde een cijfer van 1 tot 10{withCoach ? ', en de trainer' : ''}.
        Je kunt ze wijzigen tot {closingText(closesAt)}.
      </Text>
      {children}
    </Card>
  )
}

/**
 * What a supporter sees after giving the grades: a notice with the moment the window closes and
 * the button to change them, and the table with their own grades and the standing so far. The
 * standing is for this supporter only, as a reward: the page of the match stays the same for
 * everyone until the window is closed.
 */
export function SavedView({
  closesAt,
  coach,
  coachGrade,
  grades,
  players,
  running,
  runningCoach,
}: {
  closesAt: Date
  /** The head coach of the match, or `null` for a match without one. */
  coach: null | RatingCoach
  /** The grade of the supporter for the coach. */
  coachGrade?: number
  /** The grades of the supporter, by the number of the appearance. */
  grades: ReadonlyMap<number, number>
  players: readonly RatingPlayer[]
  /** The averages so far, for each player with ratings. */
  running: readonly RatedPlayer[]
  /** The average so far of the head coach, when he has ratings. */
  runningCoach?: RatedCoach | undefined
}) {
  const byAppearance = new Map(running.map((player) => [player.appearanceId, player]))
  // The same order as the table of a closed match (`orderRatings`): the form lists the players
  // by name, and the line-up is the order of their appearances, so equal players keep that.
  const ordered = orderRatings(
    players
      .toSorted((a, b) => a.appearanceId - b.appearanceId)
      .map((player) => {
        const found = byAppearance.get(player.appearanceId)

        return { average: found?.average ?? 0, count: found?.count ?? 0, player }
      }),
  )
  const winner = uitblinkerOf(ordered)

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
        caption="Jouw cijfers en de tussenstand"
        columns={['Speler', 'Jij', { key: true, name: 'Gem' }]}
        rows={[
          ...ordered.map(({ player }) => {
            const found = byAppearance.get(player.appearanceId)

            return {
              cells: [
                grades.get(player.appearanceId) ?? 0,
                found !== undefined && found.count >= ratingMinimum
                  ? gradeText(found.average)
                  : 'nog te weinig cijfers',
              ],
              header: player.name,
              // In words, on a line of its own: a label in the cell is too wide for the column.
              ...(winner !== undefined && winner.player.appearanceId === player.appearanceId
                ? { secondary: 'Uitblinker' }
                : {}),
            }
          }),
          // The coach is the last row, after a heavier line, on the same threshold as players.
          ...(coach === null
            ? []
            : [
                {
                  cells: [
                    coachGrade ?? 0,
                    runningCoach !== undefined && runningCoach.count >= ratingMinimum
                      ? gradeText(runningCoach.average)
                      : 'nog te weinig cijfers',
                  ],
                  header: coachRow(coach.name),
                  total: true,
                },
              ]),
        ]}
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
      <MatchLine match={match} now={now} played />
      <Text>{waitingText}</Text>
    </Card>
  )
}

/** The part of the rules page about this game. */
const ratingRulesPath = `${rulesPath}#uitblinker`
