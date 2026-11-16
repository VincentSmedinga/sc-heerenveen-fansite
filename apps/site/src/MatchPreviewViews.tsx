import type { ReactNode } from 'react'

import { Card, Heading, Link, List, MatchHeader, type MatchHeaderFact, NewsItem, Text } from '@fansite/design-system'

import type { ClubHeadline } from './opponents'

import { dateTimeOf, formatNewsTime } from './news'

// The parts of the page of the Voorbeschouwing, a match that has not begun: the header and the
// card Nieuws. They take plain data, so the page and its tests share them. The cards of the
// next issues of the series (#1317, #1318 and #1319) are added in the page, each in a cell of
// its own.

/** The id of the card Nieuws. */
const newsId = 'nieuws'

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
