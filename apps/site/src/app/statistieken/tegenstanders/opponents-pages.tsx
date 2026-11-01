import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { SearchParams } from '../../../season-page'

import { competitionQuery, parseCompetition } from '../../../competition'
import { CompetitionLinks } from '../../../CompetitionSwitch'
import { reviewBranch } from '../../../env'
import { reasonOf } from '../../../errors'
import { getMatchSeasons } from '../../../matches'
import { pageMetadata, seasonPageMetadata } from '../../../metadata'
import {
  earlierNames,
  getClubPage,
  getClubRecords,
  getSourcePages,
  meetingsOf,
  opponentsPath,
  seasonsOf,
  stadiumsOf,
  summaryOf,
} from '../../../opponents'
import { ClubMeetingsCard, ClubsCard, ClubSummaryCard, OpponentsCredit, StadiumsCard } from '../../../OpponentViews'
import { ServerError, serverErrorTitle } from '../../../ServerError'
import { withBranch } from '../../../title'

/**
 * What the two pages of the opponents read, or that it went wrong. A page that throws gets an
 * empty page with a 500 from Next.js, so the page catches the error and shows the error page
 * itself, in the HTML (as `loadSeasonPage` does). `cache` makes a page and its metadata share
 * one reading per request.
 */
const loadClubList = cache(async () => {
  try {
    const [all, league, seasons, pages] = await Promise.all([
      getClubRecords('all'),
      getClubRecords('league'),
      getMatchSeasons(),
      getSourcePages(),
    ])

    return { all, kind: 'found', league, pages, seasons } as const
  } catch (error) {
    console.error(`Could not read the opponents for ${opponentsPath}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

const loadClub = cache(async (slug: string) => {
  try {
    const page = await getClubPage(slug)

    if (page === undefined) {
      return { kind: 'unknown' } as const
    }

    return { kind: 'found', page, pages: await getSourcePages(), seasons: await getMatchSeasons() } as const
  } catch (error) {
    console.error(`Could not read the opponent ${slug} for ${opponentsPath}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

/** The metadata of a page that failed: noindex, because a page that failed answers 200. */
const failedMetadata = (): Metadata => ({
  robots: { index: false },
  title: withBranch(serverErrorTitle, reviewBranch()),
})

/** The first season we have matches of: since when the record goes back. */
const sinceOf = (seasons: readonly string[]) => seasons.at(-1) ?? ''

/** The title of the list; its canonical address is the list without a choice. */
export async function clubListMetadata(): Promise<Metadata> {
  const loaded = await loadClubList()

  return loaded.kind === 'error' ? failedMetadata() : pageMetadata(opponentsPath, 'Tegenstanders')
}

/**
 * The page Tegenstanders: every club sc Heerenveen played, A to Z, with our record against
 * each, for the matches of every season we have. It counts all the matches, the Eredivisie and
 * the KNVB Beker, or the Eredivisie alone with `?competitie=eredivisie`, as Statistieken does,
 * and the switch is the one of Statistieken. A club we only met in the cup is not in the list
 * with the choice Eredivisie. The switch is only there when a cup tie was played. A value of
 * the choice that is not known is the page "niet gevonden".
 */
export async function ClubListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { competitie } = await searchParams
  const competition = parseCompetition(competitie)

  if (competition === undefined) {
    notFound()
  }

  const loaded = await loadClubList()

  if (loaded.kind === 'error') {
    return <ServerError retryHref={opponentsPath} />
  }

  const played = (records: { played: number }[]) => records.reduce((sum, record) => sum + record.played, 0)
  // Without a cup tie the two choices count the same matches and there is nothing to choose.
  const hasCup = played(loaded.all) > played(loaded.league)

  return (
    <Page.Main
      intro={
        <Page.Title>
          <Heading level={1}>Tegenstanders</Heading>
        </Page.Title>
      }
    >
      {hasCup && <CompetitionLinks address={opponentsPath} competition={competition} />}
      <ClubsCard
        address={opponentsPath}
        choice={competition}
        query={competitionQuery(competition)}
        records={competition === 'league' ? loaded.league : loaded.all}
        since={sinceOf(loaded.seasons)}
      />
      <OpponentsCredit pages={loaded.pages} seasons={loaded.seasons} />
    </Page.Main>
  )
}

/** The title, description and canonical address of the page of a club. */
export async function clubMetadata(slug: string): Promise<Metadata> {
  const loaded = await loadClub(slug)

  if (loaded.kind === 'error') {
    return failedMetadata()
  }

  if (loaded.kind === 'unknown') {
    return {}
  }

  const { name } = loaded.page.club

  return seasonPageMetadata(opponentsPath, `${opponentsPath}/${slug}`, {
    description: `Hoe vaak sc Heerenveen won, gelijkspeelde en verloor tegen ${name}, met alle wedstrijden en de bron erbij: de Nederlandse Wikipedia.`,
    title: `sc Heerenveen tegen ${name}`,
  })
}

/**
 * The page of one club: its name as the heading, with "Eerder: …" under it when Wikipedia has
 * written the club under other names, the record against it (the total, at home and away,
 * and the biggest win and loss) and every match, the newest first. The matches are the main
 * column, on the white surface; the record, the card with the names of the stadium of the club
 * and the credit are the sidebar. It follows the choice between all the matches and the
 * Eredivisie (the names of the stadium come from the Eredivisie whatever the choice). A club
 * we only met in the cup says with the choice Eredivisie that we have not played it there. A
 * slug no club has, and a choice that is not known, are the page "niet gevonden".
 */
export async function ClubPage({ searchParams, slug }: { searchParams: Promise<SearchParams>; slug: string }) {
  const { competitie } = await searchParams
  const competition = parseCompetition(competitie)
  const loaded = await loadClub(slug)

  if (competition === undefined || loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={`${opponentsPath}/${slug}`} />
  }

  const { club, matches } = loaded.page
  const now = new Date()
  const meetings = meetingsOf(matches, competition)
  const hasCup = meetingsOf(matches, 'all').length > meetingsOf(matches, 'league').length
  const earlier = earlierNames(club.otherNames)
  const stadiums = stadiumsOf(matches)

  return (
    <>
      <Page.Main
        intro={
          <Page.Cell>
            <Heading level={1}>{club.name}</Heading>
            {earlier !== undefined && <Text appearance="meta">{`Eerder: ${earlier}`}</Text>}
          </Page.Cell>
        }
      >
        {hasCup && <CompetitionLinks address={`${opponentsPath}/${slug}`} competition={competition} />}
        {meetings.length === 0 ? (
          <Text>
            {competition === 'league'
              ? 'In de Eredivisie hebben we nog niet tegen deze club gespeeld.'
              : 'We hebben nog niet tegen deze club gespeeld.'}
          </Text>
        ) : (
          <ClubMeetingsCard meetings={meetings} now={now} />
        )}
      </Page.Main>
      {/* The sidebar is as wide as the main column, as on Statistieken. On a phone it follows the
          matches: our record against the club, the names of its stadium and the credit. */}
      {meetings.length > 0 && (
        <Page.Sidebar aria-label={`Onze uitslagen${stadiums.length > 0 ? ', het stadion' : ''} en de bron`} wide>
          <ClubSummaryCard
            choice={competition}
            name={club.name}
            now={now}
            since={sinceOf(loaded.seasons)}
            summary={summaryOf(meetings)}
          />
          <StadiumsCard stadiums={stadiums} />
          <OpponentsCredit pages={loaded.pages} seasons={seasonsOf(meetings)} />
        </Page.Sidebar>
      )}
    </>
  )
}
