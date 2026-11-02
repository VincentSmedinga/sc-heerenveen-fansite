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

import { listPath, matchesPath, matchPath } from './paths'

// Render on each request: who is logged in and which matches have an entry are not known when
// the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Wedstrijden' }

type SearchParams = Record<string, string | string[] | undefined>

/** What the list shows: the matches without a result, those the editors changed, or all. */
type Show = 'aangepast' | 'alles' | 'zonder-uitslag'

const shows: readonly Show[] = ['zonder-uitslag', 'alles', 'aangepast']

/** The list opens on what is left to do. */
const defaultShow: Show = 'zonder-uitslag'

const notices: Record<string, string> = {
  besloten: 'Over deze afwijking is al beslist, door iemand anders of door de import. Er is niets veranderd.',
  weg: 'Deze wedstrijd bestaat niet. Er is niets veranderd. Kies hieronder een wedstrijd.',
}

// The matches of a season for a beheerder, to fill in or to correct. The list opens on the
// matches without a result, because Wikipedia is behind there; "Alles" keeps them on top.
// What an editor entered is told in words, never in colour alone.
export default async function MatchesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('beheerder')

  const { fout, seizoen, tonen } = await searchParams
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
  const shown = { aangepast: edited, alles: rows, 'zonder-uitslag': lacking }[show]
  const address = (choice: Show) =>
    listPath(season === current ? undefined : season, choice === defaultShow ? undefined : choice)
  const notice = typeof fout === 'string' ? notices[fout] : undefined

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
      ],
      header: names.indexOf(clubs) === names.lastIndexOf(clubs) ? clubs : `${clubs} (${match.round})`,
      href: matchPath(match.id),
    }
  })
}

const clubsOf = (match: Pick<AdminMatchRow, 'home' | 'opponent'>) =>
  match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`

const competitionOf = (match: Pick<AdminMatchRow, 'competition' | 'round'>) => `${match.competition}, ${match.round}`

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
  const status = match.status === 'played' ? 'Gespeeld' : match.status === 'postponed' ? 'Uitgesteld' : 'Gepland'

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
      {match.differs === 0 ? null : (
        <>
          {' '}
          <Tag tone="attention">Wikipedia wijkt af</Tag>
        </>
      )}
    </>
  )
}
