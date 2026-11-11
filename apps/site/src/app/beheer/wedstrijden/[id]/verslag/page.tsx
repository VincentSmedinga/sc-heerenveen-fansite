import type { Metadata } from 'next'

import { describeEntryKickoff } from '@fansite/db/match-edits'
import { phaseOf } from '@fansite/db/match-reports'
import { Button, Card, Form, Heading, Link, Notice, Page, Strong, Tag, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { finishPath, livePath, matchPath, pastePath } from '#src/app/beheer/wedstrijden/paths'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import {
  contextOf,
  findPreviousLineUp,
  findReportScreen,
  reportBasis,
  seriesOf,
  valuesOfReport,
} from '#src/beheer/match-reports'
import { checkReportForm } from '#src/beheer/report-form'
import { previewMatchOf } from '#src/beheer/report-preview-match'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitRemoveReport, submitReport } from './actions'
import { RemoveReportForm } from './RemoveReportForm'
import { ReportDraftNotice, ReportErrorSummary, ReportFormProvider, ReportSavePanel } from './ReportForm'
import { ReportWorkspace } from './ReportPreview'

// Render on each request: the report changes with every entry and every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Verslag invullen' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The words of the address after a save that worked, so the input the browser kept is gone.
const savedNotices = ['klaar', 'nog-niet-klaar', 'ongewijzigd', 'opgeslagen', 'weggehaald']

/** What the last action says, by the word in the address. */
const notices: Record<string, { text: string; title: string }> = {
  afgelopen: {
    text: 'De wedstrijd heeft nu zijn uitslag en telt mee in de cijfers. Het verslag is nog bezig: maak het af en zet het dan op klaar.',
    title: 'Wedstrijd afgelopen',
  },
  'al-afgelopen': {
    text: 'De wedstrijd had al een uitslag, bijvoorbeeld van de import van Wikipedia. Er is niets veranderd.',
    title: 'Al afgelopen',
  },
  'geen-verslag': { text: 'Er was geen verslag om weg te halen.', title: 'Niets weggehaald' },
  klaar: { text: 'De regels vinden niets mis. Dit verslag telt mee op de site.', title: 'Klaar' },
  'nog-niet-klaar': {
    text: 'Je gegevens zijn bewaard, maar de regels vinden nog iets. Zolang dat zo is, blijft het verslag bezig. Los de fouten hieronder op en kies dan weer Klaar.',
    title: 'Bewaard als bezig',
  },
  ongewijzigd: { text: 'Je had niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' },
  opgeslagen: { text: 'Je gegevens zijn bewaard. Het verslag is nog bezig.', title: 'Opgeslagen' },
  weggehaald: {
    text: 'Het verslag is weg en de doelpunten zijn teruggezet naar wat Wikipedia zegt.',
    title: 'Verslag weggehaald',
  },
}

// The report of one match: the data, and for both teams the line-up and the bench, the
// substitutions, the goals, the cards, the missed penalties and the kicks of the shoot-out. The
// main column holds the cards of the form, the sidebar the save panel and the block that takes
// the report away. The rules of the report judge what is stored every time the page opens, so a
// report that was klaar and no longer fits the result says so. The page tells what the last
// action did from the word in the address.
export default async function ReportPage({ params, searchParams }: Props) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const screen = id === undefined ? undefined : await findReportScreen(getDatabase().db, id)

  if (id === undefined || screen === undefined) {
    notFound()
  }

  const { goals, match, report, squad } = screen
  const { gedaan } = await searchParams
  const now = new Date()
  const phase = phaseOf(match, now)
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined
  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`
  const title = `${match.round} (${match.competition}): ${clubs}`
  const values = valuesOfReport(report, goals, squad)
  const previousLineUp = await findPreviousLineUp(getDatabase().db, match, squad)
  // A report that is stored is judged again, so what is wrong shows. A new one has nothing
  // to say yet.
  const checked = report === undefined ? undefined : checkReportForm(values, contextOf(screen))
  const status = report?.report.status
  const toCheck = status === 'klaar' && checked !== undefined && Object.keys(checked.errors).length > 0

  return (
    <ReportFormProvider
      action={submitReport.bind(null, match.id, reportBasis(report))}
      choices={{
        matchHref: matchPath(match.id),
        matchId: match.id,
        opponent: match.opponent,
        preview: previewMatchOf(match, now),
        previousLineUp: previousLineUp?.label,
        series: seriesOf(match),
        showDelay: describeShowDelay(match.season),
        squad,
      }}
      initial={{ errors: checked?.errors ?? {}, values, version: 0, warnings: checked?.warnings ?? {} }}
      key={`${match.id}-${report?.report.savedAt.getTime() ?? 0}-${gedaan ?? ''}`}
      title={toCheck ? 'Controleer het verslag' : 'Dit is nog niet af'}
    >
      <Page.Main
        className={compact}
        intro={
          <>
            <Text>
              <Link href={matchPath(match.id)} icon="arrow-left">
                Terug naar de wedstrijd
              </Link>
            </Text>
            <Heading level={1}>Verslag: {clubs}</Heading>
            <Text appearance="meta">
              {match.competition}, {match.round} · {describeEntryKickoff(match)} ·{' '}
              {phase === undefined
                ? `Uitslag ${match.goalsFor}–${match.goalsAgainst}`
                : phase === 'live'
                  ? 'De wedstrijd wordt gespeeld, nog geen uitslag'
                  : 'De wedstrijd is nog niet begonnen'}
            </Text>
            <Text>
              {status === undefined ? (
                <Tag>Nog geen verslag</Tag>
              ) : (
                <Tag tone="highlight">{status === 'klaar' ? 'Klaar' : 'Bezig'}</Tag>
              )}{' '}
              {phase === 'live' && status !== undefined ? <Tag tone="highlight">Live</Tag> : null}{' '}
              {toCheck ? <Tag tone="attention">Controleer</Tag> : null}
            </Text>
          </>
        }
        wide
      >
        <ReportErrorSummary />
        <ReportDraftNotice
          savedAt={
            typeof gedaan === 'string' && savedNotices.includes(gedaan)
              ? (report?.report.savedAt.getTime() ?? 0)
              : undefined
          }
        />
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        <ReportWorkspace />
      </Page.Main>
      <Page.Sidebar aria-label="Opslaan en verslag" sticky>
        <ReportSavePanel cancelHref={matchPath(match.id)} />
        {report === undefined ? null : (
          <Card aria-labelledby="live-kop">
            <Heading id="live-kop" level={2}>
              Tijdens de wedstrijd
            </Heading>
            <Text>
              Houd het verslag bij vanaf een telefoon: een doelpunt, een kaart of een wissel is meteen opgeslagen.
            </Text>
            <Link href={livePath(match.id)} icon="arrow-right">
              Verslag bijhouden
            </Link>
          </Card>
        )}
        <Card aria-labelledby="plakken-kop">
          <Heading id="plakken-kop" level={2}>
            Tekst plakken
          </Heading>
          <Text>Plak het verslag als tekst en vul het formulier er zo mee in. Wat je nu invulde, gaat niet mee.</Text>
          <Link href={pastePath(match.id)} icon="arrow-right">
            Tekst plakken
          </Link>
        </Card>
        {phase === undefined || report === undefined ? null : (
          <Card aria-labelledby="afgelopen-kop">
            <Heading id="afgelopen-kop" level={2}>
              Wedstrijd afgelopen
            </Heading>
            <Text>
              Zodra de wedstrijd is afgelopen, krijgt hij zijn uitslag uit de doelpunten van dit verslag. Bewaar eerst
              je wijzigingen.
            </Text>
            <Form action={finishPath(match.id)} method="get">
              <Button type="submit">Wedstrijd afgelopen</Button>
            </Form>
          </Card>
        )}
        {report === undefined ? null : (
          <RemoveReportForm action={submitRemoveReport.bind(null, match.id)} title={title} />
        )}
      </Page.Sidebar>
    </ReportFormProvider>
  )
}
