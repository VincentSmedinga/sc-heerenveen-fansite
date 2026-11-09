import { BarChart, Card, DataTable, Disclosure, Heading, Text } from '@fansite/design-system'

import type { PlaceInRound } from './matches'

import { lineOfPositions } from './FinalPlacesCard'
import { placePerRoundShortcut as card } from './matchShortcuts'
import { EredivisieOnly } from './MatchViews'

/**
 * The highest and the lowest place of the season with the first round we were there, or
 * undefined without a round. A place we held for several rounds names the first of them.
 */
export function extremesOfPlaces(places: readonly (null | PlaceInRound)[]) {
  const known = places.filter((place): place is PlaceInRound => place !== null)
  const first = known[0]

  if (first === undefined) {
    return undefined
  }

  return {
    highest: known.reduce((best, place) => (place.position < best.position ? place : best), first),
    lowest: known.reduce((worst, place) => (place.position > worst.position ? place : worst), first),
  }
}

/** The tooltip text at each round: "Ronde 12: plek 4, 20 punten", `null` for an open round. */
export const labelsOf = (places: readonly (null | PlaceInRound)[]) =>
  places.map((place) =>
    place === null ? null : `Ronde ${place.round}: plek ${place.position}, ${place.points} punten`,
  )

/**
 * The card "Onze plek per speelronde": our place in the Eredivisie after each round of the
 * season, as a line with place 1 at the top and the rounds along the bottom. `places` has one
 * entry for each of the 34 rounds, `null` where a round is open (see `placePerRoundOf`): the
 * line has a gap there and stops after the last complete round. The line is hidden from a
 * screen reader. Under it a closed Disclosure holds a sentence with the highest and the lowest
 * place, and a table with the same numbers, the newest round first. A season without a line
 * has no card, so the page does not render this one (it is the caller's rule, see
 * `getPlacePerRound`).
 */
export function PlacePerRoundCard({ places }: { places: readonly (null | PlaceInRound)[] }) {
  const extremes = extremesOfPlaces(places)

  if (extremes === undefined) {
    return null
  }

  const { max, ticks, values } = lineOfPositions(places.map((place) => place?.position ?? null))
  const labels = labelsOf(places)
  const last = places.findLastIndex((place) => place !== null)
  const sentence =
    extremes.highest.position === extremes.lowest.position
      ? `Onze plek was na elke ronde ${extremes.highest.position}.`
      : `Onze hoogste plek was ${extremes.highest.position}, na ronde ${extremes.highest.round}, en onze laagste plek was ${extremes.lowest.position}, na ronde ${extremes.lowest.round}.`

  return (
    <Card aria-labelledby={card.id} surface="soft">
      <Heading anchor id={card.id} level={2}>
        {card.name}
      </Heading>
      <BarChart
        axis={{ title: 'Speelronde' }}
        bars={places.map(() => null)}
        max={max}
        ticks={ticks}
        tickText={(height) => String(max + 1 - height)}
      >
        <BarChart.Trend labels={labels} values={values} />
      </BarChart>
      <Disclosure summary="Plek per speelronde">
        <Text>{sentence}</Text>
        <DataTable
          caption="De plek van sc Heerenveen in de Eredivisie na elke speelronde, met punten"
          columns={['Ronde', 'Plek', 'Punten']}
          rows={places
            .slice(0, last + 1)
            .map((place, index) => ({
              cells: place === null ? ['–', '–'] : [String(place.position), String(place.points)],
              header: `Ronde ${index + 1}`,
              ...(place === null ? { note: 'nog niet alle wedstrijden gespeeld' } : {}),
            }))
            .reverse()}
        />
      </Disclosure>
      <EredivisieOnly />
    </Card>
  )
}
