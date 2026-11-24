import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { PlayerName } from '../player-name/PlayerName'
import { Text } from '../text/Text'

export type ShortStaffProps = ShortStaffBaseProps & (ShortStaffPersonProps | ShortStaffPlaceProps)

type ShortStaffBaseProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A short staff line has no children: everything it shows comes from the props below. */
  children?: never
  /** Whether the person stood in. The line then says "(interim)" behind the name. */
  interim?: boolean
  /**
   * A short text under the line, in the quiet style of a meta text, such as why a club played
   * elsewhere for a while. It is plain text, written by us.
   */
  note?: string | undefined
  /**
   * Which part of the time the line is about, as a visitor reads it, such as `tot 14 mrt 2026`
   * or `vanaf 1 sep 2025`. The component writes it as given. Leave it out when the name says
   * enough, such as for the only coach of a season.
   */
  period?: string | undefined
}

/** A person: a surname and, when there is one, the given name before it. */
type ShortStaffPersonProps = {
  /** The given name, in the normal weight. Leave it out for a person known by one name. */
  givenName?: string | undefined
  name?: never
  /** The surname, in the name weight. */
  surname: string
}

/** A name in one piece, such as a stadium or a club, in the name weight. */
type ShortStaffPlaceProps = {
  givenName?: never
  /** A name in one piece, such as a stadium or a club. Use `surname` for a person. */
  name: string
  surname?: never
}

/**
 * A person of the staff as a short line in a list: the name, with in front of it, when there is
 * something to say, when they had the job, as in "tot 14 mrt 2026 Robin van Persie". It is a
 * short line for a person: short-line.css draws the lines, the wrapping and the colours, and
 * short-staff.css only makes room for the longer text before the name. A person has a
 * `givenName` and a `surname`; a stadium or a club has a `name`, in one piece. The name is a
 * PlayerName, so the given name is in the normal weight, and "(interim)" is in the normal
 * weight and the second colour. A line can have a note under it, on a line of its own.
 */
export const ShortStaff = ({
  className,
  givenName,
  interim = false,
  name,
  note,
  period,
  surname,
  ...props
}: ShortStaffProps) => (
  <div {...props} className={classNames('hf-short-line', 'hf-short-staff', className)}>
    {period === undefined ? null : <span className="hf-short-line-when">{period}</span>}
    <span className="hf-short-line-main">
      <PlayerName givenName={givenName} surname={name ?? surname} />
      {interim ? (
        <>
          {' '}
          <span className="hf-short-line-aside">(interim)</span>
        </>
      ) : null}
    </span>
    {note === undefined ? null : (
      <Text appearance="meta" as="span" className="hf-short-staff-note">
        {note}
      </Text>
    )}
  </div>
)
