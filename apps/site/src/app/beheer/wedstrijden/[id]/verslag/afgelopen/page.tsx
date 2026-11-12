import type { Metadata } from 'next'

import { describeEntryKickoff } from '@fansite/db/match-edits'
import { Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound, redirect } from 'next/navigation'

import { reportPath } from '#src/app/beheer/wedstrijden/paths'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { findReportScreen } from '#src/beheer/match-reports'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitFinish } from '../actions'
import { FinishForm } from './FinishForm'

// Render on each request: the report changes with every entry and every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Wedstrijd afgelopen' }

type Props = { params: Promise<{ id: string }> }

// The confirmation of "Wedstrijd afgelopen" for a match that is still being played: the score
// that the goals of the report give, which the editor can change before the match gets its
// result. A match that is not being played any more, or has no report, goes back to the
// screen of the report.
export default async function FinishMatchPage({ params }: Props) {
  await requireRole('owner', 'editor')

  const id = parseItemId((await params).id)
  const screen = id === undefined ? undefined : await findReportScreen(getDatabase().db, id)

  if (id === undefined || screen === undefined) {
    notFound()
  }

  const { goals, match, report } = screen

  if (match.status !== 'scheduled' || report === undefined) {
    redirect(reportPath(id, match.status === 'played' ? 'al-afgelopen' : undefined))
  }

  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`
  const ours = goals.filter((goal) => goal.ours).length

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Text>
            <Link href={reportPath(id)} icon="arrow-left">
              Terug naar het verslag
            </Link>
          </Text>
          <Heading level={1}>Wedstrijd afgelopen: {clubs}</Heading>
          <Text appearance="meta">
            {match.competition}, {match.round} · {describeEntryKickoff(match)}
          </Text>
        </>
      }
    >
      <FinishForm
        action={submitFinish.bind(null, id)}
        cancelHref={reportPath(id)}
        counted={{ against: goals.length - ours, for: ours }}
        home={match.home}
        opponent={match.opponent}
      />
    </Page.Main>
  )
}
