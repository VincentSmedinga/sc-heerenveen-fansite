import type { ComponentPropsWithoutRef } from 'react'

import { Card } from '../card/Card'
import { classNames } from '../classNames'
import { Link } from '../link/Link'
import { type Outcome, outcomeOf } from '../outcome'
import { Time } from '../time/Time'

/** The words a screen reader hears behind a result, as in the head of a match. */
const outcomeWords: Record<Outcome, string> = { draw: 'Gelijkspel', loss: 'Verloren', win: 'Gewonnen' }

/** The match before or after the one of the page. */
export type MatchNeighbour = MatchNeighbourState & {
  /** The name the opponent had that day, as plain text. */
  club: string
  /** Whether sc Heerenveen played at home. */
  home: boolean
  /**
   * The address of the page of the match. A match without a page has none, and stands in the
   * card as plain text.
   */
  href?: string
}

export type MatchNeighboursProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The label of the navigation for a screen reader. */
  label?: string
  /** The match after this one. Leave it out for the last match. */
  next?: MatchNeighbour | undefined
  /** The match before this one. Leave it out for the first match. */
  previous?: MatchNeighbour | undefined
}

/**
 * What the match stands at: its result when it was played, and otherwise a word or a day, with
 * no colour.
 */
export type MatchNeighbourState =
  | {
      /** The goals of the opponent. */
      goalsAgainst: number
      /** The goals of sc Heerenveen, whichever side it played on. */
      goalsFor: number
      /** The penalties scored by the opponent after a shoot-out. */
      penaltiesAgainst?: number
      /** The penalties scored by sc Heerenveen after a shoot-out. */
      penaltiesFor?: number
      state?: never
    }
  | {
      goalsAgainst?: never
      goalsFor?: never
      penaltiesAgainst?: never
      penaltiesFor?: never
      /**
       * The day as a visitor reads it, such as `zo 1 nov`, or a word: `Live`, `Uitgesteld` or
       * `Geannuleerd`.
       */
      state: string
      /** The day in a form a machine reads, such as `2026-11-01`. Leave it out for a word. */
      stateDateTime?: string
    }

/**
 * The line of a match in the card: the club, "thuis" or "uit", and the result in the colour of
 * its outcome, or the day or a word without a colour. A result is followed by the outcome in
 * words that only a screen reader hears.
 */
function Line({ match }: { match: MatchNeighbour }) {
  const where = match.home ? 'thuis' : 'uit'

  if (match.state !== undefined) {
    return (
      <>
        {`${match.club} (${where}) `}
        {match.stateDateTime === undefined ? match.state : <Time dateTime={match.stateDateTime}>{match.state}</Time>}
      </>
    )
  }

  const shootOut = match.penaltiesFor !== undefined && match.penaltiesAgainst !== undefined
  const outcome = shootOut
    ? outcomeOf(match.penaltiesFor ?? 0, match.penaltiesAgainst ?? 0)
    : outcomeOf(match.goalsFor, match.goalsAgainst)

  return (
    <>
      {`${match.club} (${where}) `}
      <span className={classNames('hf-match-neighbours-score', `hf-match-${outcome}`)}>
        {match.goalsFor}–{match.goalsAgainst}
        <span className="hf-visually-hidden"> {outcomeWords[outcome]}</span>
      </span>
    </>
  )
}

/** One side of the card: "Vorige" with the arrow in front, "Volgende" with it behind. */
function Side({ match, side }: { match: MatchNeighbour | undefined; side: 'next' | 'previous' }) {
  if (match === undefined) {
    return null
  }

  const word = side === 'next' ? 'Volgende' : 'Vorige'
  const line = <Line match={match} />

  return (
    <li className="hf-match-neighbours-item" data-side={side}>
      {match.href === undefined ? (
        <span>
          {`${word}: `}
          {line}
        </span>
      ) : (
        <Link href={match.href} icon={side === 'next' ? 'arrow-right' : 'arrow-left'}>
          {`${word}: `}
          {line}
        </Link>
      )}
    </li>
  )
}

/**
 * The links to the match before and the match after the one of the page, at the bottom of its
 * main column, in a transparent Card: "Vorige: Testdorp FC (thuis) 2–1" with the arrow in front
 * and "Volgende: Voorbeeld United (uit) 1–1" with the arrow behind. A match with a result shows
 * it from our side in the colour of the outcome (the words "Gewonnen", "Gelijkspel" or
 * "Verloren" follow it for a screen reader); a match that is not played shows its day, "Live",
 * "Uitgesteld" or "Geannuleerd". A match without a page is plain text. From 40 rem of room the
 * two stand next to each other, "Vorige" at the left and "Volgende" at the right, and below it
 * they stand under each other.
 */
export const MatchNeighbours = ({
  className,
  label = 'Vorige en volgende wedstrijd',
  next,
  previous,
  ...props
}: MatchNeighboursProps) => (
  <Card {...props} as="div" className={classNames('hf-match-neighbours', className)} surface="transparent">
    <nav aria-label={label}>
      <ul className="hf-match-neighbours-list">
        <Side match={previous} side="previous" />
        <Side match={next} side="next" />
      </ul>
    </nav>
  </Card>
)
