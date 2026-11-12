import type { Metadata } from 'next'

import { competitions } from '@fansite/db/schema'
import { Heading, Link, Page, Text } from '@fansite/design-system'

import { compact } from '#src/beheer/density'
import { listClubChoices } from '#src/beheer/match-additions'
import { statusChoices } from '#src/beheer/match-form'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitAddMatch } from '../actions'
import { AddMatchForm } from '../AddMatchForm'
import { matchesPath } from '../paths'

// Render on each request: the clubs to choose from change with every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Wedstrijd toevoegen' }

// The form that adds a match no import reads, such as one from a newspaper archive. The match
// gets the source `redactie` and the line that says where it comes from; no import changes or
// removes it. Afterwards the goals and the report are filled in as for any other match.
export default async function AddMatchPage() {
  await requireRole('owner', 'editor')

  const clubs = await listClubChoices(getDatabase().db)

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Text>
            <Link href={matchesPath} icon="arrow-left">
              Terug naar Wedstrijden
            </Link>
          </Text>
          <Heading level={1}>Wedstrijd toevoegen</Heading>
          <Text appearance="intro">
            Voeg een wedstrijd toe die geen bron heeft die de import kan lezen, zoals een wedstrijd uit een
            krantenarchief. Geen enkele import wijzigt of verwijdert hem. Doelpunten en een verslag vul je daarna in.
          </Text>
        </>
      }
      wide
    >
      <AddMatchForm action={submitAddMatch} choices={{ clubs, competitions, statuses: statusChoices }} />
    </Page.Main>
  )
}
