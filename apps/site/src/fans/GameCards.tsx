import type { ReactNode } from 'react'

import {
  Card,
  type CardGame,
  CardLink,
  DataTable,
  type DataTableProps,
  type DataTableRow,
  Heading,
  Match,
  tableColumns,
  Text,
} from '@fansite/design-system'

import { matchMoment } from '#src/match-format'
import { reportAddress } from '#src/report-data'

// The cards that more than one game of Fans shows (issue 1660). Each game gives its own words,
// columns and links.

/** What the line of a match in a card of a game needs. */
export type GameMatch = {
  clubSlug: string
  competition: string
  dateText: null | string
  extraTime?: boolean
  goalsAgainst?: null | number
  goalsFor?: null | number
  home: boolean
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  round: string
  season: string
}

/** A row of a ranking, as far as the table needs it. */
export type StandRow = {
  place: number
  screenName: string
  /** `null` for an account that was closed. */
  supporterId: null | number
  total: number
}

const youNote = 'Jij'

/**
 * The match of a card, in the look of the lists: the day and the competition small above. With
 * `played` it shows the result and links to the report, and without it the match to come.
 */
export function MatchLine({ match, now, played = false }: { match: GameMatch; now: Date; played?: boolean }) {
  const shared = { competition: match.competition, home: match.home, opponent: match.opponent, round: match.round }

  return played ? (
    <Match
      {...shared}
      {...matchMoment({ ...match, status: 'played' }, now)}
      {...(match.extraTime === undefined ? {} : { extraTime: match.extraTime })}
      goalsAgainst={match.goalsAgainst ?? 0}
      goalsFor={match.goalsFor ?? 0}
      reportHref={reportAddress(match.season, match.matchDate, match.clubSlug)}
      status="played"
    />
  ) : (
    <Match {...shared} {...matchMoment({ ...match, status: 'scheduled' }, now)} status="scheduled" />
  )
}

/** The card for the time that there is no match to play for: one line. */
export function NoMatchCard({
  children,
  game,
  heading,
  id,
}: {
  children: ReactNode
  game: CardGame
  heading: string
  id: string
}) {
  return (
    <Card aria-labelledby={id} game={game}>
      <Heading id={id} level={2}>
        {heading}
      </Heading>
      <Text>{children}</Text>
    </Card>
  )
}

/**
 * The rows to show of a ranking: the first `limit`, and under them, set apart, the row `own` of
 * the supporter when it is not among them, with the real place. `figures` gives the cells of a
 * row, in the order of the columns.
 */
export function rankingRows<Row extends StandRow>({
  figures,
  limit,
  own,
  rows,
  supporterId,
}: {
  figures: (row: Row) => (number | string)[]
  limit: number
  own: Row | undefined
  rows: readonly Row[]
  supporterId: number | undefined
}): DataTableRow[] {
  const shown = rows.slice(0, limit)
  const below = own !== undefined && !shown.includes(own)
  const tableRow = (row: Row): DataTableRow => ({
    cells: figures(row),
    header: row.screenName,
    position: row.place,
    ...(row.supporterId === supporterId ? { aside: youNote, highlight: true } : {}),
  })

  return [
    ...shown.map(tableRow),
    ...(below ? [{ cells: figures(own).map(() => ''), gap: true, header: 'andere fans' }, tableRow(own)] : []),
  ]
}

/** The card "Punten": the scoring of the game, as the game gives it. */
export function ScoringCard({ children, game }: { children: ReactNode; game: CardGame }) {
  return (
    <Card aria-labelledby="punten-telling" game={game}>
      <Heading id="punten-telling" level={2}>
        Punten
      </Heading>
      {children}
    </Card>
  )
}

/**
 * The card "Stand" in the narrow column of the page of a game: the top of the season
 * with the points, or one line when there is no row to show, and the link to the whole ranking.
 */
export function StandCard({
  game,
  href,
  rows,
  season,
}: {
  game: CardGame
  href: string
  rows: readonly DataTableRow[]
  season: string
}) {
  return (
    <Card aria-labelledby="stand-kop" game={game}>
      <Heading id="stand-kop" level={2}>
        Stand
      </Heading>
      {rows.length === 0 ? (
        <Text>Nog geen stand dit seizoen.</Text>
      ) : (
        <DataTable
          caption={`Stand ${season}`}
          columns={['Fan', { ...tableColumns.points, key: true }]}
          rows={rows}
          sortable={false}
        />
      )}
      <CardLink href={href}>Hele stand</CardLink>
    </Card>
  )
}

/** The table of a whole ranking: "Fan", the columns of the game, and under it its link. */
export function StandTable({
  caption,
  children,
  columns,
  legend,
  rows,
}: {
  caption: string
  /** What stands under the table, such as the link to the rules. */
  children: ReactNode
  columns: DataTableProps['columns']
  legend: ReactNode
  rows: readonly DataTableRow[]
}) {
  return (
    <>
      <DataTable caption={caption} columns={['Fan', ...columns]} legend={legend} rows={rows} sortable={false} />
      {children}
    </>
  )
}
