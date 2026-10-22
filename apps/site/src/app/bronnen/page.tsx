import type { Metadata } from 'next'

import { Heading, Link, List, Page, Text } from '@fansite/design-system'
import { cache, Fragment } from 'react'

import { reasonOf } from '../../errors'
import { groupByKind, websiteOf } from '../../register'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { getSources } from '../../sources'

// Render on each request, so the build never reads the database. getSources caches the list itself.
export const dynamic = 'force-dynamic'

/**
 * The sources, or undefined when the register can't give them. A page that throws gets an empty page with a 500 from
 * Next.js, and the text only after JavaScript runs. So this page catches the error and shows the error page itself, in
 * the HTML. `cache` makes the page and its metadata share one call per request.
 */
const loadSources = cache(async () => {
  try {
    return await getSources()
  } catch (error) {
    console.error(`Could not read the sources for /bronnen: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata(): Promise<Metadata> {
  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return (await loadSources()) === undefined
    ? { robots: { index: false }, title: serverErrorTitle }
    : { title: 'Onze bronnen' }
}

export default async function SourcesPage() {
  const sources = await loadSources()

  if (sources === undefined) {
    return <ServerError retryHref="/bronnen" />
  }

  const groups = groupByKind(sources)

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Onze bronnen</Heading>
        {groups.length === 0 ? (
          <Text>We hebben nog geen bronnen. Binnenkort lees je hier waar we het nieuws vandaan halen.</Text>
        ) : (
          <>
            <Text>Dit zijn de bronnen waar we het nieuws over sc Heerenveen vandaan halen.</Text>
            {groups.map(({ heading, kind, sources }) => (
              <Fragment key={kind}>
                <Heading level={2}>{heading}</Heading>
                <List loose>
                  {sources.map((source) => (
                    <List.Item key={source.domain}>
                      <Link href={websiteOf(source)}>{source.name}</Link>
                      {source.description && <Text>{source.description}</Text>}
                    </List.Item>
                  ))}
                </List>
              </Fragment>
            ))}
          </>
        )}
      </Page.Cell>
    </Page.Main>
  )
}
