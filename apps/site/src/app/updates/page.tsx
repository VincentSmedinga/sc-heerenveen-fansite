import type { Metadata } from 'next'

import { Heading, Link, List, Page, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { pageMetadata } from '../../metadata'
import { getReleases } from '../../releases'
import { anchorOf, dateOf, feedPath, updatesPath, updatesTitle } from '../../updates'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV,
// which the build doesn't know. The versions are still those in the build (see releases.ts).
export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  const metadata = pageMetadata(updatesPath, updatesTitle)

  return {
    ...metadata,
    alternates: { ...metadata.alternates, types: { 'application/rss+xml': [{ title: updatesTitle, url: feedPath }] } },
  }
}

const feedLine = (
  <>
    Volg nieuwe versies met de <Link href={feedPath}>RSS-feed van Updates</Link>.
  </>
)

export default function UpdatesPage() {
  const releases = getReleases()

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>{updatesTitle}</Heading>
        {/* The first paragraph under the h1 is the intro: the text without releases, or else the
            line about the feed. */}
        {releases.length === 0 ? (
          <>
            <Text appearance="intro">We hebben nog geen versie uitgebracht. Hier lees je straks wat er nieuw is.</Text>
            <Text>{feedLine}</Text>
          </>
        ) : (
          <Text appearance="intro">{feedLine}</Text>
        )}
        {releases.map((release) => (
          <Fragment key={release.version}>
            {/* The date, with the number of the version small after it, like "sinds 1997" in the
                logo. */}
            <Heading id={anchorOf(release)} level={2}>
              {`${dateOf(release)} `}
              <Text appearance="meta" as="span">{`versie ${release.version}`}</Text>
            </Heading>
            <List>
              {release.sentences.map((sentence) => (
                <List.Item key={sentence}>{sentence}</List.Item>
              ))}
            </List>
          </Fragment>
        ))}
      </Page.Cell>
    </Page.Main>
  )
}
