import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { fjouwerMatch, fjouwerSquad, fjouwerState } from '#src/fans/fjouwer'
import { cachedStanding, seasonPoints, supporterFours } from '#src/fans/fjouwer-points'
import { emptyRanking, rankedSeasons, seasonRanking } from '#src/fans/fjouwer-ranking'
import { usesLeft } from '#src/fans/fjouwer-rules'
import { logInPaths } from '#src/fans/log-in'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageAreas } from '#src/page-areas'

import { type FjouwerChoice, JouwVierCard, NoMatchCard } from './FjouwerCards'
import { EarlierMatchesCard, LastMatchCard, ScoringCard } from './PointsCards'
import { StandCard } from './StandCards'

// The cards with the four and its points stand in the wide column, the cards with the ranking
// (issue 1473) and the scoring in the narrow one; on a phone the narrow column comes last.
const areas = pageAreas({ after: ['side'], main: ['four', 'last', 'earlier'] })

// Render on each request: what is open, the deadline and the session are not known at build
// time, and the page must never be cached or indexed.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('vier', notFound)

  return { robots: { follow: false, index: false }, title: 'Fjouwer' }
}

/**
 * The page of the game Fjouwer: the match that can be chosen for now, with the form for a
 * supporter who is logged in and the way in for a visitor who is not. From the kick-off the
 * card is about the match after it. The page is the same for a visitor, so it names no personal
 * data; the personal part (the four) is read only with a session. A blocked account goes to the
 * page that says so.
 */
export default async function FjouwerPage() {
  requireFansPart('vier', notFound)

  const supporter = await currentSupporter()

  if (supporter !== undefined && supporter.disabledAt !== null) {
    redirect(logInPaths.blocked)
  }

  const now = new Date()
  const { db } = getDatabase()
  const match = await fjouwerMatch(db, now)
  let choice: FjouwerChoice | undefined

  if (match !== undefined && supporter !== undefined) {
    const [squad, state, points] = await Promise.all([
      fjouwerSquad(db, match),
      fjouwerState(db, supporter.id, match),
      seasonPoints(db, match.season),
    ])

    choice = {
      four: state.four,
      inherited: state.inherited,
      notCounting: state.notCounting,
      players: squad.map((player) => ({
        id: player.id,
        line: player.line,
        name: player.name,
        points: points.get(player.id) ?? 0,
        shirtNumber: player.shirtNumber,
        shortName: player.shortName,
        usesLeft: usesLeft(state.uses, player.id),
      })),
      saved: state.saved,
    }
  }

  // The points of the four of the supporter: the last match with a four, and the ones before.
  const fours = supporter === undefined ? [] : await supporterFours(db, supporter.id, now)
  const [last, ...before] = fours
  const standing = last?.ready ? await cachedStanding(last.match.id) : undefined

  const season = seasonOf(now)
  const ranking = (await rankedSeasons()).includes(season) ? await seasonRanking(season) : undefined

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Fjouwer</Heading>
        <Text appearance="intro">Kies vier spelers voor de volgende wedstrijd van sc Heerenveen.</Text>
      </Page.Cell>
      <Page.Cell area="four">
        {match === undefined ? <NoMatchCard /> : <JouwVierCard choice={choice} match={match} now={now} />}
      </Page.Cell>
      <Page.Cell area="last">
        {supporter === undefined || last === undefined ? null : (
          <LastMatchCard item={last} now={now} standing={standing} supporterId={supporter.id} />
        )}
      </Page.Cell>
      <Page.Cell area="earlier">
        <EarlierMatchesCard items={before} now={now} />
      </Page.Cell>
      <Page.Section area="side" aria-label="De telling">
        <StandCard ranking={ranking ?? emptyRanking} season={season} supporterId={supporter?.id} />
        <ScoringCard />
      </Page.Section>
    </Page.Main>
  )
}
