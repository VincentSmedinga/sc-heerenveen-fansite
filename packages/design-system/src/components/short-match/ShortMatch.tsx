import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { outcomeOf } from '../outcome'
import { Time } from '../time/Time'

export type ShortMatchProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A short match has no children: everything it shows comes from the props below. */
  children?: never
  /** The day in a form a machine reads, such as `2026-10-24`. */
  dateTime: string
  /** The goals of the opponent. */
  goalsAgainst: number
  /** The goals of sc Heerenveen. */
  goalsFor: number
  /** Whether sc Heerenveen played at home. */
  home: boolean
  /** The club sc Heerenveen played, as plain text. */
  opponent: string
  /** The day as a visitor reads it, such as `za 24 okt`. The component writes it as given. */
  time: string
}

// Between the opponent and where the match was played. The dot is only for the eye and is
// hidden from a screen reader. The spaces stay outside the hidden span, so the parts don't run
// together in the accessibility tree.
const separator = (
  <>
    {' '}
    <span aria-hidden="true">·</span>{' '}
  </>
)

/**
 * A played match of sc Heerenveen 1 as a short line in a list: the day, the opponent with
 * "thuis" or "uit", and the result from the side of sc Heerenveen, as in "za 24 okt Testdorp FC
 * · thuis 3–0". It is for a list that is about our club, such as the matches in which we kept a
 * clean sheet, so our own name is not in the line. It has no competition, round, stadium, time
 * or scorers: those belong to Match. The result has the colour of the outcome for sc
 * Heerenveen, as in Match: green for a win, red for a loss and neutral for a draw, whichever
 * side it played on, from the same rule and with the same classes. The goals say the same, so
 * the colour is never the only sign, and a screen reader hears nothing extra: it hears the
 * result as "3 tegen 0". A cup match that went to a shoot-out is a draw here, because the
 * component doesn't know the shoot-out. short-match.css gives it its look, and draws the lines
 * between the lines of a List.
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
}: ShortMatchProps) => (
  <div {...props} className={classNames('hf-short-match', className)}>
    <Time className="hf-short-match-when" dateTime={dateTime}>
      {time}
    </Time>
    <span className="hf-short-match-opponent">
      {opponent}
      {separator}
      <span className="hf-short-match-where">{home ? 'thuis' : 'uit'}</span>
    </span>
    <span className={classNames('hf-short-match-score', `hf-match-${outcomeOf(goalsFor, goalsAgainst)}`)}>
      <span aria-hidden="true">
        {goalsFor}–{goalsAgainst}
      </span>
      <span className="hf-visually-hidden">
        {goalsFor} tegen {goalsAgainst}
      </span>
    </span>
  </div>
)
