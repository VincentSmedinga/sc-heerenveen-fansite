import type { PublicStandingsRow } from '@fansite/db/queries'
import type { ReactNode } from 'react'

import {
  Card,
  DataTable,
  type DataTableRow,
  DescriptionList,
  Heading,
  Link,
  List,
  MarkRow,
  MatchHeader,
  type MatchHeaderFact,
  NewsItem,
  OutcomeBar,
  PlayerName,
  Text,
} from '@fansite/design-system'

import type { ClubHeadline } from './opponents'

import { formatTableDay } from './match-format'
import { matchSearchPath } from './match-search'
import { markOf, MatchLine } from './MatchViews'
import { dateTimeOf, formatNewsTime } from './news'
import { opponentsPath } from './opponents'
import { type HeadToHead } from './preview-head-to-head'
import { type PreviewScorer, type PreviewScorers } from './preview-scorers'
import { type ClubForm, standingRoundOf, standingSentenceOf, type StandingSliceItem } from './preview-standing'
import { meetingScoreOf } from './upcoming-match'

// The parts of the page of the Voorbeschouwing, a match that has not begun: the header and the
// cards Stand, Vorm, Onderling, Onze schutters and Nieuws. They take plain data, so the page
// and its tests share them.

/** The id of the card Nieuws. */
const newsId = 'nieuws'

/** The id of the card Stand. */
const standingId = 'stand'

/** The id of the card Vorm. */
const formId = 'vorm'

/** The name of our own club in the table. */
const ourClub = 'sc Heerenveen'

/** The id of the card Onderling. */
const headToHeadId = 'onderling'

/** The id of the card Onze schutters. */
const scorersId = 'onze-schutters'

/** The words for how many matches the list "De laatste ... daar" shows, from one to five. */
const countWords = ['', '', 'twee', 'drie', 'vier', 'vijf']

/** A goal difference with its sign, as a table shows it: `+8`, `−3` and `0`. */
const signed = (difference: number) =>
  difference > 0 ? `+${difference}` : difference < 0 ? `−${Math.abs(difference)}` : '0'

/**
 * The card "Vorm": for each club a line of its own, under each other, with the last five league
 * results, the oldest first, and what they add up to. A club without a result has no line, and
 * with no line at all there is no card.
 */
export function PreviewFormCard({ forms }: { forms: readonly ClubForm[] }): null | ReactNode {
  if (forms.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={formId}>
      <Heading id={formId} level={2}>
        Vorm
      </Heading>
      <Text appearance="meta">De laatste vijf in de competitie, de oudste eerst</Text>
      <List role="list">
        {forms.map((form) => (
          <List.Item key={form.club}>
            <MarkRow marks={form.marks.map((result) => markOf[result])} title={form.club} />
            <Text appearance="meta">
              {`${form.points} ${form.points === 1 ? 'punt' : 'punten'} · doelpunten ${form.goalsFor}–${form.goalsAgainst}`}
            </Text>
          </List.Item>
        ))}
      </List>
    </Card>
  )
}

/**
 * The header of the page, in the strong card: the title for a screen reader (the `h1`, visually
 * hidden since the clubs are what the eye sees), the clubs with dashes in place of a result,
 * and the facts: the competition and the round, the day with the kick-off, and the stadium.
 */
export function PreviewHeader({
  facts,
  home,
  opponent,
  title,
}: {
  facts: MatchHeaderFact[]
  home: boolean
  opponent: string
  title: string
}) {
  return (
    <Card aria-labelledby="titel" surface="strong">
      <Heading className="hf-visually-hidden" id="titel" level={1}>
        {title}
      </Heading>
      <MatchHeader
        facts={facts}
        goalsAgainst={0}
        goalsFor={0}
        home={home}
        opponent={opponent}
        phase="upcoming"
        pill="Voorbeschouwing"
      />
    </Card>
  )
}

/**
 * The card "Onderling in <plaats>": how the matches against the club went on the side where the
 * match to come is played, the last five of them as `Match` shows them, the last win and the
 * biggest win, and the links to the matches and to the club. `place` is the place of the
 * ground of the opponent (the stadium of the match), and without it the card says "bij <club>".
 * A club we have not played on that side gives no card.
 */
export function PreviewHeadToHeadCard({
  headToHead,
  home,
  name,
  now,
  place,
  slug,
}: {
  headToHead: HeadToHead | undefined
  home: boolean
  name: string
  now: Date
  place: string | undefined
  slug: string
}): null | ReactNode {
  if (headToHead === undefined) {
    return null
  }

  const { biggestWin, last, lastWin, since, tally } = headToHead
  const where = home ? 'in Heerenveen' : place === undefined ? `bij ${name}` : `in ${place}`
  const score = (meeting: NonNullable<typeof lastWin>) => {
    const [first, second] = meetingScoreOf(meeting, meeting.home)

    return `${formatTableDay(meeting.matchDate)}, ${first}–${second}`
  }
  const facts = [
    ...(lastWin === undefined ? [] : [{ term: 'Laatste zege daar', text: score(lastWin) }]),
    ...(biggestWin === undefined ? [] : [{ term: 'Grootste zege daar', text: score(biggestWin) }]),
  ]

  return (
    <Card aria-labelledby={headToHeadId}>
      <Heading id={headToHeadId} level={2}>
        {`Onderling ${where}`}
      </Heading>
      <Heading appearance={3} level={3}>
        {`${tally.played} keer ${home ? `thuis tegen ${name}` : where} sinds ${since}`}
      </Heading>
      <OutcomeBar draws={tally.drawn} losses={tally.lost} wins={tally.won} />
      <Text>
        {`${tally.won} gewonnen · ${tally.drawn} gelijk · ${tally.lost} verloren · doelpunten ${tally.goalsFor}–${tally.goalsAgainst}`}
      </Text>
      <Heading appearance={4} level={3}>
        {last.length === 1 ? 'De laatste daar' : `De laatste ${countWords[last.length]} daar`}
      </Heading>
      <List role="list">
        {last.map((meeting) => (
          <List.Item key={meeting.id}>
            <MatchLine match={meeting} now={now} withYear />
          </List.Item>
        ))}
      </List>
      {facts.length > 0 && (
        <DescriptionList stacked>
          {facts.map(({ term, text }) => (
            <DescriptionList.Item key={term} term={term}>
              <Text>{text}</Text>
            </DescriptionList.Item>
          ))}
        </DescriptionList>
      )}
      <Text>
        <Link
          href={`${matchSearchPath}?tegen=${encodeURIComponent(slug)}&waar=${home ? 'thuis' : 'uit'}`}
          icon="arrow-right"
        >
          {tally.played === 1 ? `De wedstrijd ${where}` : `Alle ${tally.played} wedstrijden ${where}`}
        </Link>
      </Text>
      <Text>
        <Link href={`${opponentsPath}/${slug}`} icon="arrow-right">
          {`Alles over ${name}`}
        </Link>
      </Text>
    </Card>
  )
}

/**
 * The card "Nieuws over <club>": the newest headlines that name the club, as `NewsItem` shows
 * them everywhere, and the link to the news about it. Without a headline there is no card and
 * no sentence.
 */
export function PreviewNewsCard({
  headlines,
  name,
  now,
}: {
  headlines: readonly ClubHeadline[]
  name: string
  now: Date
}): null | ReactNode {
  if (headlines.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={newsId}>
      <Heading id={newsId} level={2}>
        {`Nieuws over ${name}`}
      </Heading>
      <List role="list">
        {headlines.map((item, index) => (
          <List.Item key={index}>
            <NewsItem
              dateTime={dateTimeOf(item.publishedAt)}
              headline={item.title}
              href={item.url}
              paywalled={item.paywalled}
              source={item.sourceName}
              time={formatNewsTime(item.publishedAt, now)}
            />
          </List.Item>
        ))}
      </List>
      <Text>
        <Link href={`/nieuws/zoeken?q=${encodeURIComponent(name)}`} icon="arrow-right">
          {`Meer nieuws over ${name}`}
        </Link>
      </Text>
    </Card>
  )
}

/**
 * The card "Onze schutters in <plaats>": who of ours scored on the side where the match to come
 * is played. First the scorers who are in the squad now, in a soft box of their own, then the
 * five who scored most. `place` is the place of the ground of the opponent, and without it the
 * card says "bij <club>", as the card Onderling does. Without a goal of ours on that side there
 * is no card.
 */
export function PreviewScorersCard({
  home,
  name,
  place,
  scorers,
}: {
  home: boolean
  name: string
  place: string | undefined
  scorers: PreviewScorers | undefined
}): null | ReactNode {
  if (scorers === undefined) {
    return null
  }

  const where = home ? 'in Heerenveen' : place === undefined ? `bij ${name}` : `in ${place}`
  const squadId = `${scorersId}-selectie`

  return (
    <Card aria-labelledby={scorersId}>
      <Heading id={scorersId} level={2}>
        {`Onze schutters ${where}`}
      </Heading>
      {scorers.squad.length > 0 && (
        <Card aria-labelledby={squadId} surface="soft">
          <Heading id={squadId} level={3}>
            Uit de selectie van nu
          </Heading>
          <ScorersTable caption={`Spelers uit de selectie van nu die scoorden ${where}`} scorers={scorers.squad} />
        </Card>
      )}
      <Heading level={3}>Het vaakst</Heading>
      <ScorersTable caption={`De spelers die ${where} het vaakst scoorden`} scorers={scorers.mostOften} />
    </Card>
  )
}

/**
 * The card "Stand": the stretch of the league table from one club to the other with both
 * clubs marked, the sentence about the gap between them, and the link to the whole table.
 * Without a stretch (a club that is not in the table) there is no card and no sentence.
 */
export function PreviewStandingCard({
  opponent,
  slice,
  standings,
}: {
  opponent: string
  slice: readonly StandingSliceItem[] | undefined
  standings: readonly PublicStandingsRow[]
}): null | ReactNode {
  const sentence = standingSentenceOf(standings, opponent)

  if (slice === undefined || sentence === undefined) {
    return null
  }

  const round = `Na speelronde ${standingRoundOf(standings)}`
  const rows = slice.map((item): DataTableRow => {
    if (item.kind === 'gap') {
      const text = `${item.hidden} clubs ertussen`

      return { cells: [], display: text, gap: true, header: text }
    }

    const { row } = item

    return {
      cells: [row.played, signed(row.goalDifference), row.points],
      header: row.club,
      highlight: item.marked,
      ...(item.marked && { note: row.club === ourClub ? 'onze club' : 'de tegenstander' }),
      position: row.position,
    }
  })

  return (
    <Card aria-labelledby={standingId}>
      <Heading id={standingId} level={2}>
        Stand
      </Heading>
      <Text appearance="meta">{round}</Text>
      <DataTable
        caption={`Stand, ${round.toLowerCase()}`}
        columns={[
          'Club',
          { abbreviation: 'G', name: 'gespeeld' },
          { abbreviation: 'DS', name: 'doelsaldo' },
          { abbreviation: 'P', key: true, name: 'punten' },
        ]}
        rows={rows}
      />
      <Text>{sentence}</Text>
      <Text>
        <Link href="/wedstrijden#stand" icon="arrow-right">
          De hele stand
        </Link>
      </Text>
    </Card>
  )
}

/** The table of scorers: the player, the year of the last goal and the goals. */
function ScorersTable({ caption, scorers }: { caption: string; scorers: readonly PreviewScorer[] }) {
  return (
    <DataTable
      caption={caption}
      columns={['Speler', 'Laatst', 'Goals']}
      rows={scorers.map((scorer): DataTableRow => ({
        // The year is text, as a number would get a point between the thousands.
        cells: [String(scorer.last), scorer.goals],
        display: <PlayerName givenName={scorer.givenName} href={scorer.href} surname={scorer.surname} />,
        header: scorer.name,
      }))}
    />
  )
}
