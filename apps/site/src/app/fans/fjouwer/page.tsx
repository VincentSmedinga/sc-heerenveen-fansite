import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { fjouwerMatch, fjouwerSquad, fjouwerState } from '#src/fans/fjouwer'
import { usesLeft } from '#src/fans/fjouwer-rules'
import { logInPaths } from '#src/fans/log-in'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageAreas } from '#src/page-areas'

import { type FjouwerChoice, JouwVierCard, NoMatchCard } from './FjouwerCards'

// The card "Jouw vier" stands in the wide column. The cards of the narrow column come with the
// points (issue 1471) and the ranking (issue 1473), and until then the wide column fills the
// page.
const areas = pageAreas({ main: ['four'] })

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
    const [squad, state] = await Promise.all([fjouwerSquad(db, match), fjouwerState(db, supporter.id, match)])

    choice = {
      four: state.four,
      inherited: state.inherited,
      notCounting: state.notCounting,
      players: squad.map((player) => ({
        id: player.id,
        line: player.line,
        name: player.name,
        surname: player.surname,
        usesLeft: usesLeft(state.uses, player.id),
      })),
      saved: state.saved,
    }
  }

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Fjouwer</Heading>
        <Text appearance="intro">Kies vier spelers voor de volgende wedstrijd van sc Heerenveen.</Text>
      </Page.Cell>
      <Page.Cell area="four">
        {match === undefined ? <NoMatchCard /> : <JouwVierCard choice={choice} match={match} now={now} />}
      </Page.Cell>
    </Page.Main>
  )
}
