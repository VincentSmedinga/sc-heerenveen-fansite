import type { PlayerField } from '@fansite/db/schema'
import type { Metadata } from 'next'

import { listWaitingFieldDifferences, playerFieldLabels } from '@fansite/db/player-field-differences'
import { seasonOf } from '@fansite/db/season'
import { firstCoverageSeason, seasonsBetween } from '@fansite/db/season-coverage'
import { Card, Heading, Link, List, Notice, Page, Strong, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { submitFieldDifference } from '#src/app/beheer/kwaliteit/actions'
import { ConflictForm } from '#src/app/beheer/wedstrijden/ConflictForm'
import { compact } from '#src/beheer/density'
import { qualityPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { seasonFromSlug } from '#src/seasons'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Spelersgegevens die verschillen' }

type Props = {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** The field with its article, as the buttons and the reason name it. */
const parts: Record<PlayerField, string> = {
  name: 'de naam',
  position: 'de positie',
  shirt_number: 'het rugnummer',
  wikipedia_page: 'de Wikipedia-pagina',
}

/** What the last decision says, by the word in the address. */
const notices: Record<string, { text: string; title: string }> = {
  besloten: {
    text: 'Over dit verschil is al beslist, of het is vanzelf verdwenen.',
    title: 'Niets veranderd',
  },
  bezet: {
    text: 'Een andere speler van dit seizoen heeft deze naam of deze Wikipedia-pagina al. Pas die speler eerst aan, of houd de redactie.',
    title: 'Niet overgenomen',
  },
  gehouden: {
    text: 'De speler blijft zoals de redactie hem invulde. De import meldt dit verschil niet nog eens, zolang beide waarden gelijk blijven.',
    title: 'Redactie gehouden',
  },
  overgenomen: {
    text: 'De speler heeft nu de waarde van de import. De import houdt dit veld vanaf nu weer bij.',
    title: 'Overgenomen',
  },
}

// The players of one season of whom the import read another value than the editors set (issue
// 1022), for an editor. Each difference has the field, both values and one form: take the
// value of the import over, or keep that of the editors. An address that names no season since
// 1990/91 says "niet gevonden".
export default async function FieldDifferencesPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { seizoen } = await params
  const season = seasonFromSlug(seizoen)

  if (season === undefined || !seasonsBetween(firstCoverageSeason, seasonOf(new Date())).includes(season)) {
    notFound()
  }

  const { fout, gedaan } = await searchParams
  const notice = notices[typeof gedaan === 'string' ? gedaan : typeof fout === 'string' ? fout : '']
  const found = await listWaitingFieldDifferences(getDatabase().db, season)
  const title = 'Spelersgegevens die verschillen'

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Text>
            <Link href={qualityPath} icon="arrow-left">
              Terug naar de kwaliteit van de gegevens
            </Link>
          </Text>
          <Heading level={1}>
            {title} in {season}
          </Heading>
          <Text appearance="intro">
            Van deze spelers leest de import iets anders dan de redactie invulde. Neem de waarde van de import over, of
            houd die van de redactie.
          </Text>
        </>
      }
      wide
    >
      {notice === undefined ? null : (
        <Notice>
          <Strong>{notice.title}.</Strong> {notice.text}
        </Notice>
      )}
      {found.length === 0 ? (
        <Text>Er zijn geen spelersgegevens die verschillen in het seizoen {season}.</Text>
      ) : (
        found.map((difference) => {
          const field = playerFieldLabels[difference.field]

          return (
            <Card aria-labelledby={`verschil-${difference.id}-kop`} key={difference.id}>
              <Heading id={`verschil-${difference.id}-kop`} level={2}>
                {difference.name}: {field}
              </Heading>
              <List role="list">
                <List.Item>
                  <Text>Redactie: {difference.editorsValue ?? 'leeg'}</Text>
                </List.Item>
                <List.Item>
                  <Text>Import: {difference.importValue}</Text>
                </List.Item>
              </List>
              <Text appearance="meta">
                De waarde van de redactie blijft staan tot je beslist. Verdwijnt het verschil, dan verdwijnt het ook
                hier.
              </Text>
              <ConflictForm
                action={submitFieldDifference.bind(null, difference.id, seizoen)}
                id={difference.id}
                labels={{ keep: 'Houd de redactie', takeOver: 'Neem de import over' }}
                part={parts[difference.field]}
                title={difference.name}
              />
            </Card>
          )
        })
      )}
    </Page.Main>
  )
}
