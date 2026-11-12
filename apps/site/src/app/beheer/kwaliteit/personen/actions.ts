'use server'

import { type PlayerPosition, playerPositions } from '@fansite/db/schema'
import { isCountryCode } from '@fansite/shared/countries'

import { parseItemId } from '#src/beheer/items'
import { choosePersonFact, type PersonFact } from '#src/beheer/person-facts'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

/**
 * What a row of the work list shows after a choice: `saved` is the value the person got, as the
 * database holds it, and `error` says why nothing was saved. `land` is the country the editor
 * chose, so the list of the row still shows it after an error.
 */
export type PersonFactState = { error?: string; land?: string; saved?: string }

const articles: Record<PersonFact, string> = { land: 'een land', linie: 'een linie' }

/**
 * Gives one person of the work list a line or a country (issue 1053). Only an editor does
 * that. The number of the person and the list are bound to the action and checked again, and
 * the value is checked against the lines and the country codes we know. It answers with a state
 * and sends nobody away, so the other rows of the list stay as the editor left them.
 */
export async function submitPersonFact(
  personId: number,
  fact: PersonFact,
  _previous: PersonFactState,
  formData: FormData,
): Promise<PersonFactState> {
  const { userId } = await requireRole('owner', 'editor')
  const id = parseItemId(personId)
  const value = formData.get(fact)
  const land = fact === 'land' && typeof value === 'string' ? { land: value } : {}

  if (fact === 'linie' && !isLine(value)) {
    return { error: 'Kies doelman, verdediger, middenvelder of aanvaller.' }
  }
  if (fact === 'land' && (typeof value !== 'string' || !isCountryCode(value))) {
    return { ...land, error: 'Kies een land uit de lijst.' }
  }
  if (id === undefined) {
    return { ...land, error: gone }
  }

  const outcome = await choosePersonFact(
    getDatabase().db,
    userId,
    id,
    fact === 'linie' ? { line: value as PlayerPosition } : { country: value as string },
  )

  if (outcome.status === 'missing') {
    return { ...land, error: gone }
  }
  if (outcome.status === 'filled') {
    return {
      ...land,
      error: `${outcome.name} heeft al ${articles[fact]}. Laad de pagina opnieuw voor de lijst van nu.`,
    }
  }

  return { saved: value as string }
}

const gone = 'Deze persoon bestaat niet meer. Laad de pagina opnieuw voor de lijst van nu.'

function isLine(value: unknown): value is PlayerPosition {
  return typeof value === 'string' && (playerPositions as readonly string[]).includes(value)
}
