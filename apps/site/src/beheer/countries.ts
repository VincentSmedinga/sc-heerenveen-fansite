import { countryCodes } from '@fansite/shared/countries'

/** A country to choose from in the admin: the code, and the Dutch name with the code. */
export type CountryChoice = { code: string; label: string }

/**
 * The countries the form of a player lists (#1051), by their Dutch name, with the code of two
 * letters behind it: "Nederland (NL)". The names come from the runtime (`Intl.DisplayNames`),
 * so the list needs no file of names and asks nothing. Call it on the server and hand the list
 * to the form: the browser of an editor may know other names.
 */
export function countryChoices(): CountryChoice[] {
  const names = new Intl.DisplayNames('nl', { type: 'region' })

  return countryCodes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
    .map(({ code, name }) => ({ code, label: `${name} (${code})` }))
}
