import { BarChart, Card, DataTable, Disclosure, Heading, List, Strong, Text } from '@fansite/design-system'

import type { PlaceInRound } from './matches'

import { lineOfPositions } from './FinalPlacesCard'
import { placePerRoundShortcut as card } from './matchShortcuts'
import { EredivisieOnly } from './MatchViews'
import { placeLines } from './placeHistory'

/** The rounds that get a stroke and a number under the line. */
const markedRounds = [5, 10, 15, 20, 25, 30]

/** The tooltip at each round: "Ronde 12: plek 4", the place heavy; `null` for an open round. */
export const labelsOf = (places: readonly (null | PlaceInRound)[]) =>
  places.map((place) =>
    place === null ? null : (
      <>
        Ronde {place.round}: <Strong>plek {place.position}</Strong>
      </>
    ),
  )

/**
 * The card "Verloop op de ranglijst": our place in the Eredivisie after each round of the
 * season, as a line with place 1 at the top and the rounds along the bottom, with a stroke and
 * a number at every fifth round. `places` has one entry for each of the 34 rounds, `null` where
 * a round is open (see `placePerRoundOf`): the line has a gap there and stops after the last
 * complete round. The line is hidden from a screen reader. Above a closed Disclosure is a list
 * with the highest and the lowest place and the total shift (see `placeLines`); the Disclosure
 * holds a table with the same numbers, the newest round first. A season without a line has no
 * card, so the page does not render this one (it is the caller's rule, see `getPlacePerRound`).
 */
export function PlacePerRoundCard({ places }: { places: readonly (null | PlaceInRound)[] }) {
  const lines = placeLines(places)

  if (lines.length === 0) {
    return null
  }

  const { max, ticks, values } = lineOfPositions(places.map((place) => place?.position ?? null))
  const last = places.findLastIndex((place) => place !== null)

  return (
    <Card aria-labelledby={card.id} surface="soft">
      <Heading anchor id={card.id} level={2}>
        {card.name}
      </Heading>
      <BarChart
        axis={{
          labels: markedRounds.map((round) => ({ at: round - 0.5, text: String(round) })),
          marks: true,
          title: 'Speelronde',
        }}
        bars={places.map(() => null)}
        max={max}
        ticks={ticks}
        tickText={(height) => String(max + 1 - height)}
      >
        <BarChart.Trend labels={labelsOf(places)} values={values} />
      </BarChart>
      <List>
        {lines.map((line) => (
          <List.Item key={line}>{line}</List.Item>
        ))}
      </List>
      <Disclosure summary="Plek per speelronde">
        <DataTable
          caption="Plek en punten van sc Heerenveen in de Eredivisie na elke speelronde"
          columns={['Ronde', { abbreviation: '#', key: true, name: 'plek' }, { abbreviation: 'P', name: 'punten' }]}
          rows={places
            .slice(0, last + 1)
            .map((place, index) => ({
              cells: place === null ? ['–', '–'] : [String(place.position), String(place.points)],
              display: (
                <Text appearance="meta" as="span">
                  {index + 1}
                </Text>
              ),
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
