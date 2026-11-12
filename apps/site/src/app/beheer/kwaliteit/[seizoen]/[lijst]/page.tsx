import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { firstCoverageSeason, seasonsBetween } from '@fansite/db/season-coverage'
import { Card, DataTable, Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { listPath as playersListPath } from '#src/app/beheer/spelers/paths'
import { matchPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import { compact } from '#src/beheer/density'
import {
  listWork,
  qualityPath,
  seasonHasPlayers,
  type WorkList,
  type WorkListMatch,
  workLists,
} from '#src/beheer/quality'
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
    intro:
      'Bij deze wedstrijden wacht een wijziging van Wikipedia of een verschil tussen twee bronnen op een besluit. Beslis bij de wedstrijd wat klopt.',
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

const dayFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  weekday: 'short',
  year: 'numeric',
})

/** The day of a match with its year, without points: `za 27 aug 2005`. */
const dayOf = (matchDate: string) => dayFormat.format(new Date(`${matchDate}T12:00:00Z`)).replaceAll('.', '')

// A work list of the page Kwaliteit, for an editor: the matches of one season that miss
// something, the oldest first. Each row leads to the match in the admin, a report that is not
// finished to its report. The list of the goals without a player leads to the goals of the
// match and has the name each goal came with, and says so above the rows when the season has no
// player to choose from (issue 1021). An address that names no season since 1990/91 or no list
// says "niet gevonden".
export default async function WorkListPage({ params }: Props) {
  await requireRole('owner', 'editor')

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
  const { db } = getDatabase()
  const found = await listWork(db, season, list)
  const names = found.map(clubsOf)
  const scorers = list === 'doelpunten-zonder-speler'
  const withoutPlayers = scorers && found.length > 0 && !(await seasonHasPlayers(db, season))

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
          {withoutPlayers ? (
            <Text>
              Het seizoen {season} heeft nog geen enkele speler, dus je kunt bij deze doelpunten niemand kiezen. Voeg
              eerst de spelers toe: <Link href={playersListPath(season)}>naar de spelers van {season}</Link>.
            </Text>
          ) : null}
          <DataTable
            appearance="text"
            caption={`${title} in het seizoen ${season}, de oudste wedstrijd bovenaan`}
            columns={
              scorers
                ? ['Wedstrijd', 'Uitslag', 'Naam bij het doelpunt', 'Te doen']
                : ['Wedstrijd', 'Uitslag', 'Te doen']
            }
            rows={found.map((match, index) => {
              const clubs = names[index] as string

              return {
                cells: scorers
                  ? [scoreOf(match), goalNamesOf(match), todo(match.total)]
                  : [scoreOf(match), todo(match.total)],
                // A second meeting in the season gets its round, so every row has its own name.
                header: names.indexOf(clubs) === names.lastIndexOf(clubs) ? clubs : `${clubs} (${match.round})`,
                href:
                  list === 'verslagen-bezig'
                    ? reportPath(match.id)
                    : scorers
                      ? `${matchPath(match.id)}#doelpunten`
                      : matchPath(match.id),
                secondary: `${dayOf(match.matchDate)} · ${match.competition}, ${match.round}`,
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

/**
 * The names the goals without a player came with, and how many came without one: "Onbekende
 * Een, 1 zonder naam".
 */
function goalNamesOf(match: Pick<WorkListMatch, 'names' | 'total'>) {
  const nameless = match.total - match.names.length

  return [...match.names, ...(nameless > 0 ? [`${nameless} zonder naam`] : [])].join(', ')
}

/** The score in the order of the match, or that there is none. */
function scoreOf(match: WorkListMatch) {
  if (match.status !== 'played' || match.goalsFor === null || match.goalsAgainst === null) {
    return 'Geen uitslag'
  }

  return match.home ? `${match.goalsFor} - ${match.goalsAgainst}` : `${match.goalsAgainst} - ${match.goalsFor}`
}
