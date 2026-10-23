import type { Metadata } from 'next'

import { Card, DiscussionItem, Heading, Link, List, NewsItem, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { getDiscussions } from '../discussions'
import { reviewBranch } from '../env'
import { reasonOf } from '../errors'
import { forumUrl } from '../forum'
import { getHeadlines } from '../headlines'
import { pageMetadata } from '../metadata'
import { dateTimeOf, formatDayAndTime, formatDiscussionTime } from '../news'
import { ServerError, serverErrorTitle } from '../ServerError'
import { withBranch } from '../title'

// Render on each request, so the build never reads the database. getHeadlines caches the list itself.
export const dynamic = 'force-dynamic'

/**
 * The headlines of the week and the newest discussions of the forum, or undefined when the database can't give them. A
 * page that throws gets an empty page with a 500 from Next.js, and the text only after JavaScript runs. So this page
 * catches the error and shows the error page itself, in the HTML. `cache` makes the page and its metadata share one call
 * per request.
 */
const loadContent = cache(async () => {
  try {
    const [headlines, discussions] = await Promise.all([getHeadlines(), getDiscussions()])

    return { discussions, headlines }
  } catch (error) {
    console.error(`Could not read the headlines and discussions for the homepage: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata(): Promise<Metadata> {
  // A page that failed answers 200, so noindex keeps search engines from keeping it. The title template of the layout
  // doesn't apply to the page in its own segment, so the title of the error page is the title alone.
  return (await loadContent()) === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata('/')
}

export default async function HomePage() {
  const content = await loadContent()

  if (content === undefined) {
    return <ServerError retryHref="/" />
  }

  const { discussions, headlines } = content
  const now = new Date()

  return (
    <>
      <Page.Main>
        {/* The logo just above already shows the name, so the h1 is for screen readers only. Every page has one h1. */}
        <Heading className="hf-visually-hidden" level={1}>
          sc Heerenveen Fansite
        </Heading>
        <Card aria-labelledby="media-heading">
          <Heading id="media-heading" level={2}>
            Laatste nieuws
          </Heading>
          {headlines.length === 0 ? (
            <Text>We hebben deze week nog geen nieuws gevonden. Kijk straks nog eens.</Text>
          ) : (
            <List role="list">
              {headlines.map((item, index) => (
                <List.Item key={index}>
                  <NewsItem
                    dateTime={dateTimeOf(item.publishedAt)}
                    headline={item.title}
                    href={item.url}
                    paywalled={item.paywalled}
                    source={item.sourceName}
                    time={formatDayAndTime(item.publishedAt)}
                  />
                </List.Item>
              ))}
            </List>
          )}
        </Card>
        <Text>
          Welke media we volgen, lees je bij <Link href="/bronnen">Onze bronnen</Link>.
        </Text>
      </Page.Main>
      <Page.Sidebar aria-label="Van het forum">
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
            <Link href={forumUrl}>Naar het forum</Link>
          </Text>
        </Card>
      </Page.Sidebar>
    </>
  )
}
