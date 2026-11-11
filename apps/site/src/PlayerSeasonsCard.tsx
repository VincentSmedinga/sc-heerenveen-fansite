import { Card, DataTable, Heading, tableColumns, tableLegend, Text } from '@fansite/design-system'

import type { CompetitionChoice } from './competition'
import type { PlayerSeason } from './player-seasons'

import { CompetitionLinks } from './CompetitionSwitch'
import { nextSeason } from './player-page'

/** The figures a column can show, each a field of `PlayerSeason`. */
type FigureId = 'assists' | 'cleanSheets' | 'conceded' | 'goals' | 'played' | 'started' | 'yellow'

/** The columns of a goalkeeper: matches, clean sheets, goals against and yellow cards. */
const goalkeeperColumns: readonly FigureId[] = ['played', 'cleanSheets', 'conceded', 'yellow']

/** The columns of everyone else: matches, line-ups, goals and assists. */
const fieldColumns: readonly FigureId[] = ['played', 'started', 'goals', 'assists']

/** The id of the card, for the heading that names it. */
export const playerSeasonsCardId = 'per-seizoen'

/** What a screen reader reads for the row between two spells, in place of the sign. */
const gapHeader = 'niet bij sc Heerenveen'

/** The dash a figure that we do not have shows: a figure we do not have is never a nought. */
const dash = '–'

/** What the table shows for a player: the columns, the rows and the sentences under it. */
export type PlayerSeasonsTable = {
  /** The letters and words of the columns, in order. */
  columns: { abbreviation: string; id: FigureId; name: string }[]
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
 * that have a figure; `complete` says for each column whether that is every season.
 */
export function playerSeasonsTable(seasons: readonly PlayerSeason[], goalkeeper: boolean): PlayerSeasonsTable {
  const wanted = goalkeeper ? goalkeeperColumns : fieldColumns
  const ids = wanted.filter((id) => seasons.some((season) => season[id] !== undefined))
  const totals = (id: FigureId) => seasons.reduce((total, season) => total + (season[id] ?? 0), 0)

  return {
    columns: ids.map((id) => ({ ...tableColumns[id], id })),
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

/** Seasons as words in Dutch: "2003/04", "2003/04 en 2004/05", "a, b en c". */
const seasonsText = (seasons: readonly string[]) =>
  seasons.length < 2 ? (seasons[0] ?? '') : `${seasons.slice(0, -1).join(', ')} en ${seasons.at(-1)}`

/**
 * The card "Per seizoen" of the page of a player (#1082): a table with a row for each season,
 * the newest first, and a row Totaal. The season is a link to its page Spelers, with the shirt
 * number under it. The columns follow his line (see `playerSeasonsTable`), and under the table
 * stand the letters with their words and the sentences that say what a dash and the total mean
 * (see `playerSeasonsNotes`).
 */
export function PlayerSeasonsCard({
  address,
  competition = 'all',
  goalkeeper,
  name,
  playerAddress,
  seasons,
}: {
  /** The address of the page Spelers of a season, such as `/spelers/2025-26`. */
  address: (season: string) => string
  /** The matches the table counts (#1103): all of them, or the Eredivisie alone. */
  competition?: CompetitionChoice
  goalkeeper: boolean
  name: string
  /** The address of his page, for the switch; without it there is nothing to choose. */
  playerAddress?: string | undefined
  seasons: readonly PlayerSeason[]
}) {
  const table = playerSeasonsTable(seasons, goalkeeper)

  if (seasons.length === 0 || table.columns.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={playerSeasonsCardId}>
      <Heading id={playerSeasonsCardId} level={2}>
        Per seizoen
      </Heading>
      {playerAddress === undefined ? null : <CompetitionLinks address={playerAddress} competition={competition} />}
      <DataTable
        caption={`De cijfers van ${name} per seizoen bij sc Heerenveen, ${competition === 'league' ? 'alleen de Eredivisie, ' : ''}het nieuwste seizoen eerst, met het totaal onderaan`}
        columns={['Seizoen', ...table.columns.map(({ abbreviation, name: word }) => ({ abbreviation, name: word }))]}
        rows={table.rows.map((row) => ({
          cells: row.cells,
          ...(row.gap === true ? { gap: true } : {}),
          header: row.header,
          ...(row.season === undefined ? (row.gap === true ? {} : { total: true }) : { href: address(row.season) }),
          ...(row.shirtNumber === undefined ? {} : { aside: `nr. ${row.shirtNumber}` }),
        }))}
      />
      <Text appearance="meta">
        {[
          `${tableLegend(table.columns)}.`,
          ...playerSeasonsNotes(seasons, table, goalkeeper, competition === 'league'),
        ].join(' ')}
      </Text>
    </Card>
  )
}

/**
 * The sentences under the legend: what a dash means, where the figures of a season come from
 * when that is not the line-ups, and that the total counts only the seasons with a figure.
 */
export function playerSeasonsNotes(
  seasons: readonly PlayerSeason[],
  table: PlayerSeasonsTable,
  goalkeeper: boolean,
  league = false,
): string[] {
  const notes: string[] = []
  const shown = table.columns.map(({ id }) => id)
  const wikipedia = seasons.filter((season) => season.source === 'wikipedia').map(({ season }) => season)
  // Under the Eredivisie a season of the Wikipedia table has dashes, for the reason below.
  const hasDash = seasons.some(
    (season) => !(league && season.source === 'wikipedia') && shown.some((id) => season[id] === undefined),
  )

  if (goalkeeper) {
    notes.push('Nul en tegendoelpunten tellen alleen de wedstrijden die hij van begin tot eind speelde.')
  }
  if (hasDash) {
    notes.push('Een streepje: van dat seizoen hebben we geen opstellingen.')
  }
  if (league && wikipedia.length > 0) {
    notes.push(`Voor ${seasonsText(wikipedia)} kennen we de cijfers niet per competitie.`)
  } else if (wikipedia.length > 0) {
    notes.push(
      `In ${seasonsText(wikipedia)} komen de cijfers uit de tabel van Wikipedia, die alleen de competities van die tabel telt.`,
    )
  }
  for (const season of seasons.filter((candidate) => candidate.source === 'some-lineups')) {
    notes.push(
      `Uit ${season.reportedMatches} van de ${season.matchesInSeason} wedstrijden van ${season.season} hebben we een opstelling.`,
    )
  }
  if (shown.some((id) => !table.complete[id])) {
    notes.push('Het totaal telt alleen de seizoenen met een cijfer.')
  }

  return notes
}
