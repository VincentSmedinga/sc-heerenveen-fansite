import type { Metadata } from 'next'

import { Button, Card, Field, Form, Heading, Input, Link, Page, Select, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { capital, fantestPath, fantestRankingPath, monthSlug, monthTitle } from '#src/fans/fantest'
import { currentMonth } from '#src/fans/fantest-entry'
import { monthScores, rankingOf } from '#src/fans/fantest-ranking'
import { logInPaths } from '#src/fans/log-in'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageAreas } from '#src/page-areas'

import { MonthTable, YearTable } from './RankingTable'

const areas = pageAreas({ back: true, main: ['year', 'month'] })

// Render on each request: the session is not known at build time, and the page is not indexed.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('fantest', notFound)

  return { robots: { follow: false, index: false }, title: 'Ranglijst Fantest' }
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * The page "Ranglijst Fantest" (issue 1483): the points of the closed months added up per
 * calendar year, and under it the scores of one closed month. Both are chosen with a plain
 * form, so it works without script and can be shared as an address (`?jaar=2027`,
 * `?jaar=2027&maand=2027-03`). The page shows the running year, and the latest closed month of
 * the year that is shown. A year or month that has no scores, or that is made up, counts as not
 * asked. Anybody may read it; a blocked account goes to the page that says so.
 */
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('fantest', notFound)

  const supporter = await currentSupporter()

  if (supporter !== undefined && supporter.disabledAt !== null) {
    redirect(logInPaths.blocked)
  }

  const [query, scores] = await Promise.all([searchParams, monthScores()])
  const running = currentMonth().year
  // The running year is always a choice, also in January, when no month of it is over.
  const years = [...new Set([running, ...scores.map((score) => score.year)])].sort((a, b) => b - a)
  const year = years.find((item) => String(item) === first(query['jaar'])) ?? running
  const ofYear = scores.filter((score) => score.year === year)
  const months = [...new Set(ofYear.map((score) => score.month))].sort((a, b) => b - a)
  const asked = first(query['maand'])
  const month = months.find((item) => monthSlug(year, item) === asked) ?? months[0]
  const quizCount = months.length === 1 ? '1 quiz' : `${months.length} quizzen`

  return (
    <Page.Main areas={areas}>
      <Page.Back>
        <Text>
          <Link href={fantestPath} icon="arrow-left">
            Fantest
          </Link>
        </Text>
      </Page.Back>
      <Page.Cell area="head">
        <Heading level={1}>Ranglijst Fantest</Heading>
        <Text appearance="intro">Een maand telt mee als hij voorbij is.</Text>
      </Page.Cell>
      <Page.Cell area="year">
        <Card aria-labelledby="ranglijst-jaar" game="fantest">
          <Heading id="ranglijst-jaar" level={2}>
            Stand {year}
          </Heading>
          {years.length > 1 ? (
            <Form action={fantestRankingPath} method="get">
              <Field hideOptional id="ranglijst-jaar-keuze" label="Jaar" required={false}>
                <Select defaultValue={String(year)} key={year} name="jaar">
                  {years.map((item) => (
                    <Select.Option key={item} value={String(item)}>
                      {String(item)}
                    </Select.Option>
                  ))}
                </Select>
              </Field>
              <Button type="submit">Toon jaar</Button>
            </Form>
          ) : null}
          {months.length === 0 ? (
            <Text>Van {year} is er nog niets te tonen.</Text>
          ) : (
            <YearTable
              caption={`Stand van ${year} na ${quizCount}`}
              rows={rankingOf(ofYear)}
              supporterId={supporter?.id}
            />
          )}
        </Card>
      </Page.Cell>
      {month === undefined ? null : (
        <Page.Cell area="month">
          <Card aria-labelledby="ranglijst-maand" game="fantest">
            <Heading id="ranglijst-maand" level={2}>
              Scores van {monthTitle(year, month)}
            </Heading>
            {months.length > 1 ? (
              <Form action={fantestRankingPath} method="get">
                <Input name="jaar" type="hidden" value={year} />
                <Field hideOptional id="ranglijst-maand-keuze" label="Maand" required={false}>
                  <Select defaultValue={monthSlug(year, month)} key={monthSlug(year, month)} name="maand">
                    {months.map((item) => (
                      <Select.Option key={item} value={monthSlug(year, item)}>
                        {capital(monthTitle(year, item))}
                      </Select.Option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit">Toon maand</Button>
              </Form>
            ) : null}
            <MonthTable
              caption={`Scores van ${monthTitle(year, month)}`}
              rows={rankingOf(ofYear.filter((score) => score.month === month))}
              supporterId={supporter?.id}
            />
          </Card>
        </Page.Cell>
      )}
    </Page.Main>
  )
}
