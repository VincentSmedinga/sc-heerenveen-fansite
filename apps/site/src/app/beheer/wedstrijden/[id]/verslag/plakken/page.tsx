import type { Metadata } from 'next'

import { describeEntryKickoff } from '@fansite/db/match-edits'
import { Breadcrumb, Heading, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { matchesPath, matchPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { findReportScreen } from '#src/beheer/match-reports'
import { describeStored } from '#src/beheer/report-paste'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitReport } from '../actions'
import { submitPaste } from './actions'
import { PasteBody, PasteProvider, PasteSidebar } from './PasteScreen'

// Render on each request: the report changes with every entry and every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Verslag plakken' }

type Props = { params: Promise<{ id: string }> }

// The screen "Tekst plakken" of a match report: a field for a text in a simple format, and
// after the text is read the form of the report with everything filled in (see PasteScreen). It
// reads and stores nothing by itself; the form saves with the same action as the form typed by
// hand.
export default async function PasteReportPage({ params }: Props) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const screen = id === undefined ? undefined : await findReportScreen(getDatabase().db, id)

  if (id === undefined || screen === undefined) {
    notFound()
  }

  const { match, report, squad } = screen
  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`

  return (
    <PasteProvider
      action={submitPaste.bind(null, match.id)}
      cancelHref={reportPath(match.id)}
      choices={{ opponent: match.opponent, showDelay: describeShowDelay(match.season), squad }}
      existing={report === undefined ? undefined : describeStored(report)}
      saveAction={submitReport.bind(null, match.id)}
    >
      <Page.Main
        className={compact}
        intro={
          <>
            <Breadcrumb
              current="Tekst plakken"
              items={[
                { href: '/beheer', label: 'Beheer' },
                { href: matchesPath, label: 'Wedstrijden' },
                { href: matchPath(match.id), label: clubs },
                { href: reportPath(match.id), label: 'Verslag' },
              ]}
              label="Kruimelpad"
            />
            <Heading level={1}>Verslag plakken: {clubs}</Heading>
            <Text appearance="meta">
              {match.competition}, {match.round} · {describeEntryKickoff(match)} · Uitslag {match.goalsFor}–
              {match.goalsAgainst}
            </Text>
          </>
        }
        wide
      >
        <PasteBody />
      </Page.Main>
      <PasteSidebar />
    </PasteProvider>
  )
}
