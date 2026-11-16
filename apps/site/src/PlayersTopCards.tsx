import type { PublicMatch } from '@fansite/db/queries'

import {
  BarList,
  BigFigure,
  Card,
  Heading,
  Link,
  PlayerName,
  Text,
  type TopScorersTableRow,
} from '@fansite/design-system'
import { Fragment } from 'react'

import { cleanSheetsOf, scorersByPlace, topScorersOf } from './matches'
import { cleanSheetsLine, crowdedLabel, firstPlaces, isCrowded } from './players-top'
import { rankedPlaces, type ReportFigures } from './report-figures'

// The four small cards of the page Spelers (#1286): the top of the season in a few lines each,
// ending with a link to the large card of the same figures. They count all the competitions
// and take their numbers from the same functions as the large cards, so the numbers agree.

/** The rows of a ranked card: the names of a place or how many share it, and the number. */
const barRowsOf = (places: readonly TopScorersTableRow[]) =>
  places.map((place) => ({
    label: isCrowded(place) ? (
      crowdedLabel(place)
    ) : (
      <>
        {place.players.map((player, index) => (
          <Fragment key={player.id}>
            {index === 0 ? null : ', '}
            <PlayerName givenName={player.givenName} href={player.href} surname={player.surname} />
          </Fragment>
        ))}
      </>
    ),
    value: place.goals,
  }))

/**
 * The card De nul gehouden: one large number and one line under it, and the link to the large
 * card on the page Cijfers of the matches. It is there once a match is played, also with zero.
 */
export function CleanSheetsShortCard({
  href,
  matches,
  now,
  when,
}: {
  href: string
  matches: PublicMatch[]
  now: Date
  /** "dit seizoen" or "in 2025/26": how the line says which season has no clean sheet yet. */
  when: string
}) {
  const { matches: sheets, played } = cleanSheetsOf(matches, 'all')

  if (played === 0) {
    return null
  }

  return (
    <Card aria-labelledby="kort-de-nul-gehouden" surface="soft">
      <Heading id="kort-de-nul-gehouden" level={2}>
        De nul gehouden
      </Heading>
      <BigFigure figure={`${sheets.length} keer`} label="de nul gehouden" />
      <Text>{cleanSheetsLine({ last: sheets[0], played, sheets: sheets.length }, now, when)}</Text>
      <Link href={href} icon="arrow-right">
        Alle wedstrijden waarin we de nul hielden
      </Link>
    </Card>
  )
}

/** The card Assists or Minuten: the first three places, and no card without a number. */
export function ReportShortCard({
  figure,
  figures,
  href,
}: {
  figure: 'assists' | 'minutes'
  figures: ReportFigures
  href: string
}) {
  const { rows, total } = rankedPlaces(figures.players, figure, false)

  if (total === 0) {
    return null
  }

  return figure === 'assists' ? (
    <RankedCard heading="Assists" href={href} id="kort-assists" linkText="Alle assists" places={rows} />
  ) : (
    <RankedCard heading="Minuten" href={href} id="kort-minuten" linkText="Alle minuten" places={rows} />
  )
}

/** The card Topscorers: the first three places of the goal scorers of the season. */
export function TopScorersShortCard({ href, matches }: { href: string; matches: PublicMatch[] }) {
  const places = scorersByPlace(topScorersOf(matches, 'all'))

  return places.length === 0 ? null : (
    <RankedCard
      heading="Topscorers"
      href={href}
      id="kort-topscorers"
      linkText="Alle doelpuntenmakers"
      places={places}
    />
  )
}

/**
 * A card with the first three places of a figure: a line a place, with the name or names, the
 * number and a bar, and the link to the large card. The places are those of the large card, so
 * a place with several players is one line.
 */
function RankedCard({
  heading,
  href,
  id,
  linkText,
  places,
}: {
  heading: string
  href: string
  id: string
  linkText: string
  places: readonly TopScorersTableRow[]
}) {
  return (
    <Card aria-labelledby={id} surface="soft">
      <Heading id={id} level={2}>
        {heading}
      </Heading>
      <BarList aria-label={heading} rows={barRowsOf(firstPlaces(places))} wide />
      <Link href={href} icon="arrow-right">
        {linkText}
      </Link>
    </Card>
  )
}
