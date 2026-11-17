import type { Metadata } from 'next'

import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { toolbarAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { readStadiumGaps, type StadiumGap } from '#src/beheer/stadium-quality'
import { getDatabase } from '#src/database'

import { stadiumsPath } from '../paths'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit van stadions' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

type Kind = { caption: string; empty: string; id: string; list: StadiumGap[]; title: string }

// What the editors still have to fill in about the stadiums and the clubs (#1307): a card for
// each kind, each row a link to the screen where it is filled in. The matches without a stadium
// are in the table of the quality of the matches, under Wedstrijden.
export default async function StadiumQualityPage() {
  await requireRole('owner', 'editor')

  const gaps = await readStadiumGaps(getDatabase().db)
  const kinds: Kind[] = [
    {
      caption: 'Stadions zonder Wikidata-nummer',
      empty: 'Elk stadion heeft een Wikidata-nummer.',
      id: 'wikidata',
      list: gaps.withoutWikidata,
      title: 'Zonder Wikidata-nummer',
    },
    {
      caption: 'Stadions zonder coördinaten',
      empty: 'Elk stadion heeft coördinaten.',
      id: 'coordinaten',
      list: gaps.withoutCoordinates,
      title: 'Zonder coördinaten',
    },
    {
      caption: 'Stadions zonder adres',
      empty: 'Elk stadion heeft een straat en een postcode.',
      id: 'adres',
      list: gaps.withoutAddress,
      title: 'Zonder adres',
    },
    {
      caption: 'Clubs zonder thuisveld voor hun wedstrijden',
      empty: 'Elke club heeft een thuisveld voor zijn thuiswedstrijden.',
      id: 'thuisvelden',
      list: gaps.clubsWithoutGround,
      title: 'Clubs zonder thuisveld',
    },
  ]

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={stadiumsPath} icon="arrow-left">
            Stadions
          </Link>
        </Text>
        <Heading level={1}>Kwaliteit van stadions</Heading>
        <Text appearance="intro">
          {gaps.total === 0
            ? 'Alle stadions en clubs zijn compleet.'
            : `Nog ${plural(gaps.total, 'gat', 'gaten')} bij de stadions en de clubs. Een rij leidt naar het scherm waar je het invult. De wedstrijden zonder stadion staan in de tabel bij Wedstrijden, in de kolom S.`}
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {kinds.map((kind) => (
          <Card aria-labelledby={`${kind.id}-kop`} key={kind.id}>
            <Heading id={`${kind.id}-kop`} level={2}>
              {kind.title}
            </Heading>
            {kind.list.length === 0 ? (
              <Text>{kind.empty}</Text>
            ) : (
              <List role="list">
                {kind.list.map((entry) => (
                  <List.Item key={entry.href}>
                    <Link href={entry.href}>{entry.name}</Link>
                  </List.Item>
                ))}
              </List>
            )}
          </Card>
        ))}
      </Page.Cell>
    </Page.Main>
  )
}
