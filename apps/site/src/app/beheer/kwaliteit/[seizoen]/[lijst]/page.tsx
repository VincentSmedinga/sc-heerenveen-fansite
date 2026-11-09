import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { firstCoverageSeason, seasonsBetween } from '@fansite/db/season-coverage'
import { Breadcrumb, Card, DataTable, Heading, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { matchPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import { compact } from '#src/beheer/density'
import { listWork, qualityPath, type WorkList, type WorkListMatch, workLists } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { seasonFromSlug } from '#src/seasons'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Werklijst' }

type Props = { params: Promise<{ lijst: string; seizoen: string }> }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** What a work list is called, what an editor does with it, and what a row of it asks. */
const lists: Record<WorkList, { intro: string; title: string; todo: (total: number) => string }> = {
  'doelpunten-zonder-speler': {
    intro:
      'Bij deze wedstrijden staat een doelpunt van ons zonder speler uit de selectie. Kies bij de wedstrijd wie scoorde.',
    title: 'Doelpunten zonder speler',
    todo: (total) => plural(total, 'doelpunt zonder speler', 'doelpunten zonder speler'),
  },
  'verslagen-bezig': {
    intro: 'Van deze wedstrijden is een verslag begonnen en nog niet af. Maak het af en zet het op klaar.',
    title: 'Verslagen die niet af zijn',
    todo: () => 'Verslag afmaken',
  },
  'wachtende-wijzigingen': {
    intro: 'Bij deze wedstrijden wacht een wijziging van Wikipedia op een besluit. Beslis bij de wedstrijd wat klopt.',
    title: 'Wachtende wijzigingen',
    todo: (total) => plural(total, 'wijziging wacht', 'wijzigingen wachten'),
  },
  'zonder-doelpunten': {
    intro:
      'Deze wedstrijden hebben een uitslag met doelpunten, maar we weten niet wie ze maakte. Vul bij de wedstrijd de doelpunten in.',
    title: 'Wedstrijden zonder doelpunten',
    todo: () => 'Doelpunten invullen',
  },
}

const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC', year: 'numeric' })

// A work list of the page Kwaliteit, for a beheerder: the matches of one season that miss
// something, the oldest first. Each row leads to the match in the admin, a report that is not
// finished to its report. An address that names no season since 1990/91 or no list says "niet
// gevonden".
export default async function WorkListPage({ params }: Props) {
  await requireRole('beheerder')

  const { lijst, seizoen } = await params
  const season = seasonFromSlug(seizoen)
  const list = workLists.find((known) => known === lijst)

  if (
    season === undefined ||
    list === undefined ||
    !seasonsBetween(firstCoverageSeason, seasonOf(new Date())).includes(season)
  ) {
    notFound()
  }

  const { intro, title, todo } = lists[list]
  const found = await listWork(getDatabase().db, season, list)
  const names = found.map(clubsOf)

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Breadcrumb
            current={title}
            items={[
              { href: '/beheer', label: 'Beheer' },
              { href: qualityPath, label: 'Kwaliteit' },
            ]}
            label="Kruimelpad"
          />
          <Heading level={1}>
            {title} in {season}
          </Heading>
          <Text appearance="intro">{intro}</Text>
        </>
      }
      wide
    >
      {found.length === 0 ? (
        <Text>Deze lijst is leeg: er is hier niets te doen in het seizoen {season}.</Text>
      ) : (
        <Card aria-labelledby="werklijst-kop">
          <Heading className="hf-visually-hidden" id="werklijst-kop" level={2}>
            Wedstrijden
          </Heading>
          <DataTable
            appearance="text"
            caption={`${title} in het seizoen ${season}, de oudste wedstrijd bovenaan`}
            columns={['Wedstrijd', 'Uitslag', 'Te doen']}
            rows={found.map((match, index) => {
              const clubs = names[index] as string

              return {
                cells: [scoreOf(match), todo(match.total)],
                // A second meeting in the season gets its round, so every row has its own name.
                header: names.indexOf(clubs) === names.lastIndexOf(clubs) ? clubs : `${clubs} (${match.round})`,
                href: list === 'verslagen-bezig' ? reportPath(match.id) : matchPath(match.id),
                secondary: `${dayFormat.format(new Date(`${match.matchDate}T12:00:00Z`))} · ${match.competition}, ${match.round}`,
              }
            })}
          />
        </Card>
      )}
    </Page.Main>
  )
}

const clubsOf = (match: Pick<WorkListMatch, 'home' | 'opponent'>) =>
  match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`

/** The score in the order of the match, or that there is none. */
function scoreOf(match: WorkListMatch) {
  if (match.status !== 'played' || match.goalsFor === null || match.goalsAgainst === null) {
    return 'Geen uitslag'
  }

  return match.home ? `${match.goalsFor} - ${match.goalsAgainst}` : `${match.goalsAgainst} - ${match.goalsFor}`
}
