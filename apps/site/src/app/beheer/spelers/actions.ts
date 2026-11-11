'use server'

import { players } from '@fansite/db/schema'
import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import type { PlayerFormState } from '#src/beheer/player-fields'

import { matchPath } from '#src/app/beheer/wedstrijden/paths'
import { parseItemId } from '#src/beheer/items'
import { mergePersons } from '#src/beheer/person-merge'
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

import { listPath, mergePath, playerPath, playersPath } from './paths'

// The actions of the players. Only a beheerder keeps them, as with the matches. The season and
// the number of the player are bound to the action (`submitPlayer.bind(null, id)`) and are
// input from outside all the same, so each action checks them again. A form that is wrong
// returns to the form with the values kept, and one that works ends on a page with a notice:
// both work without JavaScript.

/** What the form that merges two persons shows after a merge that did not work. */
export type MergeFormState = { error?: string }

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
 * Merges two persons (issue 977): `otherId` goes into `keptId`. The form has only a button, on
 * a page that says what the merge does. A merge that worked ends on the form of the player the
 * editor came from, or, when his row went into another row of the season, on that row. One
 * person twice or a person who is gone ends on the page of the merge again, which says so; a
 * merge that failed comes back as an error, which gets the focus.
 */
export async function submitMergePersons(
  otherId: number,
  keptId: number,
  playerId: number | undefined,
): Promise<MergeFormState> {
  const { userId } = await requireRole('beheerder')
  const { db } = getDatabase()
  const other = parseItemId(otherId)
  const kept = parseItemId(keptId)
  const player = playerId === undefined ? undefined : parseItemId(playerId)
  const before = player === undefined ? undefined : await findAdminPlayer(db, player)

  if (other === undefined || kept === undefined) {
    redirect(`${playersPath}?fout=weg`)
  }

  let outcome: Awaited<ReturnType<typeof mergePersons>>

  try {
    outcome = await mergePersons(db, userId, { keptId: kept, otherId: other })
  } catch (error) {
    console.error(`Could not merge two persons: ${error instanceof Error ? error.message : String(error)}`)

    return { error: 'De personen zijn niet samengevoegd. Er is niets veranderd. Probeer het nog eens.' }
  }

  if (outcome === 'missing' || outcome === 'same') {
    redirect(mergePath({ personId: other, playerId: before?.player.id, withId: kept }))
  }
  if (before === undefined) {
    redirect(listPath(undefined, 'samengevoegd'))
  }

  // The row the editor came from, or the row of the season it went into.
  const [row] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.personId, kept), eq(players.season, before.player.season)))

  redirect(row === undefined ? listPath(before.player.season, 'samengevoegd') : playerPath(row.id, 'samengevoegd'))
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
    const { merge } = outcome

    return {
      errors: outcome.errors,
      ...(merge === undefined ? {} : { merge: { href: mergePath({ ...merge, playerId: id }), label: merge.label } }),
      values: { ...values, ...outcome.values },
    }
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
