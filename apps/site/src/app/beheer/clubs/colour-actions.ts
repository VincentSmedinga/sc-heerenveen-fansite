'use server'

import { findClubBySlug } from '@fansite/db/queries'

import type { ClubColourState } from '#src/beheer/club-colour-fields'

import { chooseClubColour, readClubColour } from '#src/beheer/club-colour'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

/**
 * Gives the club on its page in the admin the colour of the list, an own colour or none. Only
 * an editor does that. The address part of the club is bound to the action and is input from
 * outside all the same, so the action looks the club up again. It answers with a state.
 */
export async function submitClubColour(
  slug: string,
  _previous: ClubColourState,
  formData: FormData,
): Promise<ClubColourState> {
  const { userId } = await requireRole('owner', 'editor')
  const mode = formData.get('keuze')
  const colour = formData.get('kleur')
  const sent = {
    ...(typeof mode === 'string' ? { mode } : {}),
    ...(typeof colour === 'string' ? { colour } : {}),
  }
  const input = readClubColour(mode, colour)

  if ('error' in input) {
    return { ...sent, error: input.error, field: input.field }
  }

  const { db } = getDatabase()
  const club = await findClubBySlug(db, slug)
  const outcome = club === undefined ? undefined : await chooseClubColour(db, userId, club.id, input.choice)

  if (outcome === undefined || outcome.status === 'missing') {
    return {
      ...sent,
      error: 'Deze club bestaat niet meer. Laad de pagina opnieuw voor de lijst van nu.',
      field: 'keuze',
    }
  }

  return { ...sent, saved: outcome.colour ?? '' }
}
