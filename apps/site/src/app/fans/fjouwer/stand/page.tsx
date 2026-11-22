import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Card, Heading, Page, SeasonPicker, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { rankedSeasons, seasonRanking } from '#src/fans/fjouwer-ranking'
import { logInPaths } from '#src/fans/log-in'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageAreas } from '#src/page-areas'
import { seasonChoices, seasonFromSlug, seasonSlug } from '#src/seasons'

import { standPath, StandTable } from '../StandCards'

const areas = pageAreas({ main: ['stand'] })

// Render on each request: the session is not known at build time, and the page is not indexed.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('vier', notFound)

  return { robots: { follow: false, index: false }, title: 'Stand Fjouwer' }
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * The page "Stand Fjouwer": the ranking of the game per season, chosen with a plain form so it
 * works without script and can be shared as an address (`?seizoen=2026-27`). A season without
 * points, or one that is made up, shows the season of now, or one line. A blocked account goes
 * to the page that says so.
 */
export default async function StandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('vier', notFound)

  const supporter = await currentSupporter()

  if (supporter !== undefined && supporter.disabledAt !== null) {
    redirect(logInPaths.blocked)
  }

  const seasons = await rankedSeasons()
  const seasonParam = first((await searchParams)['seizoen'])
  const current = seasonOf(new Date())
  // A season that was asked for must have points: the cache keeps a key for each season.
  const asked = seasonParam === undefined ? undefined : seasonFromSlug(seasonParam.replace('/', '-'))
  const season =
    asked !== undefined && seasons.includes(asked) ? asked : seasons.includes(current) ? current : seasons[0]
  const ranking = season === undefined ? undefined : await seasonRanking(season)

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Stand Fjouwer</Heading>
      </Page.Cell>
      <Page.Cell area="stand">
        <Card game="fjouwer">
          {seasons.length > 1 ? (
            <SeasonPicker
              action={standPath}
              options={seasonChoices(seasons)}
              value={season === undefined ? '' : seasonSlug(season)}
            />
          ) : null}
          {ranking === undefined || (ranking.rows.length === 0 && ranking.hidden.size === 0) ? (
            <Text>Dit seizoen is er nog niets te tonen.</Text>
          ) : (
            <StandTable ranking={ranking} supporterId={supporter?.id} />
          )}
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
