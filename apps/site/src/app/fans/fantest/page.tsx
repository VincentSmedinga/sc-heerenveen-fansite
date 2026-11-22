import type { Metadata } from 'next'

import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import {
  archiveCredit,
  type ArchiveMonth,
  averageText,
  capital,
  fantestPath,
  loadArchive,
  monthPath,
  monthTitle,
} from '#src/fans/fantest'
import { pageMetadata } from '#src/metadata'
import { pageAreas } from '#src/page-areas'

const areas = pageAreas({ main: ['years'] })

// Render on each request: the setting of the Fantest is read when a request comes in, and the
// months come from the database, so the build knows neither.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('fantest', notFound)

  return pageMetadata(fantestPath, 'Fantest van toen')
}

/**
 * The archive of the Fantest (issue 1480): one card for each year, the newest first, with a
 * link for each month that has a quiz and, under it, how the fans of then did on average. The
 * page is the same for everyone and holds nothing personal. With the Fantest off it is "niet
 * gevonden".
 */
export default async function FantestPage() {
  requireFansPart('fantest', notFound)

  const years = byYear(await loadArchive(getDatabase().db))

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Fantest van toen</Heading>
        <Text appearance="intro">
          Van december 2001 tot oktober 2005 had de Fansite elke maand een Fantest: tien vragen over de club. Speel ze
          na. Je score bewaren we niet.
        </Text>
        <Text appearance="meta">{archiveCredit}</Text>
      </Page.Cell>
      <Page.Cell area="years">
        {years.map(({ months, year }) => (
          <Card aria-labelledby={`fantest-${year}`} key={year}>
            <Heading id={`fantest-${year}`} level={2}>
              {year}
            </Heading>
            <List>
              {months.map((month) => (
                <List.Item key={month.month}>
                  <Link href={monthPath(month.year, month.month)}>{capital(monthTitle(month.year, month.month))}</Link>
                  {month.averageTenths === undefined ? null : (
                    <Text appearance="meta">
                      Toen gemiddeld {averageText(month.averageTenths)} van {month.questions}
                    </Text>
                  )}
                </List.Item>
              ))}
            </List>
          </Card>
        ))}
      </Page.Cell>
    </Page.Main>
  )
}

/** The months by year: the newest first, in the years and in each year. */
function byYear(months: readonly ArchiveMonth[]) {
  const years = new Map<number, ArchiveMonth[]>()

  for (const month of months) {
    years.set(month.year, [...(years.get(month.year) ?? []), month])
  }

  return [...years]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({ months: list.sort((a, b) => b.month - a.month), year }))
}
