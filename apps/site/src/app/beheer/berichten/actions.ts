'use server'

import { adminRoles } from '@fansite/db/schema'
import { redirect } from 'next/navigation'

import { hideItem, parseItemId, parseReason, parseSearch, showItem } from '../../../beheer/items'
import { requireRole } from '../../../beheer/require-role'
import { getDatabase } from '../../../database'
import { itemsPath } from './paths'

// The actions of the list of items. The page binds the number of the item and the search to the action
// (`submitHide.bind(null, id, search)`), which Next.js keeps encrypted in the form. They are input from outside all the same,
// so each is checked again. A form that sends nothing wrong ends on the list, with a notice: it works without JavaScript.

/**
 * Hides an item with the reason from the form. Without a reason, or with one that is too long, nothing happens and the list
 * shows the error at the item. The item is gone from the site within five minutes (see `src/headlines.ts` and `src/podcasts.ts`).
 */
export async function submitHide(itemId: number, search: string, formData: FormData) {
  const { userId } = await requireRole(...adminRoles)
  const id = parseItemId(itemId)
  const q = parseSearch(search)

  if (id === undefined) {
    redirect(itemsPath(q, { fout: 'weg' }))
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    redirect(itemsPath(q, { bericht: id, fout: reason.error === 'leeg' ? 'reden-leeg' : 'reden-lang' }))
  }

  const outcome = await hideItem(getDatabase().db, userId, id, reason.reason)

  redirect(outcome === 'missing' ? itemsPath(q, { fout: 'weg' }) : itemsPath(q, { verborgen: id }))
}

/** Shows a hidden item again. It is back on the site within five minutes. */
export async function submitShow(itemId: number, search: string) {
  const { userId } = await requireRole(...adminRoles)
  const id = parseItemId(itemId)
  const q = parseSearch(search)

  if (id === undefined) {
    redirect(itemsPath(q, { fout: 'weg' }))
  }

  const outcome = await showItem(getDatabase().db, userId, id)

  redirect(outcome === 'missing' ? itemsPath(q, { fout: 'weg' }) : itemsPath(q, { getoond: id }))
}
