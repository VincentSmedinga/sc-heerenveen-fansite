import { BarChart, Card, DataTable, Disclosure, Heading, tableColumns, tableLegend, Text } from '@fansite/design-system'

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

/** How many of the latest seasons the table shows before the Disclosure. */
const shownSeasons = 5

const figureColumns = [tableColumns.won, tableColumns.drawn, tableColumns.lost, tableColumns.goals] as const
const columns = ['Seizoen', 'Plek', ...figureColumns] as const
const legend = tableLegend([...figureColumns.slice(0, 3), { ...tableColumns.goals, note: 'voor–tegen' }])

/**
 * The card "Seizoen voor seizoen": every season we have matches of, the newest first, with our
 * place in the Eredivisie, the matches won, drawn and lost, and the goals for and against. On
 * top is our place through the years as a line, with place 1 at the top (hidden from a screen
 * reader, which has the table). The table shows the latest five seasons; a Disclosure, which
 * works without JavaScript, shows the rest. A season is a link to its matches. The season going
 * on is marked "nu". The place is that of the Eredivisie whatever the choice, and we know it
 * from the first season with a table (`places`); a season without one has a dash and "geen
 * stand" for a screen reader, and a line under the table says since when we know it. The
 * figures follow the choice of competition (`tallies`, see `seasonTalliesOf`). `seasons` are
 * the seasons with matches, the newest first. Without a season there is no card.
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
        place === undefined ? '–' : String(place.position),
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
    `${what} van sc Heerenveen: de plek in de Eredivisie, de wedstrijden gewonnen, gelijk en verloren en de doelpunten voor en tegen${choice === 'all' ? '' : `, in ${competitionWords(choice)}`}`
  const recent = seasons.slice(0, shownSeasons)
  const rest = seasons.slice(shownSeasons)
  const { max, ticks, values } = lineOf(places)
  const deductions = places.flatMap(({ row, season }) =>
    row !== undefined && row.pointsDeducted > 0 ? [{ points: row.pointsDeducted, season }] : [],
  )
  const labels = places.map(({ row, season }) =>
    row === undefined ? null : `${season}: plek ${row.position}, ${row.points} punten`,
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
          ticks={ticks}
          tickText={placeOfHeight(max)}
        >
          <BarChart.Trend labels={labels} values={values} />
        </BarChart>
      )}
      <DataTable caption={caption('De laatste seizoenen')} columns={columns} rows={recent.map(rowOf)} />
      {rest.length === 0 ? null : (
        <Disclosure summary={`Toon alle ${seasons.length} seizoenen`}>
          <DataTable caption={caption('De eerdere seizoenen')} columns={columns} rows={rest.map(rowOf)} />
        </Disclosure>
      )}
      <Text appearance="meta">{legend}</Text>
      {deductions.map(({ points, season }) => (
        <Text
          appearance="meta"
          key={season}
        >{`${season}: ${points} ${points === 1 ? 'punt' : 'punten'} afgetrokken`}</Text>
      ))}
      <Text appearance="meta">
        {`De plek is altijd die in de Eredivisie, ongeacht de keuze van de competitie. ${first === undefined ? 'De plek kennen we nog niet.' : `We kennen de plek sinds ${first.season}.`}`}
      </Text>
    </Card>
  )
}
