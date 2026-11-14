import { BarChart, Card, DataTable, Disclosure, Heading, signedNumber, Text } from '@fansite/design-system'

import type { FinalPlace } from './matches'

import { finalPlacesShortcut as finalPlacesCard } from './matchShortcuts'
import { EredivisieOnly } from './MatchViews'
import { matchesPath } from './season-page'
import { seasonAddress } from './seasons'

/** The Eredivisie has 18 clubs, so the line always spans the whole table: 1 to 18. */
const clubsInTable = 18

/** The places that get a number at the side of the line, from the top. */
const tickPlaces = [1, 5, 10, 15, 18] as const

/**
 * The line of the chart. The chart grows upwards, and place 1 is the top, so a place is turned
 * into a height: place 1 is the highest (`max`) and place 18 the lowest (1). A season without a
 * row is a gap (`null`). A table with more clubs than 18 stretches the scale.
 */
export function lineOf(places: readonly FinalPlace[]) {
  return lineOfPositions(places.map(({ row }) => row?.position ?? null))
}

/** `lineOf` for places as plain numbers: `null` is a gap. The card per round uses it too. */
export function lineOfPositions(positions: readonly (null | number)[]) {
  const max = Math.max(clubsInTable, ...positions.map((position) => position ?? 0))

  return {
    max,
    ticks: tickPlaces.filter((place) => place <= max).map((place) => max + 1 - place),
    values: positions.map((position) => (position === null ? null : max + 1 - position)),
  }
}

/** The text of a height on the axis: the place it stands for. */
const placeOfHeight = (max: number) => (height: number) => String(max + 1 - height)

/** The label of a season on the axis: `10/11` for `2010/11`. */
const shortSeason = (season: string) => season.slice(2)

/**
 * The card "Onze plek door de jaren": our place in the Eredivisie in every season we have a
 * table of, as a line with place 1 at the top, and under it the same numbers in a table, which
 * is what a screen reader gets because the line is hidden from it. It is on Cijfers (#411), and
 * since #1211 only on the page with all seasons. The table is in a closed Disclosure (#808). It
 * does not depend on the switch: `places` is the same for every choice. The season that is
 * going on is marked "nu", a season with points taken off says how many in the table, and a
 * season without a table is a gap in the line and a row that says so. A season links to its
 * page when it has one (`linkable` are the seasons that have matches). Without a table of any
 * season there is no card.
 */
export function FinalPlacesCard({
  current,
  level = 2,
  linkable,
  places,
}: {
  current: string
  level?: 2 | 3
  linkable: readonly string[]
  places: readonly FinalPlace[]
}) {
  const first = places.at(0)

  if (first === undefined) {
    return null
  }

  const { max, ticks, values } = lineOf(places)
  const deductions = places.flatMap(({ row, season }) =>
    row !== undefined && row.pointsDeducted > 0 ? [{ points: row.pointsDeducted, season }] : [],
  )
  const labels = places.map(({ row, season }) =>
    row === undefined ? null : `${season}: plek ${row.position}, ${row.points} punten`,
  )

  return (
    <Card aria-labelledby={finalPlacesCard.id} surface="soft">
      <Heading anchor id={finalPlacesCard.id} level={level}>
        {finalPlacesCard.name}
      </Heading>
      <BarChart
        axis={{ labelOf: (slot) => shortSeason(places[slot]?.season ?? ''), title: 'Seizoen' }}
        bars={places.map(() => null)}
        max={max}
        ticks={ticks}
        tickText={placeOfHeight(max)}
      >
        <BarChart.Trend labels={labels} values={values} />
      </BarChart>
      <Disclosure summary="Plek per seizoen">
        <DataTable
          caption="De plek van sc Heerenveen in de Eredivisie per seizoen, met punten en doelsaldo"
          columns={['Seizoen', 'Plek', 'Punten', { abbreviation: 'Saldo', name: 'Doelsaldo' }]}
          rows={[...places].reverse().map(({ now: going, row, season }) => ({
            cells:
              row === undefined
                ? ['–', '–', '–']
                : [String(row.position), String(row.points), signedNumber(row.goalDifference)],
            header: going ? `${season} (nu)` : season,
            ...(row === undefined ? { note: 'geen stand' } : {}),
            ...(linkable.includes(season) ? { href: seasonAddress(matchesPath, season, current) } : {}),
          }))}
        />
      </Disclosure>
      {deductions.map(({ points, season }) => (
        <Text
          appearance="meta"
          key={season}
        >{`${season}: ${points} ${points === 1 ? 'punt' : 'punten'} afgetrokken`}</Text>
      ))}
      <Text appearance="meta">{`Sinds ${first.season}`}</Text>
      <EredivisieOnly />
    </Card>
  )
}
