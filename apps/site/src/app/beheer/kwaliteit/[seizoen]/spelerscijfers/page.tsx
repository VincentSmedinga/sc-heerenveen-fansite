import type { Metadata } from 'next'

import { listWaitingStatDifferences, statSourceLabels } from '@fansite/db/player-stat-differences'
import { seasonOf } from '@fansite/db/season'
import { firstCoverageSeason, seasonsBetween } from '@fansite/db/season-coverage'
import { Card, Heading, Link, List, Notice, Page, Strong, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { submitStatDifference } from '#src/app/beheer/kwaliteit/actions'
import { ConflictForm } from '#src/app/beheer/wedstrijden/ConflictForm'
import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { qualityPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { seasonFromSlug } from '#src/seasons'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Spelerscijfers die verschillen' }

type Props = {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const goals = (count: number) => `${count} ${count === 1 ? 'doelpunt' : 'doelpunten'}`

const capital = (text: string) => `${text.slice(0, 1).toLocaleUpperCase('nl')}${text.slice(1)}`

/** What the last decision says, by the word in the address. */
const notices: Record<string, { text: string; title: string }> = {
  besloten: {
    text: 'Over dit verschil is al beslist, of het is vanzelf verdwenen.',
    title: 'Niets veranderd',
  },
  'geen-rij': {
    text: 'De speler staat niet in de selectietabel, dus er is geen getal om te vervangen. Houd de selectietabel, of wacht tot de speler erin staat.',
    title: 'Niet overgenomen',
  },
  gehouden: {
    text: 'De selectietabel blijft zoals hij is. De import meldt dit verschil niet nog eens, zolang beide getallen gelijk blijven.',
    title: 'Selectietabel gehouden',
  },
  overgenomen: {
    text: 'Het getal staat nu in de selectietabel. De import laat het staan zolang de tabel van Wikipedia hetzelfde zegt als nu.',
    title: 'Overgenomen',
  },
}

// The players of one season whose goals in the squad table differ from the goals of the
// matches or of the match reports (issue 974), for an editor. Each difference has both
// numbers and one form: take the other number over, or keep the table. An address that names
// no season since 1990/91 says "niet gevonden".
export default async function StatDifferencesPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { seizoen } = await params
  const season = seasonFromSlug(seizoen)

  if (season === undefined || !seasonsBetween(firstCoverageSeason, seasonOf(new Date())).includes(season)) {
    notFound()
  }

  const { fout, gedaan } = await searchParams
  const notice = notices[typeof gedaan === 'string' ? gedaan : typeof fout === 'string' ? fout : '']
  const found = await listWaitingStatDifferences(getDatabase().db, season)
  const title = 'Spelerscijfers die verschillen'

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={qualityPath} icon="arrow-left">
            Terug naar de kwaliteit van de gegevens
          </Link>
        </Text>
        <Heading level={1}>
          {title} in {season}
        </Heading>
        <Text appearance="intro">
          Deze spelers hebben in de selectietabel een ander aantal doelpunten dan in de wedstrijden of de verslagen.
          Neem het andere getal over, of houd de selectietabel.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        {found.length === 0 ? (
          <Text>Er zijn geen spelerscijfers die verschillen in het seizoen {season}.</Text>
        ) : (
          found.map((difference) => {
            const other = statSourceLabels[difference.comparedWith]

            return (
              <Card aria-labelledby={`verschil-${difference.id}-kop`} key={difference.id}>
                <Heading id={`verschil-${difference.id}-kop`} level={2}>
                  {difference.name}: {difference.competition}, tegen de {other}
                </Heading>
                <List role="list">
                  <List.Item>
                    <Text>Selectietabel: {goals(difference.tableGoals)}</Text>
                  </List.Item>
                  <List.Item>
                    <Text>
                      {capital(other)}: {goals(difference.otherGoals)}
                    </Text>
                  </List.Item>
                </List>
                <Text appearance="meta">
                  De selectietabel blijft staan tot je beslist. Verdwijnt het verschil, dan verdwijnt het ook hier.
                </Text>
                <ConflictForm
                  action={submitStatDifference.bind(null, difference.id, seizoen)}
                  id={difference.id}
                  labels={{ keep: 'Houd de selectietabel', takeOver: `Neem de ${other} over` }}
                  part="de doelpunten"
                  title={`${difference.name} in de ${difference.competition}, tegen de ${other}`}
                />
              </Card>
            )
          })
        )}
      </Page.Cell>
    </Page.Main>
  )
}
