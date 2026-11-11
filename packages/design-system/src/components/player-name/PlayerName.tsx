import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { countryName, flagAddress, isCodeOnly } from './flags'

export type PlayerNameProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /**
   * A line behind the name with more about the player, in small quiet letters, such as how many
   * matches a head coach led. It is plain text written by us, and for a screen reader it comes
   * after the name as text of its own. Leave it out for a name alone.
   */
  children?: ReactNode
  /**
   * The country of the player as a code of two letters (`NL`). The flag stands between the
   * shirt number and the name, as an image with the Dutch name of the country as its text
   * alternative. A country without a drawing shows its code of two letters in a frame of the
   * same size, with the same text alternative. `null`, or a code that is not a country, is a
   * player without one in a list where others have one: an empty place of the same width, so
   * the names still start at the same place. Leave it out in a list where nobody has a flag,
   * and the name has no place.
   */
  country?: null | string | undefined
  /** The given name, in the normal weight. Leave it out for a player known by one name. */
  givenName?: string | undefined
  /**
   * The page of the player. With an address the whole name is one link, and the flag stands in
   * the link as decoration, so the link is named by the name alone. The shirt number stays
   * outside it. Leave it out for a player without a page: the name is plain text.
   */
  href?: string | undefined
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
 * under the name, not under the number. With `country` the flag of the country stands in a
 * column of its own between them. The number, the flag and the name are one line of text, one
 * space apart, and the flag reads as the name of the country. A country without a drawing has
 * its code in a frame of the size of a flag, which reads as the name of the country too. With
 * children there is a line behind the name (see `PlayerNameProps`). Without any of these the
 * markup is a name alone.
 * player-name.css gives the look.
 */
export const PlayerName = ({
  children,
  className,
  country,
  givenName,
  href,
  shirtNumber,
  surname,
  ...props
}: PlayerNameProps) => {
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

  if (shirtNumber === undefined && country === undefined) {
    return (
      <span {...props} className={classNames('hf-player-name', className)}>
        {href === undefined ? name : <a href={href}>{name}</a>}
      </span>
    )
  }

  const address = country === undefined || country === null ? undefined : flagAddress(country)
  const label = country === undefined || country === null ? undefined : countryName(country)

  const decorative = href !== undefined
  const flag =
    country === undefined ? null : address === undefined ? (
      country !== null && label !== undefined && isCodeOnly(country) ? (
        <>
          <span
            aria-hidden={decorative ? true : undefined}
            aria-label={decorative ? undefined : label}
            className="hf-player-name-flag hf-player-name-code"
            role={decorative ? undefined : 'img'}
          >
            {country.toUpperCase()}
          </span>
          {decorative ? null : ' '}
        </>
      ) : (
        <span className="hf-player-name-flag" />
      )
    ) : (
      <>
        <img alt={decorative ? '' : label} className="hf-player-name-flag" height={15} src={address} width={20} />
        {decorative ? null : ' '}
      </>
    )

  return (
    <span {...props} className={classNames('hf-player-name', 'hf-player-name-numbered', className)}>
      {shirtNumber === undefined ? null : (
        <>
          <span className="hf-player-name-number">{shirtNumber}</span>
          {shirtNumber === null ? null : ' '}
        </>
      )}
      {href === undefined ? (
        <>
          {flag}
          <span className="hf-player-name-text">{name}</span>
        </>
      ) : (
        <a className="hf-player-name-link" href={href}>
          {flag}
          <span className="hf-player-name-text">{name}</span>
        </a>
      )}
    </span>
  )
}
