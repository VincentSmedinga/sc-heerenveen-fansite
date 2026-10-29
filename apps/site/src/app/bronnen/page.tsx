import type { Metadata } from 'next'

import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { email } from '../../contact'
import { reasonOf } from '../../errors'
import { pageMetadata } from '../../metadata'
import { groupByKind, kindAnchors, websiteOf } from '../../register'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { getSources } from '../../sources'

// Render on each request, so the build never reads the database. getSources caches the list
// itself.
export const dynamic = 'force-dynamic'

/**
 * The sources, or undefined when the register can't give them. A page that throws gets an empty
 * page with a 500 from Next.js, and the text only after JavaScript runs. So this page catches
 * the error and shows the error page itself, in the HTML. `cache` makes the page and its
 * metadata share one call per request.
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
    : pageMetadata('/bronnen', 'Onze bronnen')
}

export default async function SourcesPage() {
  const sources = await loadSources()

  if (sources === undefined) {
    return <ServerError retryHref="/bronnen" />
  }

  const groups = groupByKind(sources)

  return (
    <>
      <Page.Main
        intro={
          <>
            <Heading level={1}>Onze bronnen</Heading>
            {groups.length === 0 && (
              <Text appearance="intro">
                We hebben nog geen bronnen. Binnenkort lees je hier waar we het nieuws vandaan halen.
              </Text>
            )}
          </>
        }
      >
        {groups.map(({ heading, kind, sources }) => (
          <Card aria-labelledby={kindAnchors[kind]} key={kind}>
            <Heading anchor id={kindAnchors[kind]} level={2}>
              {heading}
            </Heading>
            <List loose>
              {sources.map((source) => (
                <List.Item key={source.domain}>
                  <Link href={websiteOf(source)} icon="external-link">
                    {source.name}
                  </Link>
                  {source.description && <Text>{source.description}</Text>}
                </List.Item>
              ))}
            </List>
          </Card>
        ))}
      </Page.Main>
      <Page.Sidebar aria-label="Meer over bronnen" split>
        <Card aria-labelledby="voorstellen" surface="soft">
          <Heading anchor id="voorstellen" level={2}>
            Mis je een bron?
          </Heading>
          <Text>
            Schrijft een medium over sc Heerenveen en staat het hier nog niet? Stuur ons de naam en de website via{' '}
            <Link href={`mailto:${email}`} icon="envelope">
              {email}
            </Link>
            .
          </Text>
        </Card>
        <Card aria-labelledby="uitgever" surface="strong">
          <Heading anchor id="uitgever" level={2}>
            Ben je zelf een bron?
          </Heading>
          <Text>
            Heb je een vraag of een verzoek over hoe we jouw medium tonen? Mail ons via{' '}
            <Link href={`mailto:${email}`} icon="envelope">
              {email}
            </Link>
            .
          </Text>
        </Card>
        <Card aria-labelledby="nieuwsbrief-lc" surface="warm">
          <Heading anchor id="nieuwsbrief-lc" level={2}>
            Abonneer je op de nieuwsbrief van de LC!
          </Heading>
          <Text>
            Misschien vergat Sander de Vries het in Omroep Abe te noemen – dan helpen we graag een handje:{' '}
            <Link href="https://www.lc.nl/sport/nieuwsbrief-sc-heerenveen/157167352.html" icon="external-link">
              schrijf je snel in
            </Link>
            .
          </Text>
        </Card>
      </Page.Sidebar>
    </>
  )
}
