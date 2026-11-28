'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { refresh } from 'next/cache'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import { saveFjouwer } from '#src/fans/fjouwer'
import { type FjouwerFormState, fjouwerPath, matchField, playerField } from '#src/fans/fjouwer-form'
import { kickoffText } from '#src/fans/prediction'
import { requireSupporter } from '#src/fans/require-supporter'

/**
 * Stores the four players of the supporter who is logged in for a match, whose number is the
 * value of the button that sent the form (`matchField`). It answers "not found" while the game
 * is off, sends a visitor without a session to log in and a blocked account to its page
 * (`requireSupporter`), and writes only for the match of the card, and only before it closes.
 * It returns what the form shows: the errors per line, the players that were ticked, and
 * whether it stored them.
 */
export async function saveFjouwerAction(_previous: FjouwerFormState, formData: FormData): Promise<FjouwerFormState> {
  requireFansPart('vier', notFound)

  const { supporterId } = await requireSupporter({ from: fjouwerPath })
  const { db } = getDatabase()
  const matchId = Number(formData.get(matchField))
  const sent = formData.getAll(playerField).map((value) => (typeof value === 'string' ? value : ''))
  const values = sent.filter((value) => /^[0-9]{1,10}$/.test(value))
  const result = await saveFjouwer(db, { matchId, playerIds: values.map(Number), supporterId })

  switch (result.answer) {
    case 'closed':
      return { errors: { general: [], lines: {} }, failure: 'closed', values }
    case 'invalid':
      return { errors: result.errors, values }
    case 'saved':
      // The page reads the four again, so the pitch shows what is stored, also after a later
      // choice that is refused.
      refresh()

      return {
        errors: { general: [], lines: {} },
        saved: { until: kickoffText(result.closesAt) },
        values: result.four.map(String),
      }
  }
}
