import type { Metadata } from 'next'

import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { reasonOf } from '../../errors'
import { groupByKind, websiteOf } from '../../register'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { getSources } from '../../sources'

const email = 'fansite@heerenveen.org'

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
    <>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Onze bronnen</Heading>
          <Text>
            {groups.length === 0
              ? 'We hebben nog geen bronnen. Binnenkort lees je hier waar we het nieuws vandaan halen.'
              : 'Dit zijn de bronnen waar we het nieuws over sc Heerenveen vandaan halen.'}
          </Text>
        </Page.Cell>
        {groups.map(({ heading, kind, sources }) => (
          <Card aria-labelledby={`${kind}-heading`} key={kind}>
            <Heading id={`${kind}-heading`} level={2}>
              {heading}
            </Heading>
            <List loose>
              {sources.map((source) => (
                <List.Item key={source.domain}>
                  <Link href={websiteOf(source)}>{source.name}</Link>
                  {source.description && <Text>{source.description}</Text>}
                </List.Item>
              ))}
            </List>
          </Card>
        ))}
      </Page.Main>
      <Page.Sidebar aria-label="Contact over bronnen">
        <Card aria-labelledby="suggest-heading" surface="soft">
          <Heading id="suggest-heading" level={2}>
            Mis je een bron?
          </Heading>
          <Text>
            Schrijft een medium over sc Heerenveen en staat het hier nog niet? Stuur ons de naam en de website via{' '}
            <Link href={`mailto:${email}`}>{email}</Link>.
          </Text>
        </Card>
        <Card aria-labelledby="inquiry-heading" surface="warm">
          <Heading id="inquiry-heading" level={2}>
            Ben je zelf een bron?
          </Heading>
          <Text>
            Heb je een vraag of een verzoek over hoe we jouw medium tonen? Mail ons via{' '}
            <Link href={`mailto:${email}`}>{email}</Link>.
          </Text>
        </Card>
      </Page.Sidebar>
    </>
  )
}
