import type { Metadata } from 'next'

import { Heading, Link, List, Page, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { pageMetadata } from '../../metadata'
import { getReleases } from '../../releases'
import { anchorOf, dateOf, feedPath, whatsNewPath, whatsNewTitle } from '../../whats-new'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV, which the build doesn't know.
// The versions are still those in the build (see releases.ts).
export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  const metadata = pageMetadata(whatsNewPath, whatsNewTitle)

  return {
    ...metadata,
    alternates: { ...metadata.alternates, types: { 'application/rss+xml': [{ title: whatsNewTitle, url: feedPath }] } },
  }
}

export default function WhatsNewPage() {
  const releases = getReleases()

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>{whatsNewTitle}</Heading>
        {releases.length === 0 && (
          <Text>We hebben nog geen versie uitgebracht. Hier lees je straks wat er nieuw is.</Text>
        )}
        <Text>
          Volg nieuwe versies met de <Link href={feedPath}>RSS-feed van Wat is er nieuw</Link>.
        </Text>
        {releases.map((release) => (
          <Fragment key={release.version}>
            {/* The date, with the number of the version small after it, like "sinds 1997" in the logo. */}
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
