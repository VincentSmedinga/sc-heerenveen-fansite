import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { CompetitionChoice } from '#src/competition'
import type { SearchParams } from '#src/season-page'

import {
  competitionParam,
  competitionQuery,
  competitionWords,
  leagueLabel,
  optionsOf,
  parseCompetition,
} from '#src/competition'
import { CompetitionLinks } from '#src/CompetitionSwitch'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { filterHref, parseFilterQuery } from '#src/filter-query'
import { sourceName, sourceOf } from '#src/match-sources'
import { getEditedMatches, getMatchSeasons, getMatchSource } from '#src/matches'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { dutchDay } from '#src/noteworthy'
import {
  clubAttendanceOf,
  clubNameViewsOf,
  clubQuery,
  earlierNames,
  getClubNews,
  getClubPage,
  getClubPlaces,
  getClubRecords,
  getLastWinPlaces,
  getSourcePages,
  hasBothVenues,
  hasClubScorers,
  meetingPageCount,
  meetingsOf,
  meetingsOnPage,
  opponentsPath,
  opponentsShortcutsOf,
  parseVenue,
  seasonsOf,
  stadiumViewsOf,
  summaryOf,
  upcomingOf,
  type Venue,
  venueMatchesOf,
  venueParam,
} from '#src/opponents'
import {
  ClubAttendanceCard,
  ClubMeetingsCard,
  ClubNamesNotes,
  ClubNewsCard,
  ClubPlacesCard,
  ClubsCard,
  ClubScoreCountsCard,
  ClubSummaryCard,
  ClubTimelineCard,
  ClubTopScorersCard,
  LastWinCard,
  OpponentsCredit,
  RankingCard,
  StadiumsCard,
} from '#src/OpponentViews'
import { pageAreas } from '#src/page-areas'
import { getMatchPages } from '#src/report-data'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

/**
 * What the two pages of the opponents read, or that it went wrong. A page that throws gets an
 * empty page with a 500 from Next.js, so the page catches the error and shows the error page
 * itself, in the HTML (as `loadSeasonPage` does). `cache` makes a page and its metadata share
 * one reading per request.
 */
const loadClubList = cache(async () => {
  try {
    const [all, league, playoffs, cup, europe, seasons, pages, edited, source, lastWins] = await Promise.all([
      getClubRecords('all'),
      getClubRecords('league'),
      getClubRecords('playoffs'),
      getClubRecords('cup'),
      getClubRecords('europe'),
      getMatchSeasons(),
      getSourcePages(),
      getEditedMatches(),
      getMatchSource(),
      // The days are counted from the day in the Netherlands now, and this is never kept.
      getLastWinPlaces(dutchDay(new Date())),
    ])

    return {
      edited,
      kind: 'found',
      lastWins,
      pages,
      records: { all, cup, europe, league, playoffs },
      seasons,
      source,
    } as const
  } catch (error) {
    console.error(`Could not read the opponents for ${opponentsPath}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

/**
 * The records of the matches at home and away for the choice of the page, for the cards that
 * let a visitor choose Thuis or Uit. They are read in the page, because only the choice of the
 * page is known there, and fail on their own so the page can show the error page.
 */
const loadVenueRecords = cache(async (competition: CompetitionChoice) => {
  try {
    const [home, away] = await Promise.all([getClubRecords(competition, 'home'), getClubRecords(competition, 'away')])

    return { away, home, kind: 'found' } as const
  } catch (error) {
    console.error(`Could not read the opponents at home and away for ${opponentsPath}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

const loadClub = cache(async (slug: string) => {
  try {
    const page = await getClubPage(slug)

    if (page === undefined) {
      return { kind: 'unknown' } as const
    }

    return {
      edited: await getEditedMatches(),
      kind: 'found',
      news: await getClubNews(page),
      page,
      pages: await getSourcePages(),
      places: await getClubPlaces(page),
      seasons: await getMatchSeasons(),
    } as const
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
 * the KNVB Beker, or the Eredivisie alone with `?competitie=eredivisie`, as Cijfers does,
 * and the switch is the one of Cijfers. A club we only met in the cup is not in the list
 * with the choice Eredivisie. The switch is only there when a cup tie was played. A value of
 * the choice that is not known is the page "niet gevonden". The list is the main column, on the
 * white surface. The sidebar has the cards Het makkelijkst and Het moeilijkst (`RankingCard`),
 * the best and the worst five of the average points per match, which count the same matches as
 * the list and let a visitor choose Alle, Thuis or Uit, the card Laatste overwinning
 * (`LastWinCard`) with the clubs of the Eredivisie, and the credit under it. On a phone it
 * follows the list.
 */
export async function ClubListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { competitie } = await searchParams
  const competition = parseCompetition(competitie)

  if (competition === undefined) {
    notFound()
  }

  const [loaded, venueLoaded] = await Promise.all([loadClubList(), loadVenueRecords(competition)])

  if (loaded.kind === 'error' || venueLoaded.kind === 'error') {
    return <ServerError retryHref={opponentsPath} />
  }

  const played = (records: { played: number }[]) => records.reduce((sum, record) => sum + record.played, 0)
  // A choice without a played match is not offered, and with nothing to choose, no switch.
  // The choice of the address stays in the switch, so a visitor who asked for one without a
  // match has the way back to `all`.
  const options = optionsOf(
    (['league', 'playoffs', 'cup', 'europe'] as const).filter(
      (choice) => choice === competition || played(loaded.records[choice]) > 0,
    ),
  )
  const hasCup = options.length > 0
  const records = loaded.records[competition]
  const venueRecords = { all: records, away: venueLoaded.away, home: venueLoaded.home }
  const since = sinceOf(loaded.seasons)

  return (
    <>
      <Page.Main areas={pageAreas({ after: ['side'], toolbar: hasCup })} columns="equal">
        <Page.Cell area="head">
          <Page.Title>
            <Heading level={1}>Tegenstanders</Heading>
          </Page.Title>
        </Page.Cell>
        {hasCup && (
          <Page.Toolbar>
            <CompetitionLinks address={opponentsPath} competition={competition} league="Competitie" options={options} />
          </Page.Toolbar>
        )}
        <Page.Cell area="main">
          <ClubsCard
            address={opponentsPath}
            choice={competition}
            query={competitionQuery(competition)}
            records={records}
            since={since}
          />
        </Page.Cell>
        <Page.Section area="side" aria-label="Het makkelijkst, het moeilijkst en de bron">
          <RankingCard
            address={opponentsPath}
            choice={competition}
            query={competitionQuery(competition)}
            records={venueRecords}
            since={since}
          />
          <RankingCard
            address={opponentsPath}
            choice={competition}
            low
            query={competitionQuery(competition)}
            records={venueRecords}
            since={since}
          />
          <LastWinCard address={opponentsPath} places={loaded.lastWins} query={competitionQuery(competition)} />
          <OpponentsCredit
            edited={loaded.edited}
            pages={loaded.pages}
            seasons={loaded.seasons}
            source={loaded.source}
          />
        </Page.Section>
      </Page.Main>
    </>
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
    description: `Hoe vaak sc Heerenveen won, gelijkspeelde en verloor tegen ${name}, met alle wedstrijden en de bron erbij: ${sourceName(sourceOf(loaded.page.matches))}.`,
    title: `sc Heerenveen tegen ${name}`,
  })
}

/**
 * The page of one club: its name as the heading, with "Eerder: …" under it when the editors
 * keep a list of its names (see `earlierNames`), the record against it (the total, at home and
 * away, and the biggest win and loss) and every match: first those still to come, the next one
 * first, then those played, the newest first, ten to a page (`?pagina=2`, after the choice in
 * the address; a page after the last one is "niet gevonden"). The matches are the main column,
 * on the white surface; the record, the chart of the scores, the card with the names of the
 * stadium of the club and the credit are the sidebar. A club with matches to come and none
 * played has the credit alone. It follows the choice between all the matches and the
 * Eredivisie (the names of the stadium come from the Eredivisie whatever the choice). A club
 * we only met in the cup says with the choice Eredivisie that we have not played it there. A
 * slug no club has, and a
 * choice that is not known, are the page "niet gevonden".
 */
export async function ClubPage({ searchParams, slug }: { searchParams: Promise<SearchParams>; slug: string }) {
  const params = await searchParams
  const competition = parseCompetition(params[competitionParam])
  const query = parseFilterQuery(params, competitionParam)
  const loaded = await loadClub(slug)

  if (competition === undefined || query === undefined || loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={`${opponentsPath}/${slug}`} />
  }

  const { club, matches } = loaded.page
  const now = new Date()
  const meetings = meetingsOf(matches, competition)
  const upcoming = upcomingOf(matches, competition, now)

  // The choice Alle, Thuis or Uit is only on the card when the club has a match both at home
  // and away in this competition; with only one side a link to a choice falls back to Alle.
  const hasVenueChoice = hasBothVenues([...meetings, ...upcoming])
  const venue = hasVenueChoice ? parseVenue(params[venueParam]) : 'all'
  const cardMeetings = venueMatchesOf(meetings, venue)
  const cardUpcoming = venueMatchesOf(upcoming, venue)

  // A page after the last one is "niet gevonden"; a club with no match played has one page.
  if (query.page > meetingPageCount(cardMeetings)) {
    notFound()
  }

  // The lines on this page of the list link to the pages of their matches, where there are any.
  const pages = await getMatchPages([
    ...(query.page === 1 ? cardUpcoming : []),
    ...meetingsOnPage(cardMeetings, query.page),
  ])
  const clubAddress = (choice: CompetitionChoice, choiceVenue: Venue, page = 1) =>
    filterHref(`${opponentsPath}/${slug}`, clubQuery(choice, choiceVenue, page))
  const pageHref = (page: number) => clubAddress(competition, venue, page)
  const options = optionsOf(
    (['league', 'playoffs', 'cup', 'europe'] as const).filter(
      (choice) =>
        choice === competition || meetingsOf(matches, choice).length > 0 || upcomingOf(matches, choice, now).length > 0,
    ),
  )
  const hasCup = options.length > 0
  const noneYet =
    competition === 'all'
      ? 'We hebben nog niet tegen deze club gespeeld.'
      : `In ${competitionWords(competition)} hebben we nog niet tegen deze club gespeeld.`
  const earlier = earlierNames(loaded.page.names, club.name)
  const stadiums = stadiumViewsOf(loaded.page.stadiums, matches)
  const hasNews = loaded.news.length > 0
  const hasSide = meetings.length > 0 || upcoming.length > 0 || stadiums.length > 0 || hasNews

  return (
    <>
      <Page.Main
        areas={pageAreas({
          after: hasSide ? ['side'] : [],
          before: meetings.length > 0 ? ['summary'] : [],
          toolbar: hasCup,
        })}
        columns="equal"
      >
        <Page.Cell area="head">
          <Heading level={1}>{club.name}</Heading>
          {earlier !== undefined && <Text appearance="meta">{`Eerder: ${earlier}`}</Text>}
          <ClubNamesNotes names={clubNameViewsOf(loaded.page.names)} />
        </Page.Cell>
        {hasCup && (
          <Page.Toolbar>
            <CompetitionLinks
              address={`${opponentsPath}/${slug}`}
              competition={competition}
              league={leagueLabel(matches.map((match) => match.competition))}
              options={options}
            />
          </Page.Toolbar>
        )}
        {/* The summary stands before the matches in the source, so on a phone it is the first
            card, and on a wide screen it is the second column. */}
        {meetings.length > 0 && (
          <Page.Section area="summary" aria-label="Onze uitslagen">
            <ClubSummaryCard
              choice={competition}
              name={club.name}
              now={now}
              since={sinceOf(loaded.seasons)}
              source={sourceOf(meetings)}
              summary={summaryOf(meetings)}
            />
          </Page.Section>
        )}
        <Page.Cell area="main">
          {meetings.length === 0 && upcoming.length === 0 ? (
            <Text>{noneYet}</Text>
          ) : (
            <ClubMeetingsCard
              meetings={cardMeetings}
              now={now}
              page={query.page}
              pageHref={pageHref}
              pages={pages}
              upcoming={cardUpcoming}
              venue={venue}
              venueHrefs={
                hasVenueChoice
                  ? {
                      all: clubAddress(competition, 'all'),
                      away: clubAddress(competition, 'away'),
                      home: clubAddress(competition, 'home'),
                    }
                  : undefined
              }
            />
          )}
        </Page.Cell>
        {/* On a phone the cards beside the matches follow them: the timeline, the names of the
            stadium and the credit. */}
        {meetings.length > 0 ? (
          <Page.Section
            area="side"
            aria-label={sidebarLabel([
              'meer cijfers',
              hasNews && 'het nieuws',
              stadiums.length > 0 && 'het stadion',
              'de bron',
            ])}
          >
            <ClubTimelineCard matches={matches} now={now} since={sinceOf(loaded.seasons)} />
            <ClubScoreCountsCard meetings={meetings} />
            <ClubPlacesCard name={club.name} places={loaded.places} />
            <ClubAttendanceCard
              attendance={clubAttendanceOf(matches, competition)}
              choice={competition}
              name={club.name}
              source={sourceOf(matches)}
            />
            {hasClubScorers(matches) && <ClubTopScorersCard choice={competition} matches={matches} name={club.name} />}
            <ClubNewsCard headlines={loaded.news} name={club.name} now={now} />
            <StadiumsCard stadiums={stadiums} />
            <OpponentsCredit
              edited={loaded.edited}
              pages={loaded.pages}
              seasons={seasonsOf([...meetings, ...upcoming])}
              source={sourceOf([...meetings, ...upcoming])}
            />
          </Page.Section>
        ) : (
          hasSide && (
            <Page.Section
              area="side"
              aria-label={sidebarLabel([
                hasNews && 'het nieuws',
                stadiums.length > 0 && 'het stadion',
                upcoming.length > 0 && 'de bron',
              ])}
            >
              <ClubNewsCard headlines={loaded.news} name={club.name} now={now} />
              <StadiumsCard stadiums={stadiums} />
              {upcoming.length > 0 && (
                <OpponentsCredit edited={loaded.edited} pages={loaded.pages} seasons={seasonsOf(upcoming)} />
              )}
            </Page.Section>
          )
        )}
      </Page.Main>
    </>
  )
}

/**
 * The bar of the page Tegenstanders (see `opponentsShortcutsOf`). A choice that the page
 * doesn't know is the page "niet gevonden", and a page that can't read its data shows the
 * error page: neither has cards to jump to, so there is no bar. The readings are the page's
 * own, cached, so this costs no query. The links stay on the page, so they keep the choice.
 */
export async function opponentsShortcuts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const competition = parseCompetition((await searchParams)[competitionParam])

  if (competition === undefined) {
    return null
  }

  const [loaded, venueLoaded] = await Promise.all([loadClubList(), loadVenueRecords(competition)])

  if (loaded.kind === 'error' || venueLoaded.kind === 'error') {
    return null
  }

  return <Page.Shortcuts items={opponentsShortcutsOf(loaded.lastWins !== undefined)} label="Op deze pagina:" />
}

/** The label of a sidebar from the names of its cards: "Het nieuws, het stadion en de bron". */
function sidebarLabel(parts: readonly (false | string)[]) {
  const names = parts.filter((part) => part !== false)
  const text = names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}
