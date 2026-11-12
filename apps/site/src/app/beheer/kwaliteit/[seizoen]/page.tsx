import type { Metadata } from 'next'

import { countWaitingFieldDifferences } from '@fansite/db/player-field-differences'
import { countWaitingStatDifferences } from '@fansite/db/player-stat-differences'
import { seasonOf } from '@fansite/db/season'
import { firstCoverageSeason, seasonsBetween } from '@fansite/db/season-coverage'
import { Card, DataTable, Heading, Link, Notice, Page, Strong, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { gapLegend, gapTableColumns, matchGapRow } from '#src/app/beheer/kwaliteit/gap-table'
import { listPath as playersListPath } from '#src/app/beheer/spelers/paths'
import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { fieldDifferencesPath, qualityPath, seasonHasPlayers, statDifferencesPath } from '#src/beheer/quality'
import { gapColumns, isGapColumn, readMatchGaps, seasonTablePath } from '#src/beheer/quality-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { seasonFromSlug } from '#src/seasons'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit van een seizoen' }

type Props = {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * The matches of one season that miss something (issue 1163), the oldest first, in a table for
 * each competition with a column for each part of a match. A sign in a cell leads to where the
 * gap is filled in. `kolom` keeps the matches with a gap in one column. An address that names
 * no season since 1990/91 says "niet gevonden".
 */
export default async function SeasonQualityPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const season = seasonFromSlug((await params).seizoen)
  const seasons = seasonsBetween(firstCoverageSeason, seasonOf(new Date()))

  if (season === undefined || !seasons.includes(season)) {
    notFound()
  }

  const { gedaan, kolom } = await searchParams
  const column = isGapColumn(kolom) ? kolom : undefined
  const { db } = getDatabase()
  const all = await readMatchGaps(db, season)
  const withGaps = all.filter((match) =>
    column === undefined ? Object.keys(match.gaps).length > 0 : match.gaps[column] !== undefined,
  )
  const competitions = [...new Set(withGaps.map((match) => match.competition))]
  const differing = (await countWaitingStatDifferences(db)).get(season) ?? 0
  const edited = (await countWaitingFieldDifferences(db)).get(season) ?? 0
  const withoutPlayers =
    withGaps.some((match) => match.gaps.doelpunten !== undefined && match.gaps.doelpunten.sign !== '?') &&
    !(await seasonHasPlayers(db, season))
  const index = seasons.indexOf(season)
  const earlier = seasons[index - 1]
  const later = seasons[index + 1]
  const back = seasonTablePath(season, column)
  const columnName = gapColumns.find(({ key }) => key === column)?.name

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={qualityPath} icon="arrow-left">
            Kwaliteit
          </Link>
        </Text>
        <Heading level={1}>{season}</Heading>
        <Text appearance="intro">
          {withGaps.length === 0
            ? `Alles compleet${columnName === undefined ? '' : ` in de kolom ${columnName}`}.`
            : `${plural(withGaps.length, 'wedstrijd', 'wedstrijden')} van de ${all.length} ${withGaps.length === 1 ? 'heeft' : 'hebben'} een gat${columnName === undefined ? '' : ` in de kolom ${columnName}`}.`}
        </Text>
        <Text>
          {earlier === undefined ? null : <Link href={seasonTablePath(earlier, column)}>Vorig seizoen</Link>}
          {earlier !== undefined && later !== undefined ? ' · ' : null}
          {later === undefined ? null : <Link href={seasonTablePath(later, column)}>Volgend seizoen</Link>}
          {column === undefined ? null : (
            <>
              {' · '}
              <Link href={seasonTablePath(season)}>Alle kolommen</Link>
            </>
          )}
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {gedaan === 'kolom-compleet' ? (
          <Notice>
            <Strong>Opgeslagen.</Strong> Er is geen andere wedstrijd van {season} met een gat in deze kolom.
          </Notice>
        ) : null}
        {differing + edited === 0 ? null : (
          <Text>
            {differing === 0 ? null : (
              <Link href={statDifferencesPath(season)}>
                {plural(differing, 'spelerscijfer verschilt', 'spelerscijfers verschillen')}
              </Link>
            )}
            {differing > 0 && edited > 0 ? ' · ' : null}
            {edited === 0 ? null : (
              <Link href={fieldDifferencesPath(season)}>
                {plural(edited, 'spelersgegeven verschilt', 'spelersgegevens verschillen')}
              </Link>
            )}
          </Text>
        )}
        {withoutPlayers ? (
          <Text>
            Het seizoen {season} heeft nog geen enkele speler, dus je kunt bij de doelpunten niemand kiezen. Voeg eerst
            de spelers toe: <Link href={playersListPath(season)}>naar de spelers van {season}</Link>.
          </Text>
        ) : null}
        {withGaps.length === 0 ? null : <Text appearance="meta">{gapLegend}</Text>}
        {competitions.map((competition) => {
          const rows = withGaps.filter((match) => match.competition === competition)
          const id = `competitie-${competition.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-')}`

          return (
            <Card aria-labelledby={id} key={competition}>
              <Heading id={id} level={2}>
                {competition}
              </Heading>
              <Text appearance="meta">{plural(rows.length, 'wedstrijd', 'wedstrijden')} met een gat</Text>
              <DataTable
                appearance="text"
                caption={`Wedstrijden van ${competition} in ${season} met een gat${columnName === undefined ? '' : ` in de kolom ${columnName}`}, de oudste bovenaan`}
                columns={gapTableColumns('Wedstrijd')}
                rows={rows.map((match) => matchGapRow(match, back))}
              />
            </Card>
          )
        })}
      </Page.Cell>
    </Page.Main>
  )
}
