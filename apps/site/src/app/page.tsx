import type { Metadata } from 'next'

import { Heading, Link, List, NewsItem, Text } from '@fansite/design-system'
import { cache, Fragment } from 'react'

import { reasonOf } from '../errors'
import { getHeadlines } from '../headlines'
import { dateTimeOf, formatTime, groupByDay } from '../news'
import { ServerError, serverErrorTitle } from '../ServerError'

// Render on each request, so the build never reads the database. getHeadlines caches the list itself.
export const dynamic = 'force-dynamic'

/**
 * The headlines of the week, or undefined when the database can't give them. A page that throws gets an empty page with
 * a 500 from Next.js, and the text only after JavaScript runs. So this page catches the error and shows the error page
 * itself, in the HTML. `cache` makes the page and its metadata share one call per request.
 */
const loadHeadlines = cache(async () => {
  try {
    return await getHeadlines()
  } catch (error) {
    console.error(`Could not read the headlines for the homepage: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata(): Promise<Metadata> {
  // A page that failed answers 200, so noindex keeps search engines from keeping it. The title template of the layout
  // doesn't apply to the page in its own segment, so the title of the error page is the title alone.
  return (await loadHeadlines()) === undefined ? { robots: { index: false }, title: serverErrorTitle } : {}
}

export default async function HomePage() {
  const headlines = await loadHeadlines()

  if (headlines === undefined) {
    return <ServerError retryHref="/" />
  }

  const days = groupByDay(headlines)

  return (
    <>
      <Heading level={1}>sc Heerenveen Fansite</Heading>
      <Heading level={2}>sc Heerenveen in de media</Heading>
      {days.length === 0 ? (
        <Text>We hebben deze week nog geen nieuws gevonden. Kijk straks nog eens.</Text>
      ) : (
        days.map(({ day, items, key }) => (
          <Fragment key={key}>
            <Heading level={3}>{day}</Heading>
            <List loose>
              {items.map((item, index) => (
                <List.Item key={index}>
                  <NewsItem
                    dateTime={dateTimeOf(item.publishedAt)}
                    headline={item.title}
                    href={item.url}
                    paywalled={item.paywalled}
                    source={item.sourceName}
                    time={formatTime(item.publishedAt)}
                  />
                </List.Item>
              ))}
            </List>
          </Fragment>
        ))
      )}
      <Text>
        Welke media we volgen, lees je bij <Link href="/bronnen">Onze bronnen</Link>.
      </Text>
    </>
  )
}
