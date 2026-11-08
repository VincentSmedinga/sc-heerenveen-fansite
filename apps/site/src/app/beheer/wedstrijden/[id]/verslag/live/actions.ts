'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { livePath, matchesPath } from '#src/app/beheer/wedstrijden/paths'
import { parseItemId } from '#src/beheer/items'
import {
  addLiveEvent,
  type LiveEventInput,
  liveFieldId,
  type LiveKind,
  liveKinds,
  removeLiveEvent,
} from '#src/beheer/live-report'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// The actions of the quick screen of a match report (#907). Each event is a post of its own
// form, so the screen works without JavaScript: the server answers with the state of the form,
// which the screen shows with the errors or with the sentence that says what was added.

/** What a form of the live screen shows after a post. */
export type LiveFormState = {
  /** An error for each field, by the `id` of the field. */
  errors?: Record<string, string | undefined>
  /** What was added, said politely to a screen reader. */
  saved?: string
  /** What the editor typed, which the form shows again with the errors. */
  values?: Partial<LiveEventInput>
  /** Changes with every answer, so the form is made anew and its fields are empty again. */
  version: number
}

/** What the form for taking an event away shows. */
export type LiveRemoveState = { error?: string; removed?: string }

/** The names of the fields that make up the input of an event. */
const inputFields = ['assist', 'eruit', 'erin', 'extra', 'kant', 'minuut', 'naam', 'soort', 'speler'] as const

/**
 * Adds one event (a goal, a card or a substitution) to the report of a match. The kind and the
 * number of the match are bound to the action and are input from outside all the same, so they
 * are checked again. A report that can not be stored this way comes back with an error at the
 * field and what was typed; one that is stored comes back with a sentence that says what.
 */
export async function submitLiveEvent(
  matchId: number,
  kind: LiveKind,
  previous: LiveFormState,
  formData: FormData,
): Promise<LiveFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(matchId)

  if (id === undefined || !liveKinds.includes(kind)) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const input = readInput(formData)
  const outcome = await addLiveEvent(getDatabase().db, userId, id, kind, input)
  const version = previous.version + 1

  if (outcome.status === 'missing' || outcome.status === 'not-played') {
    redirect(`${matchesPath}?fout=weg`)
  }
  if (outcome.status === 'no-report') {
    return {
      errors: {
        [liveFieldId(kind, 'kant')]:
          'Dit verslag heeft nog geen opstelling. Maak die eerst in het volledige formulier.',
      },
      values: { ...input },
      version,
    }
  }
  if (outcome.status === 'refused') {
    return { errors: outcome.errors, values: { ...input }, version }
  }

  revalidatePath(livePath(id))

  return { saved: outcome.saved, version }
}

/**
 * Takes one event away from the report of a match, as the button "Haal weg" asks. The form
 * has no state to carry over, so the action takes none.
 */
export async function submitRemoveLiveEvent(
  matchId: number,
  kind: LiveKind,
  eventId: number,
): Promise<LiveRemoveState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(matchId)
  const event = parseItemId(eventId)

  if (id === undefined || event === undefined || !liveKinds.includes(kind)) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const outcome = await removeLiveEvent(getDatabase().db, userId, id, kind, event)

  if (outcome.status === 'missing') {
    redirect(`${matchesPath}?fout=weg`)
  }

  revalidatePath(livePath(id))

  return outcome.status === 'removed'
    ? { removed: outcome.removed }
    : { error: 'Deze gebeurtenis was al weggehaald, bijvoorbeeld door een andere redacteur.' }
}

/** What the request holds for an event, as text: a field left out is empty. */
function readInput(formData: FormData): LiveEventInput {
  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value.trim() : ''
  }

  return Object.fromEntries(inputFields.map((name) => [name, text(name)])) as LiveEventInput
}
