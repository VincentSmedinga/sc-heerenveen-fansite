/** The flag of a country, shared by `PlayerName` and `CountryName`. Not in the package. */
export type FlagProps = {
  /** The drawing of the flag as an address. Leave it out for a code frame or a blank. */
  address?: string | undefined
  /** The code of two letters for a country without a drawing, in a flag-sized frame. */
  code?: string | undefined
  /**
   * The text alternative, the Dutch name of the country. Leave it out when the name stands next
   * to the flag or the flag is part of a link: the flag is then decoration.
   */
  label?: string | undefined
}

/**
 * The flag of a country, as a drawing, as a frame with the code of two letters for a country
 * without one, or as an empty place of the same size, so the names beside it start at the same
 * place. flag.css gives the look.
 */
export const Flag = ({ address, code, label }: FlagProps) => {
  if (address !== undefined) {
    return <img alt={label ?? ''} className="hf-flag" height={15} src={address} width={20} />
  }

  if (code !== undefined) {
    return (
      <span
        aria-hidden={label === undefined ? true : undefined}
        aria-label={label}
        className="hf-flag hf-flag-code"
        role={label === undefined ? undefined : 'img'}
      >
        {code.toUpperCase()}
      </span>
    )
  }

  return <span className="hf-flag" />
}
