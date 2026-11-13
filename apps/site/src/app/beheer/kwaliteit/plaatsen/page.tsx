import type { Metadata } from 'next'

import { Card, DataTable, Heading, Link, Page, Text } from '@fansite/design-system'

import { playerPath } from '#src/app/beheer/spelers/paths'
import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { qualityPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { sideQuizPath } from '#src/beheer/side-quiz'
import {
  countedFormation,
  fewestMatches,
  readLineUpsInCountedFormation,
  slotText,
  usualSlots,
} from '#src/beheer/usual-slots'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

const title = 'Vaste plaatsen in een 4-3-3'

export const metadata: Metadata = { robots: { follow: false, index: false }, title }

/**
 * Where each player usually stood in his row in a 4-3-3 (issue 1193), a list to read: nothing
 * is changed from it. A player who stood in the same slot every time says that in words.
 */
export default async function UsualSlotsPage() {
  await requireRole('owner', 'editor')

  const { db } = getDatabase()
  const slots = usualSlots(await readLineUpsInCountedFormation(db))

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
          In een {countedFormation}, voor spelers met minstens {fewestMatches} wedstrijden. De plaats in de rij komt uit
          de volgorde van de opstelling.
        </Text>
        <Text>
          <Link href={sideQuizPath}>Leg de kant van spelers vast</Link>, met een quiz.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        <Card aria-labelledby="plaatsen-kop">
          <Heading id="plaatsen-kop" level={2}>
            Per speler
          </Heading>
          {slots.length === 0 ? (
            <Text>
              Geen enkele speler heeft {fewestMatches} wedstrijden in een {countedFormation}.
            </Text>
          ) : (
            <DataTable
              appearance="text"
              caption={`De vaakste plaats van elke speler in een ${countedFormation}, de spelers met de meeste wedstrijden bovenaan`}
              columns={['Speler', 'Plaats']}
              rows={slots.map((slot) => ({
                cells: [slotText(slot)],
                header: slot.name,
                // The count and the share under the name: two columns fit a phone, five do not.
                secondary: `${slot.matches} wedstrijden, ${slot.percentage === 100 ? 'elke keer' : `${slot.percentage}%`}`,
                ...(slot.playerId === null ? {} : { href: playerPath(slot.playerId) }),
              }))}
            />
          )}
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
