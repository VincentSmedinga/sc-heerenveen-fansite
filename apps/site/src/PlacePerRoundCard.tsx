import type { PublicMatch, PublicStaff } from '@fansite/db/queries'

import { BarChart, Card, DataTable, Disclosure, Heading, List, PlayerName, Strong, Text } from '@fansite/design-system'

import type { PlaceInRound } from './matches'

import { lineOfPositions } from './FinalPlacesCard'
import { placePerRoundShortcut as card } from './matchShortcuts'
import { EredivisieOnly } from './MatchViews'
import { axisTicks, coachLines, coachText, placeLines } from './placeHistory'
import { splitPersonName } from './player-name'

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
 * a number at the ticks of `axisTicks`; a dashed line marks where a new head coach begins.
 * `places` has one entry for each of the 34 rounds, `null` where a round is open (see
 * `placePerRoundOf`): the line has a gap there and stops after the last complete round. The
 * line is hidden from a screen reader. Above a closed Disclosure is a list with the highest and
 * the lowest place and the total shift (see `placeLines`), and a line for each head coach with
 * the rounds and the places (see `coachLines`); the Disclosure holds a table with the same
 * numbers, the newest round first. A season without a line has no card, so the page does not
 * render this one (it is the caller's rule, see `getPlacePerRound`).
 */
export function PlacePerRoundCard({
  coaches = [],
  matches = [],
  places,
}: {
  coaches?: readonly PublicStaff[]
  matches?: readonly Pick<PublicMatch, 'competition' | 'matchDate' | 'round'>[]
  places: readonly (null | PlaceInRound)[]
}) {
  const lines = placeLines(places)

  if (lines.length === 0) {
    return null
  }

  const { max, values } = lineOfPositions(places.map((place) => place?.position ?? null))
  const marked = axisTicks(max, places.length)
  // A place is a height: place 1 is the highest (`max`).
  const ticks = marked.places.map((place) => max + 1 - place)
  const coachRows = coachLines(coaches, matches, places)
  // A line in the chart where a coach begins, on the edge before their first round. The first
  // coach has none, and neither has one who begins in the first round.
  const dividers = coachRows
    .slice(1)
    .flatMap(({ rounds }) => (rounds === undefined ? [] : [rounds.first - 1]))
    .filter((divider) => divider > 0)
  const last = places.findLastIndex((place) => place !== null)

  return (
    <Card aria-labelledby={card.id} surface="soft">
      <Heading anchor id={card.id} level={2}>
        {card.name}
      </Heading>
      <BarChart
        axis={{
          labels: marked.rounds.map((round) => ({ at: round - 0.5, text: String(round) })),
          marks: true,
          title: 'Speelronde',
        }}
        bars={places.map(() => null)}
        dividers={dividers}
        max={max}
        ticks={ticks}
        tickText={(height) => String(max + 1 - height)}
      >
        <BarChart.Trend labels={labelsOf(places)} values={values} />
      </BarChart>
      <List plain role="list">
        {lines.map((line) => (
          <List.Item key={line}>{line}</List.Item>
        ))}
        {coachRows.map(({ coach, places: coachPlaces, rounds }) => {
          const text = coachText({ places: coachPlaces, rounds }, places.length)
          const [from, to] = text?.split(' → ') ?? []

          return (
            <List.Item key={`${coach.name}-${coach.startDate}`}>
              <PlayerName {...splitPersonName(coach.name)}>{coach.interim ? '(interim)' : null}</PlayerName>
              {text === undefined ? null : (
                <>
                  {' '}
                  <Text appearance="meta" as="span">
                    {from}
                    {to === undefined ? null : (
                      <>
                        <Text aria-hidden="true" as="span">
                          {' → '}
                        </Text>
                        <Text as="span" className="hf-visually-hidden">
                          {' naar '}
                        </Text>
                        {to}
                      </>
                    )}
                  </Text>
                </>
              )}
            </List.Item>
          )
        })}
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
