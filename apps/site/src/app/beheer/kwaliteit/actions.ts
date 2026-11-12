'use server'

import { decidePlayerFieldDifference } from '@fansite/db/player-field-differences'
import { decidePlayerStatDifference } from '@fansite/db/player-stat-differences'
import { redirect } from 'next/navigation'

import type { ConflictFormState } from '#src/app/beheer/wedstrijden/actions'

import { parseItemId, parseReason } from '#src/beheer/items'
import { fieldDifferencesPath, statDifferencesPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { seasonFromSlug } from '#src/seasons'

/**
 * Decides a difference between what the editors set of a player and what the import read (issue
 * 1022): "overnemen" gives the player the value of the import, "houden" keeps that of the
 * editors. The reason is optional. Only an editor decides. The number of
 * the difference and the season of the page are bound to the action and checked again, and a
 * difference that is decided already or gone ends on the page with a notice.
 */
export async function submitFieldDifference(
  differenceId: number,
  seasonSlug: string,
  _previous: ConflictFormState,
  formData: FormData,
): Promise<ConflictFormState> {
  const { userId } = await requireRole('owner', 'editor')
  const id = parseItemId(differenceId)
  const season = seasonFromSlug(seasonSlug)

  if (season === undefined) {
    redirect('/beheer/kwaliteit')
  }

  const page = fieldDifferencesPath(season)

  if (id === undefined) {
    redirect(`${page}?fout=besloten`)
  }

  const decision = formData.get('besluit')

  if (decision !== 'overnemen' && decision !== 'houden') {
    return { error: 'Kies of je de import overneemt of de redactie houdt.' }
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    return {
      error: 'Schrijf hoogstens 300 tekens.',
    }
  }

  const outcome = await getDatabase().db.transaction((transaction) =>
    decidePlayerFieldDifference(
      transaction,
      id,
      { kind: decision === 'overnemen' ? 'take-over' : 'keep', reason: reason.reason, userId },
      new Date(),
    ),
  )

  redirect(
    outcome === 'done'
      ? `${page}?gedaan=${decision === 'overnemen' ? 'overgenomen' : 'gehouden'}`
      : `${page}?fout=${outcome === 'taken' ? 'bezet' : 'besloten'}`,
  )
}

/**
 * Decides a difference in the goals of a player between the squad table and the matches or the
 * match reports (issue 974): "overnemen" puts the other number in the squad table, "houden"
 * keeps the table. The reason is optional. Only an editor decides. The
 * number of the difference and the season of the page are bound to the action and checked
 * again, and a difference that is decided already or gone ends on the page with a notice.
 */
export async function submitStatDifference(
  differenceId: number,
  seasonSlug: string,
  _previous: ConflictFormState,
  formData: FormData,
): Promise<ConflictFormState> {
  const { userId } = await requireRole('owner', 'editor')
  const id = parseItemId(differenceId)
  const season = seasonFromSlug(seasonSlug)

  if (season === undefined) {
    redirect('/beheer/kwaliteit')
  }

  const page = statDifferencesPath(season)

  if (id === undefined) {
    redirect(`${page}?fout=besloten`)
  }

  const decision = formData.get('besluit')

  if (decision !== 'overnemen' && decision !== 'houden') {
    return { error: 'Kies of je het andere getal overneemt of de selectietabel houdt.' }
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    return {
      error: 'Schrijf hoogstens 300 tekens.',
    }
  }

  const outcome = await getDatabase().db.transaction((transaction) =>
    decidePlayerStatDifference(
      transaction,
      id,
      { kind: decision === 'overnemen' ? 'take-over' : 'keep', reason: reason.reason, userId },
      new Date(),
    ),
  )

  redirect(
    outcome === 'done'
      ? `${page}?gedaan=${decision === 'overnemen' ? 'overgenomen' : 'gehouden'}`
      : `${page}?fout=${outcome === 'no-row' ? 'geen-rij' : 'besloten'}`,
  )
}
