import type { Metadata } from 'next'

import { Heading, Link, List, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { describePolicy, groupByKind, websiteOf } from '../../register'
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
      <Text>
        Van elk bericht tonen we de kop, de link en de naam van de bron. Meer tonen we alleen als de bron ons
        toestemming geeft: een intro, een afbeelding of het hele bericht op onze pagina. Dat laatste heet insluiten.
      </Text>
      {groups.length === 0 ? (
        <Text>We hebben nog geen bronnen. Binnenkort lees je hier van welke media we koppen en links tonen.</Text>
      ) : (
        groups.map(({ heading, kind, sources }) => (
          <Fragment key={kind}>
            <Heading level={2}>{heading}</Heading>
            <List>
              {sources.map((source) => (
                <List.Item key={source.domain}>
                  <Link href={websiteOf(source)}>{source.name}</Link>: {describePolicy(source)}
                </List.Item>
              ))}
            </List>
          </Fragment>
        ))
      )}
    </>
  )
}
