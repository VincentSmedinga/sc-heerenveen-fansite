import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type PlayerNameProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /**
   * A line behind the name with more about the player, in small quiet letters, such as how many
   * matches a head coach led. It is plain text written by us, and for a screen reader it comes
   * after the name as text of its own. Leave it out for a name alone.
   */
  children?: ReactNode
  /** The given name, in the normal weight. Leave it out for a player known by one name. */
  givenName?: string | undefined
  /**
   * The shirt number, in a column before the name. `null` is a player without one in a list
   * where others have one: the column stays empty, so the names of the lines still start at the
   * same place. Leave it out in a list where nobody has a number, and the name has no column.
   */
  shirtNumber?: null | number | undefined
  /**
   * The surname, in the stronger weight. An empty surname gives the whole name in `givenName`
   * in the normal weight, for a name that cannot be split.
   */
  surname: string
}

/**
 * The name of a player, with the surname in the stronger weight and the given name before it in
 * the normal weight, one space apart. Only the weight tells them apart: for a screen reader and
 * for copying it is one name in one text, so there is no `strong` and no text for a screen
 * reader only. The weights are set on the component itself, so it looks the same in a row
 * header that is bold, in a link, in a list and in running text; colour and size come from the
 * surroundings. A long name breaks at a space, and a word that is longer than the line breaks
 * anywhere.
 *
 * With `shirtNumber` the number stands in a column before the name, and a long name goes on
 * under the name, not under the number. The number and the name are one line of text, one space
 * apart. With children there is a line behind the name (see `PlayerNameProps`). Without both
 * the markup is a name alone. player-name.css gives the look.
 */
export const PlayerName = ({ children, className, givenName, shirtNumber, surname, ...props }: PlayerNameProps) => {
  const name = (
    <>
      {givenName === undefined || givenName === '' ? null : (
        <>
          <span className="hf-player-name-given">{givenName}</span>
          {surname === '' ? null : ' '}
        </>
      )}
      {surname === '' ? null : <span className="hf-player-name-surname">{surname}</span>}
      {children === undefined || children === null || children === false ? null : (
        <>
          {' '}
          <span className="hf-player-name-meta">{children}</span>
        </>
      )}
    </>
  )

  if (shirtNumber === undefined) {
    return (
      <span {...props} className={classNames('hf-player-name', className)}>
        {name}
      </span>
    )
  }

  return (
    <span {...props} className={classNames('hf-player-name', 'hf-player-name-numbered', className)}>
      <span className="hf-player-name-number">{shirtNumber}</span>
      {shirtNumber === null ? null : ' '}
      <span className="hf-player-name-text">{name}</span>
    </span>
  )
}
