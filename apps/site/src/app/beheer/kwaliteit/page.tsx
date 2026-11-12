import type { Metadata } from 'next'

import { readSeasonCoverage } from '@fansite/db/season-coverage'
import { Card, DataTable, Heading, Page, SegmentedLinks, Text } from '@fansite/design-system'

import { gapLegend, gapTableColumns, qualitySwitch } from '#src/app/beheer/kwaliteit/gap-table'
import { compact } from '#src/beheer/density'
import { countGapsBySeason, gapColumns, readMatchGaps, seasonTablePath } from '#src/beheer/quality-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// What we miss of each season since 1990/91, for an editor (issue 1163): one row for each
// season, the newest first, with a column for each part of a match. A number is how many
// matches of the season have a gap in that part, and leads to them. A switch leads to the
// table of the persons (issue 1165).
export default async function QualityPage() {
  await requireRole('owner', 'editor')

  const { db } = getDatabase()
  const coverage = (await readSeasonCoverage(db)).reverse()
  const matchGaps = await readMatchGaps(db)
  const gaps = countGapsBySeason(matchGaps)
  const withGaps = matchGaps.filter((match) => Object.keys(match.gaps).length > 0)
  const total = withGaps.reduce(
    (sum, match) => sum + Object.values(match.gaps).reduce((inMatch, gap) => inMatch + gap.total, 0),
    0,
  )

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Kwaliteit</Heading>
          <SegmentedLinks {...qualitySwitch('wedstrijden')} />
          <Text appearance="intro">
            {withGaps.length === 0
              ? 'Alle wedstrijden zijn compleet.'
              : `Nog ${plural(total, 'gat', 'gaten')} in ${plural(withGaps.length, 'wedstrijd', 'wedstrijden')} van de ${matchGaps.length}. Een getal in de tabel leidt naar de wedstrijden van dat seizoen met een gat in die kolom.`}
          </Text>
        </>
      }
      wide
    >
      <Card aria-labelledby="seizoenen-kop">
        <Heading id="seizoenen-kop" level={2}>
          Per seizoen
        </Heading>
        <Text appearance="meta">{gapLegend}</Text>
        <DataTable
          appearance="text"
          caption="Wedstrijden met een gat per seizoen en per deel, het nieuwste seizoen bovenaan"
          columns={gapTableColumns('Seizoen')}
          rows={coverage.map((row) => {
            const counts = gaps.get(row.season)
            const complete = counts === undefined || gapColumns.every(({ key }) => counts.columns[key] === 0)
            const matchCount = plural(counts?.matches ?? 0, 'wedstrijd', 'wedstrijden')

            return {
              cells: gapColumns.map(({ key, name }) => {
                const total = counts?.columns[key] ?? 0

                return total === 0 ? null : (
                  <DataTable.Mark
                    description={`${total === 1 ? 'wedstrijd' : 'wedstrijden'} met een gat in ${name} in ${row.season}`}
                    href={seasonTablePath(row.season, key)}
                    key={key}
                  >
                    {String(total)}
                  </DataTable.Mark>
                )
              }),
              header: row.season,
              href: seasonTablePath(row.season),
              secondary: complete ? `${matchCount}, alles compleet` : matchCount,
            }
          })}
        />
      </Card>
    </Page.Main>
  )
}
