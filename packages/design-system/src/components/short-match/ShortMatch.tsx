import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { outcomeOf } from '../outcome'
import { Time } from '../time/Time'

export type ShortMatchProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A short match has no children: everything it shows comes from the props below. */
  children?: never
  /** The day in a form a machine reads, such as `2026-10-24`. */
  dateTime: string
  /** The goals of the opponent, whichever side it played on. */
  goalsAgainst: number
  /** The goals of sc Heerenveen, whichever side it played on. The component orders them. */
  goalsFor: number
  /** Whether sc Heerenveen played at home. The home club is named first. */
  home: boolean
  /** The club sc Heerenveen played, as plain text. */
  opponent: string
  /** The day as a visitor reads it, such as `za 24 okt`. The component writes it as given. */
  time: string
}

/** The name of our own club, which a match always has on one side. */
const ourClub = 'sc Heerenveen'

/**
 * A played match of sc Heerenveen 1 as a short line in a list: the day, and the two clubs in
 * the order they are announced with the result between them, the home club first and its goals
 * first, as in "za 24 okt sc Heerenveen 3–0 Testdorp FC" and "za 17 okt Voorbeeld United 0–1
 * sc Heerenveen". The result is never turned around, as in Match. The line doesn't say "thuis"
 * or "uit": the order says it. A screen reader hears the same order with the names, as "sc
 * Heerenveen 3 tegen 0 Testdorp FC". It is for a list that is about our club, such as the
 * matches in which we kept a clean sheet; our name is in bold, as in Match. It has no
 * competition, round, stadium, time or scorers: those belong to Match. The result has the
 * colour of the outcome for sc Heerenveen, as in Match: green for a win, red for a loss and
 * neutral for a draw, whichever side it played on, from the same rule and with the same
 * classes, and not from the home club. The goals say the same, so the colour is never the only
 * sign. A cup match that went to a shoot-out is a draw here, because the component doesn't
 * know the shoot-out. short-match.css gives it its look, and draws the lines between the lines
 * of a List.
 */
export const ShortMatch = ({
  className,
  dateTime,
  goalsAgainst,
  goalsFor,
  home,
  opponent,
  time,
  ...props
}: ShortMatchProps) => {
  const [first, second] = home ? [ourClub, opponent] : [opponent, ourClub]
  const [firstGoals, secondGoals] = home ? [goalsFor, goalsAgainst] : [goalsAgainst, goalsFor]

  return (
    <div {...props} className={classNames('hf-short-match', className)}>
      <Time className="hf-short-match-when" dateTime={dateTime}>
        {time}
      </Time>
      <span className="hf-short-match-clubs">
        <span className={first === ourClub ? 'hf-short-match-own' : undefined}>{first}</span>{' '}
        <span className={classNames('hf-short-match-score', `hf-match-${outcomeOf(goalsFor, goalsAgainst)}`)}>
          <span aria-hidden="true">
            {firstGoals}–{secondGoals}
          </span>
          <span className="hf-visually-hidden">
            {firstGoals} tegen {secondGoals}
          </span>
        </span>{' '}
        <span className={second === ourClub ? 'hf-short-match-own' : undefined}>{second}</span>
      </span>
    </div>
  )
}
