import type { Metadata } from 'next'

import { listMatchSeasons } from '@fansite/db/queries'
import { seasonOf } from '@fansite/db/season'
import { Card, DataTable, Filter, Heading, Link, Notice, Page, SeasonPicker, Tag, Text } from '@fansite/design-system'

import type { AdminMatchRow } from '#src/beheer/match-entries'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { listAdminMatches } from '#src/beheer/match-entries'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'
import { seasonChoices, seasonFromSlug, seasonSlug } from '#src/seasons'

import { addPath, listPath, livePath, matchesPath, matchPath, reportPath } from './paths'

// Render on each request: who is logged in and which matches have an entry are not known when
// the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Wedstrijden' }

type SearchParams = Record<string, string | string[] | undefined>

/**
 * What the list shows: the matches without a result, those the editors changed, those with a
 * change that Wikipedia holds back, or all.
 */
type Show = 'aangepast' | 'alles' | 'wikipedia-wacht' | 'zonder-uitslag'

const shows: readonly Show[] = ['zonder-uitslag', 'alles', 'aangepast', 'wikipedia-wacht']

/** The list opens on what is left to do. */
const defaultShow: Show = 'zonder-uitslag'

const done: Record<string, string> = {
  verwijderd: 'De wedstrijd is weggehaald, omdat hij niet meer op de pagina van Wikipedia staat.',
  'wedstrijd-weg': 'De wedstrijd is verwijderd, met zijn doelpunten en zijn verslag.',
}

const notices: Record<string, string> = {
  besloten:
    'Over deze afwijking of wijziging is al beslist, door iemand anders, door het commando of door de import. Er is niets veranderd.',
  weg: 'Deze wedstrijd bestaat niet. Er is niets veranderd. Kies hieronder een wedstrijd.',
}

// The matches of a season for an editor, to fill in or to correct. The list opens on the
// matches without a result, because Wikipedia is behind there; "Alles" keeps them on top.
// What an editor entered is told in words, never in colour alone.
export default async function MatchesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('owner', 'editor')

  const { fout, gedaan, seizoen, tonen } = await searchParams
  const now = new Date()
  const current = seasonOf(now)
  const { db } = getDatabase()
  // The seasons up to the current one, which is always there. It is not the cached list of the
  // public pages: an editor must see a match that was added a minute ago.
  const seasons = [current, ...(await listMatchSeasons(db)).filter((known) => known < current)].sort().reverse()
  const requested = typeof seizoen === 'string' ? seasonFromSlug(seizoen) : undefined
  const season = requested !== undefined && seasons.includes(requested) ? requested : current
  const show = shows.find((choice) => choice === tonen) ?? defaultShow
  const { rows } = await listAdminMatches(db, season, now)
  const lacking = rows.filter((match) => match.lacksResult)
  const edited = rows.filter((match) => match.edited.length > 0)
  const holding = rows.filter((match) => match.held > 0)
  const shown = { aangepast: edited, alles: rows, 'wikipedia-wacht': holding, 'zonder-uitslag': lacking }[show]
  const address = (choice: Show) =>
    listPath(season === current ? undefined : season, choice === defaultShow ? undefined : choice)
  const notice = typeof fout === 'string' ? notices[fout] : typeof gedaan === 'string' ? done[gedaan] : undefined

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Page.Title>
          <Heading level={1}>Wedstrijden</Heading>
          <SeasonPicker
            action={matchesPath}
            fields={show === defaultShow ? {} : { tonen: show }}
            options={seasonChoices(seasons)}
            value={seasonSlug(season)}
          />
        </Page.Title>
        <Text appearance="intro">
          Vul een wedstrijd in of verbeter hem, als Wikipedia achterloopt of een fout heeft. Wat je opslaat, staat{' '}
          {describeShowDelay(season, now)} op de site.
        </Text>
        <Text>
          <Link href={addPath}>Wedstrijd toevoegen</Link>
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {notice === undefined ? null : <Notice>{notice}</Notice>}
        {rows.length === 0 ? (
          <Text>Er zijn nog geen wedstrijden in het seizoen {season}.</Text>
        ) : (
          <Card aria-labelledby="wedstrijden-kop">
            <Heading className="hf-visually-hidden" id="wedstrijden-kop" level={2}>
              Wedstrijden in het seizoen {season}
            </Heading>
            <Filter
              items={[
                { current: show === 'alles', href: address('alles'), label: `Alles (${rows.length})` },
                {
                  current: show === 'zonder-uitslag',
                  href: address('zonder-uitslag'),
                  label: `Zonder uitslag (${lacking.length})`,
                },
                { current: show === 'aangepast', href: address('aangepast'), label: `Aangepast (${edited.length})` },
                {
                  current: show === 'wikipedia-wacht',
                  href: address('wikipedia-wacht'),
                  label: `Wikipedia wacht (${holding.length})`,
                },
              ]}
              label="Wedstrijden filteren"
            />
            {shown.length === 0 ? (
              <Text>{emptyTexts[show]}</Text>
            ) : (
              <DataTable
                appearance="text"
                caption={`Wedstrijden in het seizoen ${season}`}
                columns={['Wedstrijd', 'Uitslag', 'Verslag']}
                rows={tableRows(shown)}
              />
            )}
          </Card>
        )}
      </Page.Cell>
    </Page.Main>
  )
}

const emptyTexts: Record<Show, string> = {
  aangepast: 'De redactie heeft in dit seizoen nog geen wedstrijd aangepast.',
  alles: '',
  'wikipedia-wacht': 'Er wacht geen wijziging van Wikipedia op een besluit in dit seizoen.',
  'zonder-uitslag': 'Alle wedstrijden hebben een uitslag.',
}

/**
 * The rows of the table. The clubs are the row header and the only link, so a second meeting
 * gets its round. The line under it has the day, the kick-off and the competition.
 */
function tableRows(matches: readonly AdminMatchRow[]) {
  const names = matches.map(clubsOf)

  return matches.map((match, index) => {
    const clubs = names[index] as string

    return {
      cells: [<ResultCell key="uitslag" match={match} />, <ReportCell key="verslag" match={match} />],
      header: names.indexOf(clubs) === names.lastIndexOf(clubs) ? clubs : `${clubs} (${match.round})`,
      href: targetOf(match),
      secondary: `${whenOf(match)} · ${match.competition}, ${match.round}`,
    }
  })
}

const clubsOf = (match: Pick<AdminMatchRow, 'home' | 'opponent'>) =>
  match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`

/** Where the link of a match goes: what the editor wants to do with it in its state. */
function targetOf(match: Pick<AdminMatchRow, 'id' | 'live' | 'reportable'>) {
  if (match.live) {
    return livePath(match.id)
  }

  return match.reportable ? reportPath(match.id) : matchPath(match.id)
}

const shortDay = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Amsterdam',
  weekday: 'short',
})
const shortTime = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: 'Europe/Amsterdam',
})

/**
 * The state of the report in one word: `Geen`, `Niet af`, `Klaar`, or `Live` while the match is
 * being played. A report that was done and does not fit the match any more is `Klopt niet`.
 */
function ReportCell({ match }: { match: AdminMatchRow }) {
  if (!match.reportable) {
    return (
      <>
        <Text aria-hidden="true" as="span">
          –
        </Text>
        <Text as="span" className="hf-visually-hidden">
          Geen verslag: de wedstrijd is niet gespeeld
        </Text>
      </>
    )
  }

  if (match.live) {
    return 'Live'
  }

  if (match.reportToCheck) {
    return <Tag tone="attention">Klopt niet</Tag>
  }

  return match.reportStatus === 'klaar' ? 'Klaar' : match.reportStatus === 'bezig' ? 'Niet af' : 'Geen'
}

/**
 * The score in the order of the match, or the status in a word when there is none yet. Only
 * what asks for action is a Tag: a missing result and a change of Wikipedia.
 */
function ResultCell({ match }: { match: AdminMatchRow }) {
  const played = match.status === 'played'
  const score =
    played && match.goalsFor !== null && match.goalsAgainst !== null
      ? match.home
        ? `${match.goalsFor} - ${match.goalsAgainst}`
        : `${match.goalsAgainst} - ${match.goalsFor}`
      : undefined
  const status = { cancelled: 'Geannuleerd', played: '–', postponed: 'Uitgesteld', scheduled: 'Gepland' }[match.status]

  return (
    <>
      {score ?? (
        <Text aria-hidden={played ? 'true' : undefined} as="span">
          {status}
        </Text>
      )}
      {score === undefined && played ? (
        <Text as="span" className="hf-visually-hidden">
          Geen uitslag
        </Text>
      ) : null}
      {match.lacksResult ? (
        <>
          {' '}
          <Tag tone="attention">Uitslag ontbreekt</Tag>
        </>
      ) : null}
      {match.held === 0 ? null : (
        <>
          {' '}
          <Tag tone="attention">Wikipedia wacht</Tag>
        </>
      )}
      {match.differs === 0 ? null : (
        <>
          {' '}
          <Tag tone="attention">Wikipedia wijkt af</Tag>
        </>
      )}
    </>
  )
}

/** The short day and the time, no year: `za 1 nov, 20.00`. An old match has no time. */
function whenOf(match: Pick<AdminMatchRow, 'kickoffAt' | 'matchDate'>) {
  const day = (date: Date) => shortDay.format(date).replaceAll('.', '')

  return match.kickoffAt === null
    ? day(new Date(`${match.matchDate}T12:00:00Z`))
    : `${day(match.kickoffAt)}, ${shortTime.format(match.kickoffAt).replace(':', '.')}`
}
