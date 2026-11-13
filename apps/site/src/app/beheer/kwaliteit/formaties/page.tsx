import type { Metadata } from 'next'

import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { longDayOf } from '#src/app/beheer/kwaliteit/gap-table'
import { reportPath } from '#src/app/beheer/wedstrijden/paths'
import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { readUnusualFormations, usualFormations } from '#src/beheer/formations'
import { qualityPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

const title = 'Afwijkende formaties'

export const metadata: Metadata = { robots: { follow: false, index: false }, title }

/**
 * The matches whose formation of ours is not 4-3-3 or 4-2-3-1 (issue 1191), a list to read and
 * check, a season at a time. A line leads to the report of the match, where the formation is
 * changed.
 */
export default async function UnusualFormationsPage() {
  await requireRole('owner', 'editor')

  const { db } = getDatabase()
  const unusual = await readUnusualFormations(db)
  const seasons = [...new Set(unusual.map((match) => match.season))]

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={qualityPath} icon="arrow-left">
            Kwaliteit
          </Link>
        </Text>
        <Heading level={1}>{title}</Heading>
        <Text appearance="intro">
          Wedstrijden waarvan de formatie van sc Heerenveen niet {usualFormations.join(' of ')} is. Dat kan kloppen,
          maar het is ook vaak een fout: een formatie die uit de lijnen van de oude fansite is afgeleid, of een tikfout
          in een verslag.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {unusual.length === 0 ? (
          <Card>
            <Text>Geen afwijkende formaties.</Text>
          </Card>
        ) : (
          seasons.map((season) => (
            <Card aria-labelledby={`seizoen-${season.replace('/', '-')}`} key={season}>
              <Heading id={`seizoen-${season.replace('/', '-')}`} level={2}>
                {season}
              </Heading>
              <List role="list">
                {unusual
                  .filter((match) => match.season === season)
                  .map((match) => (
                    <List.Item key={match.id}>
                      <Link href={reportPath(match.id)}>
                        {match.formation}: {match.opponent} ({match.home ? 't' : 'u'}), {longDayOf(match.matchDate)}
                      </Link>
                      {match.source === null ? null : ` (${match.source})`}
                    </List.Item>
                  ))}
              </List>
            </Card>
          ))
        )}
      </Page.Cell>
    </Page.Main>
  )
}
