import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type PlayerNameProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /** A player name has no children: everything it shows comes from the props below. */
  children?: never
  /** The given name, in the normal weight. Leave it out for a player known by one name. */
  givenName?: string | undefined
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
 * anywhere. player-name.css gives the look.
 */
export const PlayerName = ({ className, givenName, surname, ...props }: PlayerNameProps) => (
  <span {...props} className={classNames('hf-player-name', className)}>
    {givenName === undefined || givenName === '' ? null : (
      <>
        <span className="hf-player-name-given">{givenName}</span>
        {surname === '' ? null : ' '}
      </>
    )}
    {surname === '' ? null : <span className="hf-player-name-surname">{surname}</span>}
  </span>
)
