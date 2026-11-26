import type { StandingsCompetition } from '@fansite/db/schema'
import type { CSSProperties } from 'react'

import { BarChart, Card, DataTable, Heading, ShowAll, tableColumns, tableLegend, Text } from '@fansite/design-system'

import type { CompetitionChoice } from './competition'
import type { FinalPlace } from './matches'
import type { SeasonTally } from './seasonTally'

import { competitionWords } from './competition'
import { seasonBySeasonCard } from './matchShortcuts'
import { matchesPath } from './season-page'
import { seasonAddress } from './seasons'

/** The Eredivisie has 18 clubs, so the line always spans the whole table: 1 to 18. */
const clubsInTable = 18

/** The places that get a number at the side of the line, from the top. */
const tickPlaces = [1, 5, 10, 15, 18] as const

/**
 * The line of the chart. The chart grows upwards, and place 1 is the top, so a place is turned
 * into a height: place 1 is the highest (`max`) and place 18 the lowest of the Eredivisie. A
 * season without a row is a gap (`null`). A table with more clubs than 18 stretches the scale.
 * A season in another league than the Eredivisie goes in a band under the Eredivisie, after a
 * gap of one place, with its own places from the top: it is not read as a place in the
 * Eredivisie, and the line drops into it. Those seasons are `apart`, a dotted stretch of the
 * line, and the lowest place the band needs gets a number at the side (`below` places high).
 * `textOf` is the number at the side for a height, in the league the height is in.
 */
export function lineOf(places: readonly FinalPlace[]) {
  const outside = places.map(({ row }) => (row === undefined || row.competition === 'Eredivisie' ? null : row.position))
  const below = Math.max(0, ...outside.map((position) => position ?? 0))
  const gap = below === 0 ? 0 : 1
  const top = Math.max(clubsInTable, ...places.map(({ row }) => (row?.competition === 'Eredivisie' ? row.position : 0)))
  const max = below + gap + top
  const eredivisie = (position: number) => max + 1 - position
  const eerste = (position: number) => below + 1 - position

  return {
    apart: outside.map((position) => (position === null ? null : eerste(position))),
    below,
    max,
    textOf: (height: number) => String(height > below + gap ? max + 1 - height : below + 1 - height),
    ticks: [...tickPlaces.filter((place) => place <= top).map(eredivisie), ...(below === 0 ? [] : [eerste(below)])],
    values: places.map(({ row }) => (row?.competition === 'Eredivisie' ? eredivisie(row.position) : null)),
  }
}

/** Seasons as a sentence says them: `1991/92 en 1992/93`, or `1991/92, 1992/93 en 1993/94`. */
const seasonsText = (seasons: readonly string[]) =>
  seasons.length < 2 ? (seasons[0] ?? '') : `${seasons.slice(0, -1).join(', ')} en ${seasons.at(-1)}`

/** A place as a table says it: `3`, or `3 (Eerste divisie)` outside the Eredivisie. */
export const placeInLeague = (position: number, competition: StandingsCompetition) =>
  competition === 'Eredivisie' ? String(position) : `${position} (${competition})`

/** `lineOf` for places as plain numbers: `null` is a gap. The card per round uses it too. */
export function lineOfPositions(positions: readonly (null | number)[]) {
  const max = Math.max(clubsInTable, ...positions.map((position) => position ?? 0))

  return {
    max,
    ticks: tickPlaces.filter((place) => place <= max).map((place) => max + 1 - place),
    values: positions.map((position) => (position === null ? null : max + 1 - position)),
  }
}

/** The label of a season on the axis: `10/11` for `2010/11`. */
const shortSeason = (season: string) => season.slice(2)

/** How many of the latest seasons the table shows before the button. */
const shownSeasons = 5

const figureColumns = [tableColumns.won, tableColumns.drawn, tableColumns.lost, tableColumns.goals] as const
const columns = ['Seizoen', 'Plek', ...figureColumns] as const
const legend = tableLegend([...figureColumns.slice(0, 3), { ...tableColumns.goals, note: 'voor–tegen' }])

/**
 * The card "Seizoen voor seizoen": every season we have matches of, the newest first, with our
 * place in the league we played in, the matches won, drawn and lost, and the goals for and
 * against. On top is our place through the years as a line, with place 1 at the top (hidden
 * from a screen reader, which has the table). The table shows the latest five seasons and a
 * button shows the rest; without JavaScript every season is there. A season is a link to its
 * matches. The season going on is marked "nu". The place is that of the league we played in
 * whatever the choice: the Eredivisie, and for a season in the Eerste divisie the table says
 * so ("3 (Eerste divisie)"), the chart shows it as a dotted stretch of the line in a band
 * under the 18, and a line under the table names those seasons. We know the place from the
 * first season with a table (`places`); a season without one has a dash and "geen stand" for a
 * screen reader, and a line says since when we know it. The figures follow the choice of
 * competition (`tallies`, see `seasonTalliesOf`). `seasons` are the seasons with matches, the
 * newest first. Without a season there is no card.
 */
export function SeasonBySeasonCard({
  choice,
  current,
  level = 2,
  places,
  seasons,
  tallies,
}: {
  choice: CompetitionChoice
  current: string
  level?: 2 | 3
  places: readonly FinalPlace[]
  seasons: readonly string[]
  tallies: ReadonlyMap<string, SeasonTally>
}) {
  if (seasons.length === 0) {
    return null
  }

  const first = places.at(0)
  const placeOf = new Map(places.map((place) => [place.season, place.row]))
  const rowOf = (season: string) => {
    const place = placeOf.get(season)
    const tally = tallies.get(season)

    return {
      cells: [
        place === undefined ? '–' : placeInLeague(place.position, place.competition),
        ...(tally === undefined
          ? ['–', '–', '–', '–']
          : [tally.won, tally.drawn, tally.lost, `${tally.goalsFor}–${tally.goalsAgainst}`]),
      ],
      header: season === current ? `${season} (nu)` : season,
      href: seasonAddress(matchesPath, season, current),
      ...(place === undefined ? { note: 'geen stand' } : {}),
    }
  }
  const caption = (what: string) =>
    `${what} van sc Heerenveen: de plek in de competitie waarin we speelden, de wedstrijden gewonnen, gelijk en verloren en de doelpunten voor en tegen${choice === 'all' ? '' : `, in ${competitionWords(choice)}`}`
  const { apart, below, max, textOf, ticks, values } = lineOf(places)
  const elsewhere = places.flatMap(({ row, season }) =>
    row === undefined || row.competition === 'Eredivisie' ? [] : [{ competition: row.competition, season }],
  )
  const deductions = places.flatMap(({ row, season }) =>
    row !== undefined && row.pointsDeducted > 0 ? [{ points: row.pointsDeducted, season }] : [],
  )
  const labels = places.map(({ row, season }) =>
    row === undefined
      ? null
      : `${season}: plek ${row.position}${row.competition === 'Eredivisie' ? '' : ` in de ${row.competition}`}, ${row.points} punten`,
  )

  return (
    <Card aria-labelledby={seasonBySeasonCard.id}>
      <Heading anchor id={seasonBySeasonCard.id} level={level}>
        {seasonBySeasonCard.name}
      </Heading>
      {first === undefined ? null : (
        <BarChart
          axis={{ labelOf: (slot) => shortSeason(places[slot]?.season ?? ''), title: 'Seizoen' }}
          bars={places.map(() => null)}
          max={max}
          // The band of the Eerste divisie under the Eredivisie needs more height.
          style={below === 0 ? {} : ({ '--hf-bar-chart-height': '9rem' } as CSSProperties)}
          ticks={ticks}
          tickText={textOf}
        >
          <BarChart.Trend apart={apart} labels={labels} values={values} />
        </BarChart>
      )}
      <ShowAll moreLabel={`Toon alle ${seasons.length} seizoenen`} shown={shownSeasons} total={seasons.length}>
        <DataTable
          caption={caption('De seizoenen')}
          columns={columns}
          legend={legend}
          rows={seasons.map(rowOf)}
          // The seasons stand in their order, the newest first.
          sortable={false}
        />
      </ShowAll>
      {deductions.map(({ points, season }) => (
        <Text
          appearance="meta"
          key={season}
        >{`${season}: ${points} ${points === 1 ? 'punt' : 'punten'} afgetrokken`}</Text>
      ))}
      {elsewhere.length === 0 ? null : (
        <Text appearance="meta">
          {`In ${seasonsText(elsewhere.map(({ season }) => season))} speelden we in de ${[...new Set(elsewhere.map(({ competition }) => competition))].join(' en de ')}. In de grafiek loopt de lijn dan gestippeld onder de 18, waar de plekken van die competitie staan.`}
        </Text>
      )}
      <Text appearance="meta">
        {`De plek is die in de competitie waarin we speelden, ongeacht de keuze van de competitie. ${first === undefined ? 'De plek kennen we nog niet.' : `We kennen de plek sinds ${first.season}.`}`}
      </Text>
    </Card>
  )
}
