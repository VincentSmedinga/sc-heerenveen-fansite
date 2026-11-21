'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { requireRole } from '#src/beheer/require-role'
import { type ForgetFormState } from '#src/beheer/supporter-fields'
import { forgetBlockedAddress } from '#src/beheer/supporter-management'
import { getDatabase } from '#src/database'

// The action of the owner to let a blocked address sign up again before the 12 months are over
// (issue 1458). Only the owner may do it, so the file asks for that role and no other.

/** Removes the hash of the address in the form, and says whether there was one. */
export async function forgetAddress(_previous: ForgetFormState, formData: FormData): Promise<ForgetFormState> {
  const { userId } = await requireRole('owner')

  requireFansPart('accounts', notFound)

  const typed = formData.get('adres')
  const value = typeof typed === 'string' ? typed : ''
  const result = await forgetBlockedAddress(getDatabase().db, userId, value)

  if (result === 'invalid') {
    return { error: 'Dit e-mailadres klopt niet. Kijk of er een @ in staat.', value }
  }

  return { done: result, value: '' }
}
