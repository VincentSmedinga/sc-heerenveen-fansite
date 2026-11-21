'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import {
  clubsOf,
  parsePrediction,
  predictionFields,
  predictionMatches,
  predictionPath,
  type PredictionState,
  savePrediction,
} from '#src/fans/prediction'
import { requireSupporter } from '#src/fans/require-supporter'

/**
 * Stores the prediction of the supporter who is logged in for a match, which the form binds as
 * `matchId`. It answers "not found" while the game is off, sends a visitor without a session to
 * log in and a blocked account to its page (`requireSupporter`), and writes only for the match
 * that can be predicted now, and only before its kick-off. It returns what the form shows: the
 * errors per field, the values that were typed, and whether it stored them.
 */
export async function savePredictionAction(
  matchId: number,
  _previous: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  requireFansPart('prognose', notFound)

  const { supporterId } = await requireSupporter({ from: predictionPath })
  const { db } = getDatabase()
  const { next } = await predictionMatches(db)
  const entries = Object.fromEntries(predictionFields.map((field) => [field, formData.get(field)]))

  if (next === undefined || next.id !== matchId) {
    return { errors: {}, failure: 'closed', values: {} }
  }

  const parsed = parsePrediction(entries, clubsOf(next))

  if (parsed.errors !== undefined) {
    return { errors: parsed.errors, values: parsed.values }
  }

  const result = await savePrediction(db, { goals: parsed.goals, matchId, supporterId })

  return result.answer === 'closed'
    ? { errors: {}, failure: 'closed', values: parsed.values }
    : { errors: {}, saved: { changed: result.changed }, values: parsed.values }
}
