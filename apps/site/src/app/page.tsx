import type { Metadata } from 'next'

import { Button, Card, DiscussionItem, Form, Heading, Link, List, NewsItem, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { getDiscussions } from '../discussions'
import { reviewBranch } from '../env'
import { reasonOf } from '../errors'
import { forumUrl } from '../forum'
import { getHeadlines, parseHeadlineCount } from '../headlines'
import { moreHeadlines } from '../items-per-card'
import { pageMetadata } from '../metadata'
import { dateTimeOf, episodeDetails, formatDiscussionTime, formatEpisodeTime, formatNewsTime } from '../news'
import { getLatestEpisodes } from '../podcasts'
import { ServerError, serverErrorTitle } from '../ServerError'
import { withBranch } from '../title'

// Render on each request, so the build never reads the database. getHeadlines caches the list
// itself.
export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

/**
 * The newest `count` headlines, the newest discussions of the forum and the newest podcast
 * episodes, or undefined when the database can't give them. A page that throws gets an empty
 * page with a 500 from Next.js, and the text only after JavaScript runs. So this page catches
 * the error and shows the error page itself, in the HTML. `cache` makes the page and its
 * metadata share one call per request; its argument is a plain value, because `cache` compares
 * objects by identity.
 */
const loadContent = cache(async (count: number) => {
  try {
    const [{ headlines, more }, discussions, episodes] = await Promise.all([
      getHeadlines(count),
      getDiscussions(),
      getLatestEpisodes(),
    ])

    return { discussions, episodes, headlines, more }
  } catch (error) {
    console.error(`Could not read the headlines, discussions and episodes for the homepage: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  // A page that failed answers 200, so noindex keeps search engines from keeping it. The title
  // template of the layout doesn't apply to the page in its own segment, so the title of the
  // error page is the title alone. A page with `?nieuws=` is the homepage with more headlines:
  // it has the homepage as its canonical address, so no search query is given.
  const { nieuws } = await searchParams

  return (await loadContent(parseHeadlineCount(nieuws))) === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata('/')
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { nieuws } = await searchParams
  const count = parseHeadlineCount(nieuws)
  const content = await loadContent(count)

  if (content === undefined) {
    return <ServerError retryHref="/" />
  }

  const { discussions, episodes, headlines, more } = content
  const now = new Date()

  return (
    <>
      <Page.Main>
        {/* The logo just above already shows the name, so the h1 is for screen readers only.
            Every page has one h1. */}
        <Heading className="hf-visually-hidden" level={1}>
          sc Heerenveen Fansite
        </Heading>
        <Card aria-labelledby="media-heading">
          <Heading id="media-heading" level={2}>
            Laatste nieuws
          </Heading>
          {headlines.length === 0 ? (
            <Text>We hebben nog geen nieuws gevonden. Kijk straks nog eens.</Text>
          ) : (
            <List role="list">
              {headlines.map((item, index) => (
                // The number of a headline in the address of the button, so the page that loads
                // again can start at the first new one.
                <List.Item id={`nieuws-${index + 1}`} key={index}>
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
          )}
          {more && (
            // Works without JavaScript: the form loads the page again with more headlines in
            // the address, and the part after the hash brings the visitor to the first of the
            // new ones, so they stay in place.
            <Form action={`/#nieuws-${headlines.length + 1}`} method="get">
              <Button appearance="soft" icon="plus" name="nieuws" type="submit" value={String(count + moreHeadlines)}>
                {`Laad ${moreHeadlines} meer`}
              </Button>
            </Form>
          )}
        </Card>
        <Text>
          Welke media we volgen, lees je bij <Link href="/bronnen">Onze bronnen</Link>.
        </Text>
      </Page.Main>
      <Page.Sidebar aria-label="Van het forum en de podcasts">
        <Card aria-labelledby="discussions-heading">
          <Heading id="discussions-heading" level={2}>
            Nieuwste discussies
          </Heading>
          {discussions.length === 0 ? (
            <Text>We hebben nog geen discussies van het forum.</Text>
          ) : (
            <List role="list">
              {discussions.map((discussion, index) => (
                <List.Item key={index}>
                  <DiscussionItem
                    dateTime={dateTimeOf(discussion.lastPostedAt)}
                    href={discussion.url}
                    lastPostedBy={discussion.lastPostedBy}
                    replies={discussion.replyCount}
                    time={formatDiscussionTime(discussion.lastPostedAt, now)}
                    title={discussion.title}
                  />
                </List.Item>
              ))}
            </List>
          )}
          <Text>
            <Link href={forumUrl} icon="external-link">
              Naar het forum
            </Link>
          </Text>
        </Card>
        <Card aria-labelledby="episodes-heading">
          <Heading id="episodes-heading" level={2}>
            Nieuwste podcasts
          </Heading>
          {episodes.length === 0 ? (
            <Text>We hebben nog geen podcastafleveringen gevonden.</Text>
          ) : (
            <List role="list">
              {episodes.map((episode, index) => (
                <List.Item key={index}>
                  <NewsItem
                    dateTime={dateTimeOf(episode.publishedAt)}
                    details={episodeDetails(episode)}
                    headline={episode.title}
                    href={episode.url}
                    source={episode.sourceName}
                    time={formatEpisodeTime(episode.publishedAt, now)}
                  />
                </List.Item>
              ))}
            </List>
          )}
          <Text>
            <Link href="/podcasts" icon="arrow-right">
              Alle podcasts
            </Link>
          </Text>
        </Card>
      </Page.Sidebar>
    </>
  )
}
