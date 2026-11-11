import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { countryName, flagAddress, isCodeOnly } from '../player-name/flags'

export type CountryNameProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /** A country has no children: the name comes from the code. */
  children?: never
  /** The country as a code of two letters (`NL`). A code that is no country shows as it is. */
  country: string
}

/**
 * The name of a country in Dutch, with its flag before it, in a line of text: "Nederland" after
 * the flag of the Netherlands. The flag is decoration, because the name stands next to it, so a
 * screen reader reads the name once. A country without a drawing has the frame with its code,
 * as in `PlayerName`. The flag is the drawing in the page itself, so it costs no request.
 */
export const CountryName = ({ className, country, ...props }: CountryNameProps) => {
  const name = countryName(country)

  if (name === undefined) {
    return (
      <span {...props} className={classNames('hf-country-name', className)}>
        {country}
      </span>
    )
  }

  const address = flagAddress(country)

  return (
    <span {...props} className={classNames('hf-country-name', className)}>
      {address === undefined ? (
        isCodeOnly(country) && (
          <span aria-hidden="true" className="hf-player-name-flag hf-player-name-code">
            {country.toUpperCase()}
          </span>
        )
      ) : (
        <img alt="" className="hf-player-name-flag" height={15} src={address} width={20} />
      )}
      {name}
    </span>
  )
}
