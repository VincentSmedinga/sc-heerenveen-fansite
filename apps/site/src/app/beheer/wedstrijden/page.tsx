import type { Metadata } from 'next'

import { describeEntryKickoff } from '@fansite/db/match-edits'
import { listMatchSeasons } from '@fansite/db/queries'
import { seasonOf } from '@fansite/db/season'
import {
  Breadcrumb,
  Card,
  DataTable,
  Filter,
  Heading,
  Link,
  Notice,
  Page,
  SeasonPicker,
  Tag,
  Text,
} from '@fansite/design-system'

import type { AdminMatchRow } from '#src/beheer/match-entries'

import { compact } from '#src/beheer/density'
import { listAdminMatches } from '#src/beheer/match-entries'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'
import { seasonChoices, seasonFromSlug, seasonSlug } from '#src/seasons'

import { listPath, matchesPath, matchPath, reportPath } from './paths'

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
}

const notices: Record<string, string> = {
  besloten:
    'Over deze afwijking of wijziging is al beslist, door iemand anders, door het commando of door de import. Er is niets veranderd.',
  weg: 'Deze wedstrijd bestaat niet. Er is niets veranderd. Kies hieronder een wedstrijd.',
}

// The matches of a season for a beheerder, to fill in or to correct. The list opens on the
// matches without a result, because Wikipedia is behind there; "Alles" keeps them on top.
// What an editor entered is told in words, never in colour alone.
export default async function MatchesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('beheerder')

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
    <Page.Main
      className={compact}
      intro={
        <>
          <Breadcrumb current="Wedstrijden" items={[{ href: '/beheer', label: 'Beheer' }]} label="Kruimelpad" />
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
        </>
      }
      wide
    >
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
              columns={[
                'Wedstrijd',
                { fold: true, name: 'Datum' },
                { fold: true, name: 'Competitie' },
                'Uitslag',
                'Status',
                { fold: true, name: 'Verslag' },
              ]}
              rows={tableRows(shown)}
            />
          )}
        </Card>
      )}
    </Page.Main>
  )
}

const emptyTexts: Record<Show, string> = {
  aangepast: 'De redactie heeft in dit seizoen nog geen wedstrijd aangepast.',
  alles: '',
  'wikipedia-wacht': 'Er wacht geen wijziging van Wikipedia op een besluit in dit seizoen.',
  'zonder-uitslag': 'Alle wedstrijden hebben een uitslag.',
}

/** The rows of the table. The clubs are the row header, so a second meeting gets its round. */
function tableRows(matches: readonly AdminMatchRow[]) {
  const names = matches.map(clubsOf)

  return matches.map((match, index) => {
    const clubs = names[index] as string

    return {
      cells: [
        describeEntryKickoff(match),
        competitionOf(match),
        <ResultCell key="uitslag" match={match} />,
        <StatusCell key="status" match={match} />,
        <ReportCell clubs={clubs} key="verslag" match={match} />,
      ],
      header: names.indexOf(clubs) === names.lastIndexOf(clubs) ? clubs : `${clubs} (${match.round})`,
      href: matchPath(match.id),
    }
  })
}

const clubsOf = (match: Pick<AdminMatchRow, 'home' | 'opponent'>) =>
  match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`

const competitionOf = (match: Pick<AdminMatchRow, 'competition' | 'round'>) => `${match.competition}, ${match.round}`

/**
 * The state of the report in words: empty, busy (`bezig`), done (`klaar`) or "Controleer" for a
 * report that was done and does not fit the match any more. The link names the match, since a
 * column of links says the same thing in every row.
 */
function ReportCell({ clubs, match }: { clubs: string; match: AdminMatchRow }) {
  if (match.status !== 'played') {
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

  const state = match.reportToCheck
    ? 'Controleer'
    : match.reportStatus === 'klaar'
      ? 'Klaar'
      : match.reportStatus === 'bezig'
        ? 'Bezig'
        : 'Leeg'

  return (
    <>
      {state === 'Controleer' ? <Tag tone="attention">Controleer</Tag> : state}{' '}
      <Link href={reportPath(match.id)}>
        {state === 'Leeg' ? 'Invullen' : 'Openen'}
        <Text as="span" className="hf-visually-hidden">
          {' '}
          verslag van {clubs}
        </Text>
      </Link>
    </>
  )
}

/** The score in the order of the match, as the title has the clubs. */
function ResultCell({ match }: { match: AdminMatchRow }) {
  if (match.status !== 'played' || match.goalsFor === null || match.goalsAgainst === null) {
    return (
      <>
        <Text aria-hidden="true" as="span">
          –
        </Text>
        <Text as="span" className="hf-visually-hidden">
          Geen uitslag
        </Text>
      </>
    )
  }

  return match.home ? `${match.goalsFor} - ${match.goalsAgainst}` : `${match.goalsAgainst} - ${match.goalsFor}`
}

/** The status in words, with a Tag for what needs a look: a missing result and an entry. */
function StatusCell({ match }: { match: AdminMatchRow }) {
  const status = {
    cancelled: 'Geannuleerd',
    played: 'Gespeeld',
    postponed: 'Uitgesteld',
    scheduled: 'Gepland',
  }[match.status]

  return (
    <>
      {status}
      {match.lacksResult ? (
        <>
          {' '}
          <Tag tone="attention">Uitslag ontbreekt</Tag>
        </>
      ) : null}
      {match.edited.length === 0 ? null : (
        <>
          {' '}
          <Tag tone="highlight">Aangepast</Tag>
        </>
      )}
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
