import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { PlayerName } from '../player-name/PlayerName'

export type ShortStaffProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A short staff line has no children: everything it shows comes from the props below. */
  children?: never
  /** The given name, in the normal weight. Leave it out for a person known by one name. */
  givenName?: string | undefined
  /** Whether the person stood in. The line then says "(interim)" behind the name. */
  interim?: boolean
  /**
   * Which part of the time the line is about, as a visitor reads it, such as `tot 14 mrt 2026`
   * or `vanaf 1 sep 2025`. The component writes it as given. Leave it out when the name says
   * enough, such as for the only coach of a season.
   */
  period?: string | undefined
  /** The surname, in the stronger weight. */
  surname: string
}

/**
 * A person of the staff as a short line in a list: the name, with in front of it, when there is
 * something to say, when they had the job, as in "tot 14 mrt 2026 Robin van Persie". It is the
 * short line of ShortMatch for a person, and it has the look of it: short-match.css draws the
 * lines, the wrapping and the colours, and short-staff.css only makes room for the longer text
 * before the name. The name is a PlayerName, so the given name is in the normal weight, and
 * "(interim)" is in the normal weight and the second colour, like "thuis" in a short match.
 */
export const ShortStaff = ({ className, givenName, interim = false, period, surname, ...props }: ShortStaffProps) => (
  <div {...props} className={classNames('hf-short-match', 'hf-short-staff', className)}>
    {period === undefined ? null : <span className="hf-short-match-when">{period}</span>}
    <span className="hf-short-match-opponent">
      <PlayerName givenName={givenName} surname={surname} />
      {interim ? (
        <>
          {' '}
          <span className="hf-short-match-where">(interim)</span>
        </>
      ) : null}
    </span>
  </div>
)
