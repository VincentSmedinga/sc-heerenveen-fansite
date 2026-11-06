import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { PlayerName } from '../player-name/PlayerName'

export type ShortPlayerProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A short player line has no children: everything it shows comes from the props below. */
  children?: never
  /** The given name, in the normal weight. Leave it out for a player known by one name. */
  givenName?: string | undefined
  /**
   * The shirt number. `null` is a player without one in a list where others have one: the
   * column stays empty, so the names of the lines still start at the same place. Leave it out
   * in a list where nobody has a number, and the lines have no column.
   */
  shirtNumber?: null | number | undefined
  /** The surname, in the stronger weight. */
  surname: string
}

/**
 * A player as a short line in a list: the shirt number and the name, as in "4 Joost van Aken".
 * It is the short line of ShortMatch for a player, with the look of it: short-match.css draws
 * the lines and the wrapping, and short-player.css only narrows the column of the number. The
 * name is a PlayerName, so the given name is in the normal weight and the surname in the
 * stronger one. The number and the name are one line of text for a screen reader.
 */
export const ShortPlayer = ({ className, givenName, shirtNumber, surname, ...props }: ShortPlayerProps) => (
  <div {...props} className={classNames('hf-short-match', 'hf-short-player', className)}>
    {shirtNumber === undefined ? null : (
      <span className="hf-short-match-when hf-short-player-number">{shirtNumber}</span>
    )}
    <span className="hf-short-match-opponent">
      <PlayerName givenName={givenName} surname={surname} />
    </span>
  </div>
)
