import type { Metadata } from 'next'

import { listAdminStadiums } from '@fansite/db/stadium-admin'
import { Card, DataTable, Heading, Link, Notice, Page, Tag, Text } from '@fansite/design-system'

import { toolbarAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { stadiumQualityPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { clubsPath, groundPath } from './paths'

// Render on each request: the stadiums change with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Stadions' }

type SearchParams = Record<string, string | string[] | undefined>

const notices: Record<string, string> = {
  weg: 'Dit stadion bestaat niet. Er is niets veranderd. Kies hieronder een stadion.',
}

// The stadiums: one row for each, with its name now, its place and a word for what we know of
// where it is, never in colour alone. A stadium is made here and changed on its own page. The
// clubs, with their home grounds, are on the page Clubs.
export default async function StadiumsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('owner', 'editor')

  const { fout } = await searchParams
  const stadiums = await listAdminStadiums(getDatabase().db)
  const notice = typeof fout === 'string' ? notices[fout] : undefined

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Stadions</Heading>
        <Text appearance="intro">
          Een stadion is het veld zelf. Het heeft namen, een plaats, coördinaten en een adres. Welke club er wanneer
          speelde, zet je bij de club.
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <Text>
          <Link href={groundPath('nieuw')}>Nieuw stadion</Link>
        </Text>
        <Text>
          <Link href={clubsPath}>Clubs en hun stadions</Link>
        </Text>
        <Text>
          <Link href={stadiumQualityPath}>Wat ontbreekt</Link>
        </Text>
      </Page.Toolbar>
      <Page.Cell area="main">
        {notice === undefined ? null : <Notice>{notice}</Notice>}
        <Card aria-labelledby="stadions-kop">
          <Heading className="hf-visually-hidden" id="stadions-kop" level={2}>
            Stadions
          </Heading>
          {stadiums.length === 0 ? (
            <Text>Er zijn nog geen stadions.</Text>
          ) : (
            <DataTable
              appearance="text"
              caption="Stadions met hun plaats en wat we weten"
              columns={['Stadion', 'Plaats', 'Gegevens']}
              rows={stadiums.map((stadium) => ({
                cells: [
                  stadium.place ?? 'Onbekend',
                  stadium.hasCoordinates || stadium.hasAddress ? (
                    <>
                      {stadium.hasCoordinates ? <Tag tone="highlight">Coördinaten</Tag> : null}{' '}
                      {stadium.hasAddress ? <Tag tone="highlight">Adres</Tag> : null}
                    </>
                  ) : (
                    'Nog niets'
                  ),
                ],
                header: stadium.name,
                href: groundPath(stadium.id),
              }))}
            />
          )}
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
