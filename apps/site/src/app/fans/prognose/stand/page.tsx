import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Button, Card, Field, Form, Heading, Page, SeasonPicker, Select, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { logInPaths } from '#src/fans/log-in'
import {
  matchRanking,
  type RankedMatch,
  rankedMatches,
  rankedSeasons,
  seasonRanking,
} from '#src/fans/prediction-ranking'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageAreas } from '#src/page-areas'
import { seasonChoices, seasonFromSlug, seasonSlug } from '#src/seasons'
import { SwitchLinks } from '#src/SwitchLinks'

import { standPath, StandTable } from '../StandCards'

const areas = pageAreas({ main: ['stand'] })

// Render on each request: the session is not known at build time, and the page is not indexed.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('prognose', notFound)

  return { robots: { follow: false, index: false }, title: 'Stand Prognose' }
}

/** A match as the list says it: the clubs with the result. */
const matchText = (match: RankedMatch) => `${match.home} – ${match.away} ${match.homeGoals}–${match.awayGoals}`

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * The page "Stand Prognose": the ranking of the game, per season or per match, chosen with a
 * plain form so it works without script and can be shared as an address (`?seizoen=2026-27`,
 * `?wedstrijd=12`). A season or match that has no predictions, or that is made up, shows one
 * line. A blocked account goes to the page that says so.
 */
export default async function StandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('prognose', notFound)

  const supporter = await currentSupporter()

  if (supporter !== undefined && supporter.disabledAt !== null) {
    redirect(logInPaths.blocked)
  }

  const query = await searchParams
  const supporterId = supporter?.id
  const [seasons, playedMatches] = await Promise.all([rankedSeasons(), rankedMatches()])
  const matchParam = first(query['wedstrijd'])
  const seasonParam = first(query['seizoen'])
  const perMatch = matchParam !== undefined
  const current = seasonOf(new Date())
  // A season that was asked for must have predictions: the cache keeps a key for each season.
  const asked = seasonParam === undefined ? undefined : seasonFromSlug(seasonParam.replace('/', '-'))
  const season =
    asked !== undefined && seasons.includes(asked) ? asked : seasons.includes(current) ? current : seasons[0]
  const match =
    playedMatches.find((item) => String(item.id) === matchParam) ?? (perMatch ? playedMatches[0] : undefined)
  const addresses = {
    match: playedMatches[0] === undefined ? standPath : `${standPath}?wedstrijd=${playedMatches[0].id}`,
    season: standPath,
  }
  const ranking = perMatch
    ? match === undefined
      ? undefined
      : await matchRanking(match.id)
    : season === undefined
      ? undefined
      : await seasonRanking(season)
  const caption =
    perMatch && match !== undefined
      ? `Stand na ${matchText(match)}`
      : `Stand na ${ranking?.matchCount === 1 ? '1 wedstrijd' : `${ranking?.matchCount ?? 0} wedstrijden`}`

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Stand Prognose</Heading>
      </Page.Cell>
      <Page.Cell area="stand">
        <Card game="prognose">
          <SwitchLinks
            label="Weergave van de stand"
            options={[
              { href: addresses.season, label: 'Seizoen', value: 'season' },
              { href: addresses.match, label: 'Per wedstrijd', value: 'match' },
            ]}
            size="small"
            value={perMatch ? 'match' : 'season'}
          />
          {perMatch ? (
            <Form action={standPath} method="get">
              <Field id="stand-wedstrijd" label="Wedstrijd" required={false}>
                <Select defaultValue={match === undefined ? '' : String(match.id)} name="wedstrijd">
                  {playedMatches.map((item) => (
                    <Select.Option key={item.id} value={String(item.id)}>
                      {`${item.matchDate} · ${matchText(item)}`}
                    </Select.Option>
                  ))}
                </Select>
              </Field>
              <Button type="submit">Toon</Button>
            </Form>
          ) : (
            <SeasonPicker
              action={standPath}
              options={seasonChoices(seasons)}
              value={season === undefined ? '' : seasonSlug(season)}
            />
          )}
          {ranking === undefined || ranking.rows.length === 0 ? (
            <Text>
              {perMatch ? 'Voor deze wedstrijd is nog niets voorspeld.' : 'Dit seizoen is nog niets voorspeld.'}
            </Text>
          ) : (
            <StandTable caption={caption} ranking={ranking} supporterId={supporterId} />
          )}
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
