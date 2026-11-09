import type { PublicMatch, PublicStaff } from '@fansite/db/queries'

import {
  BarChart,
  Card,
  DataTable,
  DescriptionList,
  Disclosure,
  Heading,
  List,
  PlayerName,
  Strong,
  tableColumns,
  Text,
} from '@fansite/design-system'
import { Fragment } from 'react'

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
 * A line of `placeLines` or `coachText` with its signs said: the eye gets the en dash between
 * two rounds and the arrow between two places, and a screen reader hears "t/m" and "naar".
 */
const Spoken = ({ text }: { text: string }) =>
  text.split(/(–| → )/u).map((part, index) =>
    part === '–' || part === ' → ' ? (
      <Fragment key={index}>
        <Text aria-hidden="true" as="span">
          {part}
        </Text>
        <Text as="span" className="hf-visually-hidden">
          {part === '–' ? ' t/m ' : ' naar '}
        </Text>
      </Fragment>
    ) : (
      part
    ),
  )

/** The name of a head coach, with "(interim)" behind it for one who is. */
const CoachName = ({ coach }: { coach: Pick<PublicStaff, 'interim' | 'name'> }) => (
  <PlayerName {...splitPersonName(coach.name)}>{coach.interim ? '(interim)' : null}</PlayerName>
)

/**
 * The card "Verloop op de ranglijst": our place in the Eredivisie after each round of the
 * season, as a line with place 1 at the top and the rounds along the bottom, with a stroke and
 * a number at the ticks of `axisTicks`; a dashed line marks where a new head coach begins.
 * `places` has one entry for each of the 34 rounds, `null` where a round is open (see
 * `placePerRoundOf`): the line has a gap there and stops after the last complete round. The
 * line is hidden from a screen reader. Above a closed Disclosure is a description list with the
 * highest and the lowest place (see `placeLines`). A season with one head coach has a paragraph
 * with the name; with more it has a list, each coach with the rounds and the places on a second
 * line (see `coachLines`). The Disclosure holds the same numbers in two tables side by side,
 * round 1 at the top: the first half of the rounds of the season and the rest, up to the last
 * complete round. A season without a line has no card, so the page does not render this one (it
 * is the caller's rule, see `getPlacePerRound`).
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
  const onlyCoach = coachRows.length === 1 ? coachRows[0] : undefined
  // The rounds up to the last complete one, in two tables: the first half of the rounds of the
  // season, rounded up, and the rest. A season that is not that far yet has one table.
  const shown = places
    .slice(0, places.findLastIndex((place) => place !== null) + 1)
    .map((place, index) => ({ place, round: index + 1 }))
  const half = Math.ceil(places.length / 2)
  const tables = [shown.slice(0, half), shown.slice(half)].filter((rows) => rows.length > 0)

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
      <DescriptionList>
        {lines.map(({ description, term }) => (
          <DescriptionList.Item key={term} term={term}>
            <Spoken text={description} />
          </DescriptionList.Item>
        ))}
      </DescriptionList>
      {onlyCoach === undefined ? null : (
        <Text>
          Hoofdtrainer: <CoachName coach={onlyCoach.coach} />
        </Text>
      )}
      {coachRows.length > 1 ? (
        <>
          <Text>Hoofdtrainers:</Text>
          <List>
            {coachRows.map(({ coach, places: coachPlaces, rounds }) => {
              const text = coachText({ places: coachPlaces, rounds }, places.length)

              return (
                <List.Item key={`${coach.name}-${coach.startDate}`}>
                  <CoachName coach={coach} />
                  {text === undefined ? null : (
                    <Text appearance="meta">
                      <Spoken text={text} />
                    </Text>
                  )}
                </List.Item>
              )
            })}
          </List>
        </>
      ) : null}
      <Disclosure summary="Plek per speelronde">
        <DataTable.Group>
          {tables.map((rows) => {
            const from = rows[0]?.round ?? 1
            const to = rows.at(-1)?.round ?? from

            return (
              <DataTable
                caption={`Plek en punten van sc Heerenveen in de Eredivisie na ronde ${
                  from === to ? from : `${from} tot en met ${to}`
                }`}
                columns={['Ronde', { abbreviation: '#', key: true, name: 'plek' }, tableColumns.points]}
                key={from}
                rows={rows.map(({ place, round }) => ({
                  cells: place === null ? ['–', '–'] : [String(place.position), String(place.points)],
                  display: (
                    <Text appearance="meta" as="span">
                      {round}
                    </Text>
                  ),
                  header: `Ronde ${round}`,
                  ...(place === null ? { note: 'nog niet alle wedstrijden gespeeld' } : {}),
                }))}
              />
            )
          })}
        </DataTable.Group>
      </Disclosure>
      <EredivisieOnly />
    </Card>
  )
}
