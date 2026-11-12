import type { DataTableTextColumn, DataTableTextRow } from '@fansite/design-system'

import { DataTable } from '@fansite/design-system'

import { personPartPath } from '#src/app/beheer/personen/paths'
import { matchPartPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import {
  personColumnParts,
  type PersonGapColumn,
  personGapColumns,
  type PersonGaps,
  personQualityPath,
} from '#src/beheer/person-table'
import { qualityPath } from '#src/beheer/quality'
import {
  columnParts,
  type Gap,
  type GapColumn,
  gapColumns,
  isFormColumn,
  type MatchGaps,
} from '#src/beheer/quality-table'

// The pieces of the tables of the page Kwaliteit (issue 1163): the columns with a letter for a
// phone, the line that explains the letters and the signs, and a row for a match, and the same
// for a person (issue 1165).

/** The columns of a table of persons, after the column of the row headers. */
export function personGapTableColumns(first: string): (DataTableTextColumn | string)[] {
  return [first, ...personGapColumns.map(({ letter, name }) => ({ abbreviation: letter, mark: true, name }))]
}

/** The switch between the tables of the matches and of the persons, at the top of both. */
export function qualitySwitch(value: 'personen' | 'wedstrijden') {
  return {
    label: 'Welke gegevens',
    options: [
      { href: qualityPath, label: 'Wedstrijden', value: 'wedstrijden' },
      { href: personQualityPath, label: 'Personen', value: 'personen' },
    ],
    value,
  }
}

/** The line above a table of persons that explains the letters of the headers and the sign. */
export const personGapLegend = `${personGapColumns.map(({ letter, name }) => `${letter} ${name}`).join(', ')}. ?: ontbreekt. Leeg: compleet.`

/** What a gap of a person says after his name for a screen reader, by column. */
const personGapWords: Record<PersonGapColumn, string> = {
  geboren: 'geboortedatum ontbreekt',
  land: 'land ontbreekt',
  linie: 'linie ontbreekt',
  naam: 'voornaam ontbreekt',
  wikipedia: 'Wikipedia-pagina ontbreekt',
}

/** The columns of a table of gaps, after the column of the row headers. */
export function gapTableColumns(first: string): (DataTableTextColumn | string)[] {
  return [first, ...gapColumns.map(({ letter, name }) => ({ abbreviation: letter, mark: true, name }))]
}

/**
 * The row of a person: his name as the row header, his years in our squad under it, and a `?`
 * for each gap that leads to the part of his form where it is filled in, with the column, so
 * "Opslaan en volgende" goes on in it. `back` is the table to come back to.
 */
export function personGapRow(person: PersonGaps, back: string): DataTableTextRow {
  return {
    cells: personGapColumns.map(({ key }) =>
      person.gaps[key] === true ? (
        <DataTable.Mark
          description={`${personGapWords[key]} bij ${person.name}`}
          href={personPartPath(person.id, personColumnParts[key], { back, column: key })}
          key={key}
        >
          ?
        </DataTable.Mark>
      ) : null,
    ),
    header: person.name,
    secondary: person.years,
  }
}

/** The line above a table that explains the letters of the headers and the signs. */
export const gapLegend = `${gapColumns.map(({ letter, name }) => `${letter} ${name}`).join(', ')}. Een getal: zoveel ontbreekt. ?: ontbreekt. …: niet af. Leeg: compleet.`

const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const longDayFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

/** The day of a match, short and without a point: `14 aug`. */
export const shortDayOf = (matchDate: string) => dayFormat.format(new Date(`${matchDate}T12:00:00Z`)).replace('.', '')

/** The day of a match in full: `14 augustus 2005`. */
export const longDayOf = (matchDate: string) => longDayFormat.format(new Date(`${matchDate}T12:00:00Z`))

/**
 * The row of a match: the day as the row header, the opponent with (t) or (u) under it, and a
 * sign for each gap that leads to where it is filled in. `back` is the table to come back to.
 */
export function matchGapRow(match: MatchGaps, back: string): DataTableTextRow {
  const opponent = `${match.opponent} (${match.home ? 't' : 'u'})`
  const where = `${opponent}, ${longDayOf(match.matchDate)}`

  return {
    cells: gapColumns.map(({ key }) => {
      const gap = match.gaps[key]

      return gap === undefined ? null : (
        <DataTable.Mark description={`${gapWords(key, gap)} bij ${where}`} href={gapPath(match, key, back)} key={key}>
          {gap.sign}
        </DataTable.Mark>
      )
    }),
    // Unique within a season: sc Heerenveen plays at most once a day.
    header: shortDayOf(match.matchDate),
    secondary: opponent,
  }
}

/** Where a gap of a match is filled in: the part of the form, or the report. */
function gapPath(match: MatchGaps, column: GapColumn, back: string) {
  if (column === 'opstelling' || column === 'verslag') {
    return reportPath(match.id)
  }
  if (column === 'wacht') {
    return matchPartPath(match.id, 'wijzigingen', { back })
  }

  return matchPartPath(match.id, columnParts[column], {
    back,
    column: isFormColumn(column) ? column : undefined,
  })
}

/** What a gap says after its sign, for a screen reader: "doelpunten zonder speler". */
function gapWords(column: GapColumn, gap: Gap) {
  const many = gap.total !== 1

  switch (column) {
    case 'aftrap':
      return 'tijd van de aftrap ontbreekt'
    case 'doelpunten':
      return gap.sign === '?' ? 'doelpunten ontbreken' : `${many ? 'doelpunten' : 'doelpunt'} zonder speler`
    case 'gegevens':
      return many ? 'gegevens ontbreken' : 'gegeven ontbreekt'
    case 'opstelling':
      return 'opstelling ontbreekt'
    case 'uitslag':
      return 'uitslag ontbreekt'
    case 'verslag':
      return gap.sign === '…' ? 'verslag niet af' : 'verslag ontbreekt'
    case 'wacht':
      return many ? 'wijzigingen wachten' : 'wijziging wacht'
  }
}
