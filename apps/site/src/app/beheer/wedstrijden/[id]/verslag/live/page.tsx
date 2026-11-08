import type { Metadata } from 'next'

import { describeEntryKickoff } from '@fansite/db/match-edits'
import { phaseOf } from '@fansite/db/match-reports'
import { Breadcrumb, Button, Card, Form, Heading, Link, Notice, Page, Strong, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { finishPath, matchesPath, matchPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { liveViewOf } from '#src/beheer/live-report'
import { contextOf, findReportScreen, valuesOfReport } from '#src/beheer/match-reports'
import { checkReportForm } from '#src/beheer/report-form'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitLiveEvent, submitRemoveLiveEvent } from './actions'
import { LiveEventForm, LiveEvents, LiveStatusProvider } from './LiveForms'

// Render on each request: the report changes with every event, also of another editor.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Verslag bijhouden' }

type Props = { params: Promise<{ id: string }> }

// The quick screen for keeping a report up to date during the match, from a phone (#907): the
// score from the goals, a form for a goal, a card and a substitution that each save at once,
// and the events from the last to the first. The line-up stays in the full form.
export default async function LiveReportPage({ params }: Props) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const screen = id === undefined ? undefined : await findReportScreen(getDatabase().db, id)

  if (id === undefined || screen === undefined) {
    notFound()
  }

  const { goals, match, report } = screen
  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`
  const phase = phaseOf(match, new Date())
  const view = report === undefined ? undefined : liveViewOf(report, goals)
  // What the rules find in the report as it is stored, so what a quick entry left to check.
  const toCheck =
    report === undefined
      ? []
      : Object.values(checkReportForm(valuesOfReport(report, goals, screen.squad), contextOf(screen)).errors).filter(
          (message) => message !== undefined,
        )
  const score =
    view === undefined
      ? ''
      : match.home
        ? `${view.score.ours}–${view.score.opponent}`
        : `${view.score.opponent}–${view.score.ours}`

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Breadcrumb
            current="Bijhouden"
            items={[
              { href: '/beheer', label: 'Beheer' },
              { href: matchesPath, label: 'Wedstrijden' },
              { href: matchPath(id), label: clubs },
              { href: reportPath(id), label: 'Verslag' },
            ]}
            label="Kruimelpad"
          />
          <Heading level={1}>Bijhouden: {clubs}</Heading>
          <Text appearance="meta">
            {match.competition}, {match.round} · {describeEntryKickoff(match)}
          </Text>
        </>
      }
    >
      {view === undefined ? (
        <Card aria-labelledby="geen-verslag-kop">
          <Heading id="geen-verslag-kop" level={2}>
            Eerst de opstelling
          </Heading>
          <Text>
            Dit verslag heeft nog geen spelers. Vul eerst de opstelling in met het volledige formulier of door tekst te
            plakken. Daarna houd je hier de wedstrijd bij.
          </Text>
          <Link href={reportPath(id)} icon="arrow-right">
            Naar het verslag
          </Link>
        </Card>
      ) : (
        <LiveStatusProvider>
          <Card aria-labelledby="stand-kop">
            <Heading id="stand-kop" level={2}>
              Stand {score}
            </Heading>
            {phase === undefined ? null : (
              <Form action={finishPath(id)} method="get">
                <Button type="submit">Wedstrijd afgelopen</Button>
              </Form>
            )}
          </Card>
          {toCheck.length === 0 ? null : (
            <Notice>
              <Strong>Controleer het verslag.</Strong> Wat je invoert, wordt opgeslagen, ook als de regels iets vinden.
              Los het op in het <Link href={reportPath(id)}>volledige formulier</Link>: {toCheck.slice(0, 3).join(' ')}
            </Notice>
          )}
          <LiveEventForm
            action={submitLiveEvent.bind(null, id, 'doelpunt')}
            kind="doelpunt"
            opponent={match.opponent}
            players={view.players}
            title="Doelpunt"
          />
          <LiveEventForm
            action={submitLiveEvent.bind(null, id, 'kaart')}
            kind="kaart"
            opponent={match.opponent}
            players={view.players}
            title="Kaart"
          />
          <LiveEventForm
            action={submitLiveEvent.bind(null, id, 'wissel')}
            kind="wissel"
            opponent={match.opponent}
            players={view.players}
            title="Wissel"
          />
          <Card aria-labelledby="gebeurtenissen-kop">
            <Heading id="gebeurtenissen-kop" level={2}>
              Gebeurtenissen
            </Heading>
            <LiveEvents
              events={view.events.map((event) => ({
                ...event,
                action: submitRemoveLiveEvent.bind(null, id, event.kind, event.id),
              }))}
            />
          </Card>
          <Text>
            <Link href={reportPath(id)}>Naar het volledige verslag</Link>
          </Text>
        </LiveStatusProvider>
      )}
    </Page.Main>
  )
}
