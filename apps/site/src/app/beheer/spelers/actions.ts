'use server'

import { redirect } from 'next/navigation'

import type { PlayerFormState } from '#src/beheer/player-fields'

import { parseItemId } from '#src/beheer/items'
import { findReturnMatch } from '#src/beheer/player-return'
import {
  addPlayer,
  editPlayer,
  findAdminPlayer,
  listPlayerSeasons,
  readPlayerValues,
  removePlayer,
  validatePlayer,
} from '#src/beheer/players'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { matchPath } from '../wedstrijden/paths'
import { listPath, playerPath, playersPath } from './paths'

// The actions of the players. Only a beheerder keeps them, as with the matches. The season and
// the number of the player are bound to the action (`submitPlayer.bind(null, id)`) and are
// input from outside all the same, so each action checks them again. A form that is wrong
// returns to the form with the values kept, and one that works ends on a page with a notice:
// both work without JavaScript.

/**
 * Adds a player to the squad of a season (issue 1020). A form that is wrong comes back with
 * the values kept and an error at each field, and one that works ends on the list of the
 * season. An editor who came from the form of a match (`matchId`, issue 1021) ends on that
 * form again, where the player is in the list of the goals. A season that has no match and is
 * not the current one ends on the list with a notice.
 */
export async function submitAddPlayer(
  season: string,
  matchId: number | undefined,
  _previous: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const { userId } = await requireRole('beheerder')
  const { db } = getDatabase()

  if (!(await listPlayerSeasons(db)).includes(season)) {
    redirect(`${playersPath}?fout=seizoen`)
  }

  const values = readPlayerValues(formData)
  const checked = validatePlayer(values, 'add')

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values }
  }

  let outcome: Awaited<ReturnType<typeof addPlayer>>

  try {
    outcome = await addPlayer(db, userId, season, checked.entry)
  } catch (error) {
    console.error(`Could not add a player: ${error instanceof Error ? error.message : String(error)}`)

    return { errors: { algemeen: 'De speler is niet opgeslagen. Probeer het nog eens.' }, values }
  }

  if (outcome.status === 'refused') {
    return { errors: outcome.errors, values }
  }

  // The number of the match is input from outside: only a match of this season counts.
  const back = await findReturnMatch(db, matchId, season)

  redirect(back === undefined ? listPath(season, 'toegevoegd') : matchPath(back.id, 'speler-toegevoegd'))
}

/**
 * Changes a player. A form that is wrong comes back with the values kept, and one that works
 * ends on the form of the player with a notice, also when nothing changed. A player that is
 * gone ends on the list with a notice.
 */
export async function submitPlayer(
  playerId: number,
  _previous: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(playerId)

  if (id === undefined) {
    redirect(`${playersPath}?fout=weg`)
  }

  const values = readPlayerValues(formData)
  const checked = validatePlayer(values, 'edit')

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values }
  }

  let outcome: Awaited<ReturnType<typeof editPlayer>>

  try {
    outcome = await editPlayer(getDatabase().db, userId, id, checked.entry)
  } catch (error) {
    console.error(`Could not change a player: ${error instanceof Error ? error.message : String(error)}`)

    return { errors: { algemeen: 'De speler is niet opgeslagen. Probeer het nog eens.' }, values }
  }

  if (outcome.status === 'refused') {
    return { errors: outcome.errors, values }
  }

  redirect(
    outcome.status === 'missing'
      ? `${playersPath}?fout=weg`
      : playerPath(id, outcome.status === 'changed' ? 'opgeslagen' : 'ongewijzigd'),
  )
}

/**
 * Takes a player out of the squad of his season. The form has only a button, behind a
 * Disclosure that says what it does, so nothing can be wrong with it. A player with a goal or
 * an appearance stays, and the page says why.
 */
export async function submitRemovePlayer(playerId: number): Promise<void> {
  const { userId } = await requireRole('beheerder')
  const { db } = getDatabase()
  const id = parseItemId(playerId)
  const found = id === undefined ? undefined : await findAdminPlayer(db, id)

  if (id === undefined || found === undefined) {
    redirect(`${playersPath}?fout=weg`)
  }

  const outcome = await removePlayer(db, userId, id)

  redirect(
    outcome === 'missing'
      ? `${playersPath}?fout=weg`
      : outcome === 'done'
        ? listPath(found.player.season, 'weggehaald')
        : playerPath(id, outcome === 'in-use' ? 'blijft' : 'was-al-weg'),
  )
}
