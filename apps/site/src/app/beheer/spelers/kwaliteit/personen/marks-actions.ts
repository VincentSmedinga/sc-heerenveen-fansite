'use server'

import { type UnavailableField, unavailableFields } from '@fansite/db/schema'
import { renewMark, unmark } from '@fansite/db/unavailable-marks'
import { redirect } from 'next/navigation'

import { adminFailure } from '#src/beheer/failure'
import { parseItemId } from '#src/beheer/items'
import { personQualityPath } from '#src/beheer/person-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// The two buttons of the card Niet beschikbaar (issue 1308). Only an owner or an editor uses
// them; the person and the field are bound to the action and are input from outside all the
// same, so each action checks them again. Both end on the table of the persons with a notice.

/** Takes a mark away, so the gap is in the table again. */
export async function submitRemoveMark(personId: number, field: string): Promise<void> {
  await changeMark(personId, field, 'weggehaald', unmark)
}

/** Sets the day of the last check of a mark to today: "Nog steeds niet beschikbaar". */
export async function submitRenewMark(personId: number, field: string): Promise<void> {
  await changeMark(personId, field, 'vernieuwd', renewMark)
}

async function changeMark(
  personId: number,
  field: string,
  done: 'vernieuwd' | 'weggehaald',
  change: typeof renewMark | typeof unmark,
): Promise<void> {
  const { userId } = await requireRole('owner', 'editor')
  const id = parseItemId(personId)

  if (id === undefined || !isUnavailableField(field)) {
    redirect(`${personQualityPath}?gedaan=markering-weg`)
  }

  let changed: boolean

  try {
    changed = await getDatabase().db.transaction((transaction) => change(transaction, userId, id, field))
  } catch (error) {
    console.error(adminFailure(`change the mark of person ${id}`, error))
    redirect(`${personQualityPath}?gedaan=mislukt`)
  }

  redirect(`${personQualityPath}?gedaan=${changed ? done : 'markering-weg'}`)
}

/** Whether a value from outside is a field that can be marked. */
function isUnavailableField(value: unknown): value is UnavailableField {
  return unavailableFields.some((field) => field === value)
}
