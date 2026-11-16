import type { Metadata } from 'next'

import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { adminAreas } from '#src/beheer/areas'
import { clubCountryListPath } from '#src/beheer/club-country'
import { compact } from '#src/beheer/density'
import { namesQualityPath, personQualityPath } from '#src/beheer/person-table'
import { requireRole } from '#src/beheer/require-role'
import { usualSlotsPath } from '#src/beheer/usual-slots'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit' }

// The quality lists that have not moved to their own subject yet (#1303): the quality of the
// matches is under Wedstrijden since #1304. This page only leads to the rest, and goes away
// with the screen Kwaliteit when the last of them has moved (#1306).
export default async function QualityPage() {
  await requireRole('owner', 'editor')

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Kwaliteit</Heading>
        <Text appearance="intro">
          De kwaliteit van de wedstrijden staat nu bij Wedstrijden. Deze lijsten verhuizen ook naar hun onderwerp.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        <Card aria-labelledby="lijsten-kop" surface="warm">
          <Heading id="lijsten-kop" level={2}>
            Lijsten
          </Heading>
          <List role="list">
            <List.Item>
              <Link href={personQualityPath}>Personen</Link>: wat we van personen missen, per letter.
            </List.Item>
            <List.Item>
              <Link href={namesQualityPath}>Namen</Link>: personen die op elkaar lijken.
            </List.Item>
            <List.Item>
              <Link href={usualSlotsPath}>Vaste plaatsen in een 4-3-3</Link>: waar spelers meestal stonden in hun rij.
            </List.Item>
            <List.Item>
              <Link href={clubCountryListPath}>Clubs zonder land</Link>: het land van een club invullen.
            </List.Item>
          </List>
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
