import { countryName as ownCountryName } from '@fansite/design-system'
import { countryCodes } from '@fansite/shared/countries'

/** A country to choose from in the admin: the code, and the Dutch name with the code. */
export type CountryChoice = { code: string; label: string }

/**
 * The countries the form of a player lists (#1051), by their Dutch name, with the code behind
 * it: "Nederland (NL)". The names come from the runtime (`Intl.DisplayNames`) and, for the four
 * countries of the United Kingdom, from the design system, so the list asks nothing. Call it on
 * the server and hand the list to the form: the browser of an editor may know other names.
 */
export function countryChoices(): CountryChoice[] {
  return countryCodes
    .map((code) => ({ code, name: regionName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
    .map(({ code, name }) => ({ code, label: `${name} (${code})` }))
}

/**
 * The Dutch name of a country code. The runtime knows the codes of two letters; the four
 * countries of the United Kingdom (`GB-ENG`, #1277) are no regions of ISO 3166-1, so their
 * names come from the list of the design system, the same names the flags have.
 */
export function regionName(code: string): string {
  return (code.includes('-') ? ownCountryName(code) : new Intl.DisplayNames('nl', { type: 'region' }).of(code)) ?? code
}
