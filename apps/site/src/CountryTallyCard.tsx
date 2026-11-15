import {
  Card,
  CountryName,
  countryName,
  DataTable,
  Heading,
  tableColumns,
  tableLegend,
  Text,
} from '@fansite/design-system'

import type { MatchLink } from './cijfers-search'
import type { CountryTally } from './countryTally'

import { rowLinkText } from './MatchSearchLink'
import { europeByCountryCard } from './matchShortcuts'

const numberFormat = new Intl.NumberFormat('nl-NL')

const figureColumns = [
  tableColumns.played,
  tableColumns.won,
  tableColumns.drawn,
  tableColumns.lost,
  { ...tableColumns.goals, note: 'voor–tegen' },
] as const
const columns = ['Land', ...figureColumns] as const
const legend = tableLegend(figureColumns)

/** The row that holds the matches against clubs of which we do not know the country. */
const unknown = 'Land onbekend'

/**
 * The card "Europa per land" of Cijfers for all seasons: a row for each country of the clubs we
 * played a European match against (see `countryTalliesOf`), with the flag and the country in
 * words, the matches, won, drawn and lost and the goals for and against, the same columns as
 * Per competitie. The countries with the most matches come first, and the matches against clubs
 * without a country are the last row, "Land onbekend". A row with a country links to the search
 * of matches with that country and Europa chosen (`matchLink`), unless the search finds no
 * match; "Land onbekend" never links, because the search cannot filter on it. Without a
 * European match there is no card.
 */
export function CountryTallyCard({
  level = 2,
  matchLink,
  tallies,
}: {
  level?: 2 | 3
  /** The link to the European matches against clubs of a country, with their number. */
  matchLink?: (country: string) => MatchLink | undefined
  tallies: readonly CountryTally[]
}) {
  if (tallies.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={europeByCountryCard.id} surface="soft">
      <Heading anchor id={europeByCountryCard.id} level={level}>
        {europeByCountryCard.name}
      </Heading>
      <DataTable
        caption="De Europese wedstrijden van sc Heerenveen per land van de tegenstander, met de wedstrijden gewonnen, gelijk en verloren en de doelpunten voor en tegen"
        columns={columns}
        rows={tallies.map(({ country, drawn, goalsAgainst, goalsFor, lost, played, won }) => {
          const name = country === null ? unknown : (countryName(country) ?? country)
          const link = country === null ? undefined : matchLink?.(country)

          return {
            cells: [numberFormat.format(played), won, drawn, lost, `${goalsFor}–${goalsAgainst}`],
            ...(country === null
              ? {}
              : {
                  display:
                    link === undefined ? (
                      <CountryName country={country} />
                    ) : (
                      rowLinkText(<CountryName country={country} />, link, `in Europa tegen clubs uit ${name}`)
                    ),
                }),
            header: name,
            ...(link === undefined ? {} : { href: link.href }),
          }
        })}
      />
      <Text appearance="meta">{legend}</Text>
      <Text appearance="meta">Het land van de club van de tegenstander, zoals die nu is.</Text>
    </Card>
  )
}
