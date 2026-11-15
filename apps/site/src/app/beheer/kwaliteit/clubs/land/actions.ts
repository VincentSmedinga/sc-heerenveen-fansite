'use server'

import { findClubBySlug } from '@fansite/db/queries'
import { isCountryCode } from '@fansite/shared/countries'

import { chooseClubCountry } from '#src/beheer/club-country'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

/**
 * What a form of the country of a club shows after a choice: `saved` is the code the club has
 * now (empty when the country was taken away), `error` says why nothing was saved, and `land`
 * is what the editor chose, so the list still shows it after an error.
 */
export type ClubCountryState = { error?: string; land?: string; saved?: string }

const gone = 'Deze club bestaat niet meer. Laad de pagina opnieuw voor de lijst van nu.'

/**
 * Gives the club on its page in the admin a country, or takes it away (an empty choice,
 * "Onbekend"). Only an editor does that. The address part of the club is bound to the action
 * and is input from outside all the same, so the action looks the club up again, and checks the
 * country against the codes we know. It answers with a state and sends nobody away.
 */
export async function submitClubCountry(
  slug: string,
  _previous: ClubCountryState,
  formData: FormData,
): Promise<ClubCountryState> {
  return choose(slug, formData, true)
}

/**
 * The same for a row of the work list, where an empty choice is no answer: the club has no
 * country already, so the editor is asked to pick one.
 */
export async function submitClubCountryFromList(
  slug: string,
  _previous: ClubCountryState,
  formData: FormData,
): Promise<ClubCountryState> {
  return choose(slug, formData, false)
}

async function choose(slug: string, formData: FormData, mayClear: boolean): Promise<ClubCountryState> {
  const { userId } = await requireRole('owner', 'editor')
  const value = formData.get('land')
  const land = typeof value === 'string' ? { land: value } : {}

  if (typeof value !== 'string' || (value === '' ? !mayClear : !isCountryCode(value))) {
    return { ...land, error: 'Kies een land uit de lijst.' }
  }

  const { db } = getDatabase()
  const club = await findClubBySlug(db, slug)

  if (club === undefined) {
    return { ...land, error: gone }
  }

  const outcome = await chooseClubCountry(db, userId, club.id, value === '' ? null : value)

  if (outcome.status === 'missing') {
    return { ...land, error: gone }
  }

  return { saved: outcome.country ?? '' }
}
