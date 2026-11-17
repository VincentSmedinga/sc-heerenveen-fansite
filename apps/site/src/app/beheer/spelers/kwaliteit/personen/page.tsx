import type { Metadata } from 'next'

import { listPersonMarks } from '@fansite/db/unavailable-marks'
import { Card, DataTable, Heading, Link, Notice, Page, Strong, Text } from '@fansite/design-system'

import { personGapLegend, personGapTableColumns } from '#src/app/beheer/gap-table'
import { playersPath } from '#src/app/beheer/spelers/paths'
import { adminAreas } from '#src/beheer/areas'
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
import { usualSlotsPath } from '#src/beheer/usual-slots'
import { getDatabase } from '#src/database'

import { UnavailableCard } from './UnavailableCard'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit van de personen' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/** What the last button of the card Niet beschikbaar did, by the word in the address. */
const notices: Record<string, { text: string; title: string }> = {
  'markering-weg': { text: 'Deze markering was er al niet meer.', title: 'Niets veranderd.' },
  mislukt: { text: 'Er is niets veranderd. Probeer het nog eens.', title: 'Niet gelukt.' },
  vernieuwd: { text: 'De dag van de laatste controle is vandaag.', title: 'Nog steeds niet beschikbaar.' },
  weggehaald: { text: 'Het gat staat weer in de tabel, als het er nog is.', title: 'Markering weggehaald.' },
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * What we miss of the persons in our squads, for an editor (issue 1165): one row for each
 * letter, with a column for each fact. A number is how many persons of the letter have a gap
 * in that column, and leads to them. The quick list of the line and the country is at `snel`.
 */
export default async function PersonQualityPage({ searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { gedaan } = await searchParams
  const { db } = getDatabase()
  const all = await readPersonGaps(db)
  const marks = await listPersonMarks(db)
  const counts = countPersonGapsByLetter(all)
  const withGaps = all.filter((person) => Object.keys(person.gaps).length > 0)
  const total = withGaps.reduce((sum, person) => sum + Object.keys(person.gaps).length, 0)

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={playersPath} icon="arrow-left">
            Spelers
          </Link>
        </Text>
        <Heading level={1}>Kwaliteit van personen</Heading>
        <Text appearance="intro">
          {withGaps.length === 0
            ? 'Alle personen zijn compleet.'
            : `Nog ${plural(total, 'gat', 'gaten')} bij ${plural(withGaps.length, 'persoon', 'personen')} van de ${all.length}. Een getal in de tabel leidt naar de personen van die letter met een gat in die kolom.`}
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {typeof gedaan === 'string' && notices[gedaan] !== undefined ? (
          <Notice>
            <Strong>{notices[gedaan].title}</Strong> {notices[gedaan].text}
          </Notice>
        ) : null}
        <Text>
          <Link href={personFactsPath}>Linie en land snel aanvullen</Link>
        </Text>
        <Text>
          <Link href={usualSlotsPath}>Vaste plaatsen in een 4-3-3</Link>: waar spelers meestal stonden in hun rij.
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
        <UnavailableCard marks={marks} />
        <Text>
          <Link href={namesQualityPath}>Namen die op elkaar lijken en de lijst van Wikipedia</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
