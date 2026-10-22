import type { Metadata } from 'next'

import { Heading, Link, List, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { getReleases } from '../../releases'
import { anchorOf, dateOf, feedPath, whatsNewTitle } from '../../whats-new'

export const metadata: Metadata = {
  alternates: { types: { 'application/rss+xml': [{ title: whatsNewTitle, url: feedPath }] } },
  title: whatsNewTitle,
}

// A static page: Next.js renders it when the site is built, with the versions in that build.
export default function WhatsNewPage() {
  const releases = getReleases()

  return (
    <>
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
    </>
  )
}
