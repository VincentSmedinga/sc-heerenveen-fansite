import type { PublicStandingsRow } from '@fansite/db/queries'
import type { ReactNode } from 'react'

import {
  Card,
  DataTable,
  type DataTableRow,
  Heading,
  Link,
  List,
  MarkRow,
  MatchHeader,
  type MatchHeaderFact,
  NewsItem,
  Text,
} from '@fansite/design-system'

import type { ClubHeadline } from './opponents'

import { markOf } from './MatchViews'
import { dateTimeOf, formatNewsTime } from './news'
import { type ClubForm, standingRoundOf, standingSentenceOf, type StandingSliceItem } from './preview-standing'

// The parts of the page of the Voorbeschouwing, a match that has not begun: the header and the
// cards Stand, Vorm and Nieuws. They take plain data, so the page and its tests share them. The
// cards of the next issues of the series (#1318 and #1319) are added in the page, each in a
// cell of its own.

/** The id of the card Nieuws. */
const newsId = 'nieuws'

/** The id of the card Stand. */
const standingId = 'stand'

/** The id of the card Vorm. */
const formId = 'vorm'

/** The name of our own club in the table. */
const ourClub = 'sc Heerenveen'

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
