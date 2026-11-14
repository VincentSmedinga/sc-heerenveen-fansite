import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import {
  allTimeScorersOf,
  clubTopScorersOf,
  hattricksOf,
  lineupSentence,
  matchKey,
  penaltiesOf,
  playerRecordsOf,
} from '#src/all-time-players'
import {
  AllTimeScorersCard,
  ClubTopScorersCard,
  HattricksCard,
  PenaltiesCard,
  PlayerRecordsCard,
} from '#src/AllTimePlayersCards'
import { competitionFields, leagueLabel, parseCompetition } from '#src/competition'
import { CompetitionLinks } from '#src/CompetitionSwitch'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import {
  choiceFor,
  competitionOptionsOf,
  getAllTimeMatches,
  getEditedMatches,
  getMatchSeasons,
  getMatchSource,
  getPersonBirthDates,
  getPersonSeasons,
  getReportSeasons,
} from '#src/matches'
import { seasonPageMetadata } from '#src/metadata'
import { getSourcePages } from '#src/opponents'
import { OpponentsCredit } from '#src/OpponentViews'
import { pageAreas } from '#src/page-areas'
import { pages } from '#src/pages'
import { getReportAddresses } from '#src/report-data'
import { pickerPathOf, playerFiguresPath, type SearchParams } from '#src/season-page'
import { allSeasonsAddress, allSeasonsSlug, seasonChoicesWithAll } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

/** The page with all seasons: `/spelers/cijfers/alle`. */
export const allSeasonsPlayersAddress = allSeasonsAddress(playerFiguresPath)

/**
 * What the page reads, or that it went wrong. A page that throws gets an empty page with a 500
 * from Next.js, so the page catches the error and shows the error page itself, in the HTML.
 * `cache` makes the page and its metadata share one reading per request.
 */
const loadAllSeasons = cache(async () => {
  try {
    const [matches, birthDates, personSeasons, reportSeasons, seasons, pages, edited, source] = await Promise.all([
      getAllTimeMatches(),
      getPersonBirthDates(),
      getPersonSeasons(),
      getReportSeasons(),
      getMatchSeasons(),
      getSourcePages(),
      getEditedMatches(),
      getMatchSource(),
    ])

    return { birthDates, edited, kind: 'found', matches, pages, personSeasons, reportSeasons, seasons, source } as const
  } catch (error) {
    console.error(`Could not read the matches for ${allSeasonsPlayersAddress}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

/**
 * Which cards the page has for a choice of competition, for the bar under the header, or
 * undefined when the page has no bar: an unknown choice is the page "niet gevonden", and a page
 * that can't read its data shows the error page, which has no cards to jump to.
 */
export async function allSeasonsCards(competitie: string | string[] | undefined) {
  const chosen = parseCompetition(competitie)
  const loaded = await loadAllSeasons()

  if (chosen === undefined || loaded.kind === 'error') {
    return undefined
  }

  const competition = choiceFor(loaded.matches, chosen)

  return {
    clubTopScorers: clubTopScorersOf(loaded.matches, competition).length > 0,
    hattricks: hattricksOf(loaded.matches, competition).total > 0,
    penalties: penaltiesOf(loaded.matches, competition).total > 0,
    records: hasRecords(playerRecordsOf(loaded.matches, competition, loaded.birthDates)),
    scorers: allTimeScorersOf(loaded.matches, competition, loaded.personSeasons).total > 0,
  }
}

/** Whether the data has at least one of the records. */
const hasRecords = (records: object) => Object.keys(records).length > 0

/** The title, description and canonical address of the page with all seasons. */
export async function allSeasonsPlayersMetadata(): Promise<Metadata> {
  const loaded = await loadAllSeasons()

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  const { description } = pages.find((page) => page.path === allSeasonsPlayersAddress) ?? { description: '' }

  return seasonPageMetadata(playerFiguresPath, allSeasonsPlayersAddress, {
    description,
    title: 'Cijfers van de spelers, alle seizoenen',
  })
}

/**
 * The figures of the players over all seasons since 1990/91: `/spelers/cijfers/alle`. It has
 * the title row and the toolbar with the season picker, which has "Alle seizoenen" first, and
 * the choice of competition. The main column is white and has the cards Topscorers sinds
 * 1990/91 and Clubtopscorer per seizoen.
 * The sidebar has soft cards, Records, Hattricks and Strafschoppen benut, a sentence that says
 * why there is no list of matches, minutes or assists, and the credit. A card with nothing to
 * say is left out. A choice of competition that is not known is the page "niet gevonden".
 */
export async function AllSeasonsPlayersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { competitie } = await searchParams
  const chosen = parseCompetition(competitie)
  const loaded = await loadAllSeasons()

  if (chosen === undefined) {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={allSeasonsPlayersAddress} />
  }

  const { birthDates, edited, matches, pages, personSeasons, reportSeasons, seasons, source } = loaded
  const options = competitionOptionsOf(matches)
  const competition = choiceFor(matches, chosen)

  const scorers = allTimeScorersOf(matches, competition, personSeasons)
  const clubTopScorers = clubTopScorersOf(matches, competition)
  const hattricks = hattricksOf(matches, competition)
  const penalties = penaltiesOf(matches, competition)
  const records = playerRecordsOf(matches, competition, birthDates)
  const hattrickSeasons = new Set(
    [
      ...hattricks.list.map((hattrick) => hattrick.match.season),
      ...Object.values(records).flatMap((record) => record.entries.map((entry) => entry.match?.season ?? '')),
    ].filter((season) => reportSeasons.includes(season)),
  )
  const reportHrefs = await reportHrefsOf(hattrickSeasons)

  return (
    <Page.Main areas={pageAreas({ after: ['side'], toolbar: true })}>
      <Page.Cell area="head">
        <Heading level={1}>Cijfers van de spelers</Heading>
      </Page.Cell>
      <Page.Toolbar>
        <SeasonPicker
          action={pickerPathOf(playerFiguresPath)}
          fields={competitionFields(competition)}
          options={seasonChoicesWithAll(seasons)}
          value={allSeasonsSlug}
        />
        <CompetitionLinks
          address={allSeasonsPlayersAddress}
          competition={competition}
          league={leagueLabel(matches.map((match) => match.competition))}
          options={options}
        />
      </Page.Toolbar>
      <Page.Section area="main" aria-label="De topscorers van alle seizoenen">
        {scorers.total > 0 ? (
          <AllTimeScorersCard competition={competition} matches={matches} scorers={scorers} />
        ) : (
          <Text>We hebben nog geen doelpuntenmakers. Kijk straks nog eens.</Text>
        )}
        {clubTopScorers.length > 0 && (
          <ClubTopScorersCard
            competition={competition}
            current={seasonOf(new Date())}
            matches={matches}
            seasons={clubTopScorers}
          />
        )}
      </Page.Section>
      <Page.Section area="side" aria-label="Meer cijfers over de spelers">
        {hasRecords(records) && <PlayerRecordsCard matches={matches} records={records} reportHrefs={reportHrefs} />}
        {hattricks.total > 0 && (
          <HattricksCard competition={competition} hattricks={hattricks} matches={matches} reportHrefs={reportHrefs} />
        )}
        {penalties.total > 0 && (
          <PenaltiesCard competition={competition} matches={matches} penalties={penalties} since={scorers.since} />
        )}
        <Text appearance="meta">{lineupSentence(reportSeasons, seasonOf(new Date()))}</Text>
        <OpponentsCredit edited={edited} pages={pages} seasons={seasons} source={source} />
      </Page.Section>
    </Page.Main>
  )
}

/**
 * The addresses of the pages of the matches in which a hattrick was scored, by season,
 * competition and round. Only a season whose line-ups we have has pages for its matches, so no
 * other season is asked. A season that can't be read has no links: the card is as it was
 * without them, and the error is logged.
 */
async function reportHrefsOf(seasons: Iterable<string>) {
  const hrefs = new Map<string, string>()

  for (const season of seasons) {
    try {
      for (const [key, href] of await getReportAddresses(season)) {
        const [competition = '', round = ''] = key.split('|')

        hrefs.set(matchKey(season, competition, round), href)
      }
    } catch (error) {
      console.error(`Could not read the match reports for ${allSeasonsPlayersAddress}: ${reasonOf(error)}`)
    }
  }

  return hrefs
}
