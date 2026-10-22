import type { Metadata } from 'next'

import { Heading, Link, List, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { groupByKind, websiteOf } from '../../register'
import { getSources } from '../../sources'

export const metadata: Metadata = {
  title: 'Onze bronnen',
}

// Render on each request, so the build never reads the database. getSources caches the list itself.
export const dynamic = 'force-dynamic'

export default async function SourcesPage() {
  const groups = groupByKind(await getSources())

  return (
    <>
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
    </>
  )
}
