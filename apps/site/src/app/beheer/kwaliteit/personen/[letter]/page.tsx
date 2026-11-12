import type { Metadata } from 'next'

import { Card, DataTable, Heading, Link, Notice, Page, Strong, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'

import { personGapLegend, personGapRow, personGapTableColumns } from '#src/app/beheer/kwaliteit/gap-table'
import { compact } from '#src/beheer/density'
import { personFactsPath } from '#src/beheer/person-facts'
import {
  isPersonGapColumn,
  letterFromSlug,
  letterTablePath,
  namesQualityPath,
  personGapColumns,
  personQualityPath,
  readPersonGaps,
} from '#src/beheer/person-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit van een letter' }

type Props = {
  params: Promise<{ letter: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Every letter of the row of letters, and `#` for a name that starts with no letter. */
const allLetters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

/**
 * The persons of one letter that miss something (issue 1165), in the order of the list of all
 * players, in a table with a column for each fact. A `?` in a cell leads to the part of the
 * form of the person where the gap is filled in. `kolom` keeps the persons with a gap in one
 * column. An address that is no letter says "niet gevonden".
 */
export default async function LetterQualityPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const letter = letterFromSlug((await params).letter)

  if (letter === undefined) {
    notFound()
  }

  const { gedaan, kolom } = await searchParams
  const column = isPersonGapColumn(kolom) ? kolom : undefined
  const all = await readPersonGaps(getDatabase().db)
  const used = new Set(all.map((person) => person.letter))
  const inLetter = all.filter((person) => person.letter === letter)
  const withGaps = inLetter.filter((person) =>
    column === undefined ? Object.keys(person.gaps).length > 0 : person.gaps[column] === true,
  )
  const columnName = personGapColumns.find(({ key }) => key === column)?.name
  const shown = letter === '#' ? 'Overig' : letter
  const letters = [...allLetters, ...(used.has('#') ? ['#'] : [])]
  const back = letterTablePath(letter, column)

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Text>
            <Link href={personQualityPath} icon="arrow-left">
              Personen
            </Link>
          </Text>
          <Heading level={1}>{shown}</Heading>
          <Text appearance="intro">
            {withGaps.length === 0
              ? `Alles compleet${columnName === undefined ? '' : ` in de kolom ${columnName}`}.`
              : `${plural(withGaps.length, 'persoon', 'personen')} van de ${inLetter.length} ${withGaps.length === 1 ? 'heeft' : 'hebben'} een gat${columnName === undefined ? '' : ` in de kolom ${columnName}`}.`}
          </Text>
          <Text>
            {letters.map((candidate, index) => {
              const label = candidate === '#' ? 'Overig' : candidate

              return (
                <Fragment key={candidate}>
                  {index === 0 ? null : ' '}
                  {candidate === letter ? (
                    <Link aria-current="page" href={letterTablePath(candidate, column)}>
                      <Strong>{label}</Strong>
                    </Link>
                  ) : used.has(candidate) ? (
                    <Link href={letterTablePath(candidate, column)}>{label}</Link>
                  ) : (
                    label
                  )}
                </Fragment>
              )
            })}
          </Text>
          {column === undefined ? null : (
            <Text>
              <Link href={letterTablePath(letter)}>Alle kolommen</Link>
            </Text>
          )}
        </>
      }
      wide
    >
      {gedaan === 'kolom-compleet' ? (
        <Notice>
          <Strong>Opgeslagen.</Strong> Er is geen andere persoon bij {shown} met een gat in deze kolom.
        </Notice>
      ) : null}
      <Text>
        <Link href={personFactsPath}>Linie en land snel aanvullen</Link>
      </Text>
      {withGaps.length === 0 ? null : (
        <Card aria-labelledby="personen-kop">
          <Heading id="personen-kop" level={2}>
            {plural(withGaps.length, 'persoon', 'personen')} met een gat
          </Heading>
          <Text appearance="meta">{personGapLegend}</Text>
          <DataTable
            appearance="text"
            caption={`Personen bij ${shown} met een gat${columnName === undefined ? '' : ` in de kolom ${columnName}`}, op achternaam`}
            columns={personGapTableColumns('Persoon')}
            rows={withGaps.map((person) => personGapRow(person, back))}
          />
        </Card>
      )}
      <Text>
        <Link href={namesQualityPath}>Namen die op elkaar lijken en de lijst van Wikipedia</Link>
      </Text>
    </Page.Main>
  )
}
