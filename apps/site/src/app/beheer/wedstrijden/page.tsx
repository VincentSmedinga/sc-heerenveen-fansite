import type { Metadata } from 'next'

import { describeEntryKickoff, describeEntryResult } from '@fansite/db/match-edits'
import { seasonOf } from '@fansite/db/season'
import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { listAdminMatches } from '../../../beheer/match-entries'
import { requireRole } from '../../../beheer/require-role'
import { getDatabase } from '../../../database'
import { matchPath } from './paths'

// Render on each request: who is logged in and which matches have an entry are not known when
// the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Wedstrijden' }

type SearchParams = Record<string, string | string[] | undefined>

// The matches of the current season for a beheerder, to fill in or to correct: the matches
// without a result two hours after the kick-off first, because Wikipedia is behind there.
// What an editor entered is told in words, never in colour alone.
export default async function MatchesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('beheerder')

  const { fout } = await searchParams
  const now = new Date()
  const season = seasonOf(now)
  const { rows } = await listAdminMatches(getDatabase().db, season, now)

  return (
    <Page.Main
      intro={
        <>
          <Heading level={1}>Wedstrijden</Heading>
          <Text appearance="intro">
            Hier vul je een wedstrijd in of verbeter je hem, als Wikipedia de gegevens nog niet heeft of er een fout in
            staat. Wat je invult, ziet iedereen meteen. Zodra Wikipedia hetzelfde zegt, neemt de import het over.
          </Text>
        </>
      }
    >
      {fout === 'weg' ? (
        <Card aria-labelledby="weg-kop" surface="soft">
          <Heading id="weg-kop" level={2}>
            Deze wedstrijd bestaat niet
          </Heading>
          <Text>Er is niets veranderd. Kies hieronder een wedstrijd.</Text>
        </Card>
      ) : null}
      <Card as="div">
        <Text appearance="meta">
          {rows.length === 0
            ? `Er zijn nog geen wedstrijden in het seizoen ${season}.`
            : `${rows.length} ${rows.length === 1 ? 'wedstrijd' : 'wedstrijden'} in het seizoen ${season}. Wedstrijden zonder uitslag staan bovenaan.`}
        </Text>
        {rows.length === 0 ? null : (
          <List role="list">
            {rows.map((match) => (
              <List.Item key={match.id}>
                <Heading appearance={4} level={2}>
                  <Link href={matchPath(match.id)}>{matchTitle(match)}</Link>
                </Heading>
                <Text appearance="meta">
                  {describeEntryKickoff(match)}
                  {' · '}
                  {match.status === 'played'
                    ? describeEntryResult(match)
                    : match.lacksResult
                      ? 'Uitslag ontbreekt'
                      : match.status === 'postponed'
                        ? 'Uitgesteld'
                        : 'Gepland'}
                  {match.edited.length === 0 ? null : ' · Aangepast door de redactie'}
                </Text>
              </List.Item>
            ))}
          </List>
        )}
      </Card>
      <Text>
        <Link href="/beheer">Terug naar het beheer</Link>
      </Text>
    </Page.Main>
  )
}

/** The name of a match, as the link to it says it: the round, then the two clubs. */
function matchTitle(match: { competition: string; home: boolean; opponent: string; round: string }) {
  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`

  return `${match.competition === 'Eredivisie' ? match.round : `${match.competition}, ${match.round}`}: ${clubs}`
}
