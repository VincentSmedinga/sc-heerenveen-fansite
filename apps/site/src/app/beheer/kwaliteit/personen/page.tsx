import type { Metadata } from 'next'

import { Card, DataTable, Heading, Link, Page, SegmentedLinks, Text } from '@fansite/design-system'
import { redirect } from 'next/navigation'

import { personGapLegend, personGapTableColumns, qualitySwitch } from '#src/app/beheer/kwaliteit/gap-table'
import { compact } from '#src/beheer/density'
import { personFactsPath } from '#src/beheer/person-facts'
import {
  countPersonGapsByLetter,
  letterTablePath,
  namesQualityPath,
  personGapColumns,
  readPersonGaps,
} from '#src/beheer/person-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit van de personen' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * What we miss of the persons in our squads, for an editor (issue 1165): one row for each
 * letter, with a column for each fact. A number is how many persons of the letter have a gap
 * in that column, and leads to them. The quick list of the line and the country that stood
 * here moved to `snel`, and an old address of it goes there.
 */
export default async function PersonQualityPage({ searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { deel, lijst } = await searchParams

  if (lijst !== undefined || deel !== undefined) {
    const query = new URLSearchParams({
      ...(typeof lijst === 'string' ? { lijst } : {}),
      ...(typeof deel === 'string' ? { deel } : {}),
    })

    redirect(query.size === 0 ? personFactsPath : `${personFactsPath}?${query}`)
  }

  const all = await readPersonGaps(getDatabase().db)
  const counts = countPersonGapsByLetter(all)
  const withGaps = all.filter((person) => Object.keys(person.gaps).length > 0)
  const total = withGaps.reduce((sum, person) => sum + Object.keys(person.gaps).length, 0)

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Kwaliteit</Heading>
          <SegmentedLinks {...qualitySwitch('personen')} />
          <Text appearance="intro">
            {withGaps.length === 0
              ? 'Alle personen zijn compleet.'
              : `Nog ${plural(total, 'gat', 'gaten')} bij ${plural(withGaps.length, 'persoon', 'personen')} van de ${all.length}. Een getal in de tabel leidt naar de personen van die letter met een gat in die kolom.`}
          </Text>
        </>
      }
      wide
    >
      <Text>
        <Link href={personFactsPath}>Linie en land snel aanvullen</Link>
      </Text>
      <Card aria-labelledby="letters-kop">
        <Heading id="letters-kop" level={2}>
          Per letter
        </Heading>
        <Text appearance="meta">{personGapLegend}</Text>
        <DataTable
          appearance="text"
          caption="Personen met een gat per letter van de achternaam en per gegeven"
          columns={personGapTableColumns('Letter')}
          rows={[...counts].map(([letter, count]) => {
            const complete = personGapColumns.every(({ key }) => count.columns[key] === 0)
            const persons = plural(count.persons, 'persoon', 'personen')
            const shown = letter === '#' ? 'Overig' : letter

            return {
              cells: personGapColumns.map(({ key, name }) => {
                const gaps = count.columns[key]

                return gaps === 0 ? null : (
                  <DataTable.Mark
                    description={`${gaps === 1 ? 'persoon' : 'personen'} met een gat in ${name} bij de letter ${shown}`}
                    href={letterTablePath(letter, key)}
                    key={key}
                  >
                    {String(gaps)}
                  </DataTable.Mark>
                )
              }),
              header: shown,
              href: letterTablePath(letter),
              secondary: complete ? `${persons}, alles compleet` : persons,
            }
          })}
        />
      </Card>
      <Text>
        <Link href={namesQualityPath}>Namen die op elkaar lijken en de lijst van Wikipedia</Link>
      </Text>
    </Page.Main>
  )
}
