import { Card, DataTable, Heading, type TableColumn, tableColumns, tableLegend } from '@fansite/design-system'
import { Fragment } from 'react'

import type { PlayerSeason } from './player-seasons'

import { type CompetitionChoice, competitionWords } from './competition'
import { nextSeason } from './player-page'

/** The figures a column can show, each a field of `PlayerSeason`. */
type FigureId = 'assists' | 'cleanSheets' | 'conceded' | 'goals' | 'minutes' | 'played' | 'red' | 'started' | 'yellow'

/** The columns of a goalkeeper: matches, minutes, clean sheets, goals against and the cards. */
const goalkeeperColumns: readonly FigureId[] = ['played', 'minutes', 'cleanSheets', 'conceded', 'yellow', 'red']

/** The columns of everyone else: matches, line-ups, minutes, goals, assists and the cards. */
const fieldColumns: readonly FigureId[] = ['played', 'started', 'minutes', 'goals', 'assists', 'yellow', 'red']

/**
 * The columns that go behind the button "Toon meer" on a phone, where seven do not fit (#1624):
 * the cards, and for a goalkeeper only the red ones, so that he keeps five columns of figures.
 */
const moreColumns = (goalkeeper: boolean): readonly FigureId[] => (goalkeeper ? ['red'] : ['yellow', 'red'])

/** The id of the card, for the heading that names it. */
export const playerSeasonsCardId = 'per-seizoen'

/** What a screen reader reads for the row between two spells, in place of the sign. */
const gapHeader = 'niet bij sc Heerenveen'

/** The line under the table when a season has a dash for the minutes (#1674). */
const minutesNote = 'Minuten tellen alleen in een seizoen met een opstelling bij elke wedstrijd.'

/** The dash a figure that we do not have shows: a figure we do not have is never a nought. */
const dash = '–'

/** What the table shows for a player: the columns, the rows and the sentences under it. */
export type PlayerSeasonsTable = {
  /** The icons and words of the columns, in order. */
  columns: (TableColumn & { id: FigureId })[]
  /** Whether a column adds up every season: the total is then complete. */
  complete: Record<FigureId, boolean>
  /** The seasons, the newest first, and the total. A figure we do not have is a dash. */
  rows: {
    cells: (number | string)[]
    gap?: true
    header: string
    season?: string
    shirtNumber?: number
  }[]
}

/**
 * The columns by the line of the player, without the column that has no figure in any season,
 * and a row for each season, the newest first, and a row Totaal. The total adds up the seasons
 * that have a figure; `complete` says for each column whether that is every season. The column
 * of the minutes stands with the others, also when no season has them, and its total is then a
 * dash.
 */
export function playerSeasonsTable(seasons: readonly PlayerSeason[], goalkeeper: boolean): PlayerSeasonsTable {
  const wanted = goalkeeper ? goalkeeperColumns : fieldColumns
  const known = (id: FigureId) => seasons.some((season) => season[id] !== undefined)
  const others = wanted.some((id) => id !== 'minutes' && known(id))
  const ids = wanted.filter((id) => known(id) || (id === 'minutes' && others))
  const more = moreColumns(goalkeeper)
  const totals = (id: FigureId) => (known(id) ? seasons.reduce((total, season) => total + (season[id] ?? 0), 0) : dash)

  return {
    columns: ids.map((id) => ({ ...tableColumns[id], id, ...(more.includes(id) ? { more: true } : {}) })),
    complete: Object.fromEntries(
      wanted.map((id) => [id, seasons.every((season) => season[id] !== undefined)]),
    ) as Record<FigureId, boolean>,
    rows: [
      ...seasons.flatMap((season, index) => {
        const older = seasons[index + 1]
        const row = {
          cells: ids.map((id) => season[id] ?? dash),
          header: season.season,
          season: season.season,
          ...(season.shirtNumber === undefined ? {} : { shirtNumber: season.shirtNumber }),
        }

        // A season that does not follow the one before it (they run newest first): he was away.
        return older !== undefined && nextSeason(older.season) !== season.season
          ? [row, { cells: [], gap: true as const, header: gapHeader }]
          : [row]
      }),
      { cells: ids.map((id) => totals(id)), header: 'Totaal' },
    ],
  }
}

/**
 * Seasons as ranges in Dutch: "2001/02 t/m 2003/04, 2005/06". A run of two or more seasons in a
 * row is one range, so a gap is a short phrase and not a sentence per season.
 */
const seasonRanges = (seasons: readonly string[]) => {
  const sorted = seasons.toSorted()
  const ranges: string[] = []

  for (let start = 0; start < sorted.length;) {
    let end = start

    while (end + 1 < sorted.length && nextSeason(sorted[end]!) === sorted[end + 1]) end += 1
    ranges.push(end === start ? sorted[start]! : `${sorted[start]} t/m ${sorted[end]}`)
    start = end + 1
  }

  return ranges.join(', ')
}

/**
 * The card "Per seizoen" of the page of a player (#1082): a table with a row for each season,
 * the newest first, and a row Totaal. The season is a link to its page Spelers, with the shirt
 * number under it. The columns follow his line (see `playerSeasonsTable`), and under the table
 * stand the icons with their words and the sentences that say what a dash and the total mean
 * (see `playerSeasonsNotes`).
 */
export function PlayerSeasonsCard({
  address,
  competition = 'all',
  goalkeeper,
  name,
  seasons,
}: {
  /** The address of the page Spelers of a season, such as `/spelers/2025-26`. */
  address: (season: string) => string
  /** The matches the table counts (#1103): all, or those of the league, the cup or Europe. */
  competition?: CompetitionChoice
  goalkeeper: boolean
  name: string
  seasons: readonly PlayerSeason[]
}) {
  const table = playerSeasonsTable(seasons, goalkeeper)

  if (seasons.length === 0 || table.columns.length === 0) {
    return null
  }

  // A table with no column behind the button gets no button: it would have nothing to show.
  const Columns = table.columns.some(({ more }) => more === true) ? DataTable.More : Fragment

  return (
    <Card aria-labelledby={playerSeasonsCardId}>
      <Heading id={playerSeasonsCardId} level={2}>
        Per seizoen
      </Heading>
      <Columns>
        <DataTable
          caption={`De cijfers van ${name} per seizoen bij sc Heerenveen, ${competition === 'all' ? '' : `alleen ${competitionWords(competition)}, `}het nieuwste seizoen eerst, met het totaal onderaan`}
          columns={[
            'Seizoen',
            ...table.columns.map(({ icon, more, name: word }) => ({
              icon,
              ...(more === true ? { more } : {}),
              name: word,
            })),
          ]}
          legend={
            <>
              {tableLegend(table.columns)}.{' '}
              {playerSeasonsNotes(seasons, table, goalkeeper, competition !== 'all').join(' ')}
            </>
          }
          rows={table.rows.map((row) => ({
            cells: row.cells,
            ...(row.gap === true ? { gap: true } : {}),
            header: row.header,
            ...(row.season === undefined ? (row.gap === true ? {} : { total: true }) : { href: address(row.season) }),
            ...(row.shirtNumber === undefined ? {} : { aside: `nr. ${row.shirtNumber}` }),
          }))}
          // The total stays at the bottom and a gap where it is, so the table does not sort.
          sortable={false}
        />
      </Columns>
    </Card>
  )
}

/**
 * The lines under the legend: what a dash means, one short line for each kind of gap in the
 * line-ups (some, none, the table of Wikipedia) with the seasons as ranges, and that the total
 * counts only the seasons with a figure.
 */
export function playerSeasonsNotes(
  seasons: readonly PlayerSeason[],
  table: PlayerSeasonsTable,
  goalkeeper: boolean,
  league = false,
): string[] {
  const notes: string[] = []
  const shown = table.columns.map(({ id }) => id)
  // A season with minutes has its line-ups, also when its reports are not all finished (#1674),
  // so its lines say where the minutes come from.
  const seasonsFrom = (source: PlayerSeason['source'], withMinutes: boolean) =>
    seasons.filter((season) => season.source === source && (season.minutes !== undefined) === withMinutes)
  // Under the Eredivisie a season of the Wikipedia table has dashes, for the reason below.
  const dashed = seasons.filter(
    (season) =>
      !(league && season.source === 'wikipedia') && shown.some((id) => id !== 'minutes' && season[id] === undefined),
  )

  if (goalkeeper) {
    notes.push('Nul en tegendoelpunten tellen alleen de wedstrijden die hij van begin tot eind speelde.')
  }
  if (dashed.length > 0) {
    notes.push(
      dashed.some((season) => season.minutes !== undefined)
        ? 'Een streepje: dat cijfer hebben we niet van dat seizoen.'
        : 'Een streepje: van dat seizoen hebben we geen opstellingen.',
    )
  }
  if (shown.includes('minutes') && seasons.some((season) => season.minutes === undefined)) {
    notes.push(minutesNote)
  }
  // One short line for each kind of gap, with the seasons as ranges.
  const some = seasons.filter((season) => season.source === 'some-lineups')

  if (some.length > 0) {
    const counted = ({ matchesInSeason, minutes, reportedMatches }: PlayerSeason) => {
      // With one competition chosen the minutes count its matches only, so not all of them.
      const all = league || minutes === undefined ? '' : `, de minuten uit alle ${matchesInSeason}`

      return `${reportedMatches} van ${matchesInSeason}${all}`
    }

    notes.push(`Opstellingen: ${some.map((season) => `${season.season} (${counted(season)})`).join(', ')}.`)
  }
  const wikipedia = league
    ? ['Geen cijfers per competitie', 'Per competitie alleen de doelpunten en de minuten']
    : ['Cijfers van Wikipedia', 'Cijfers van Wikipedia, de minuten uit onze opstellingen']
  // A season without a finished report and without a goal of his has a dash for the goals.
  const noneWithMinutes = seasonsFrom('none', true)
  const lines = [
    ['Alleen de doelpunten', seasonsFrom('none', false)],
    ['Alleen de doelpunten en de minuten', noneWithMinutes.filter((season) => season.goals !== undefined)],
    ['Alleen de minuten', noneWithMinutes.filter((season) => season.goals === undefined)],
    [wikipedia[0], seasonsFrom('wikipedia', false)],
    [wikipedia[1], seasonsFrom('wikipedia', true)],
  ] as const

  for (const [words, found] of lines) {
    if (found.length > 0) {
      notes.push(`${words}: ${seasonRanges(found.map(({ season }) => season))}.`)
    }
  }
  if (shown.some((id) => !table.complete[id])) {
    notes.push('Het totaal telt alleen de seizoenen met een cijfer.')
  }

  return notes
}
