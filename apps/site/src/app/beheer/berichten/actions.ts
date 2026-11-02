'use server'

import { adminRoles } from '@fansite/db/schema'
import { redirect } from 'next/navigation'

import { hideItem, parseItemId, parseReason, parseSearch, showItem } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { itemsPath, type ListView } from './paths'

// The actions of the list of items. The page binds the number of the item and what the list
// shows (the group, the box for what editors hid, and the search) to the action
// (`submitHide.bind(null, id, view)`), which Next.js keeps encrypted in the form. They are
// input from outside all the same, so each is checked again. A form that sends nothing wrong
// ends on the list as it was, with a notice: it works without JavaScript.

/**
 * Hides an item with the reason from the form. Without a reason, or with one that is too long,
 * nothing happens and the list shows the error at the item. The item is gone from the site
 * within five minutes (see `src/headlines.ts` and `src/podcasts.ts`).
 */
export async function submitHide(itemId: number, view: ListView, formData: FormData) {
  const { userId } = await requireRole(...adminRoles)
  const id = parseItemId(itemId)
  const list = cleanView(view)

  if (id === undefined) {
    redirect(itemsPath(list, { fout: 'weg' }))
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    redirect(itemsPath(list, { bericht: id, fout: reason.error === 'leeg' ? 'reden-leeg' : 'reden-lang' }))
  }

  const outcome = await hideItem(getDatabase().db, userId, id, reason.reason)

  redirect(outcome === 'missing' ? itemsPath(list, { fout: 'weg' }) : itemsPath(list, { verborgen: id }))
}

/** Shows a hidden item again. It is back on the site within five minutes. */
export async function submitShow(itemId: number, view: ListView) {
  const { userId } = await requireRole(...adminRoles)
  const id = parseItemId(itemId)
  const list = cleanView(view)

  if (id === undefined) {
    redirect(itemsPath(list, { fout: 'weg' }))
  }

  const outcome = await showItem(getDatabase().db, userId, id)

  redirect(outcome === 'missing' ? itemsPath(list, { fout: 'weg' }) : itemsPath(list, { getoond: id }))
}

/** What the list shows, checked again: a group that is none becomes `on-site`. */
function cleanView(view: ListView): ListView {
  const group = view?.group === 'not-on-site' ? 'not-on-site' : 'on-site'

  return {
    editorsOnly: group === 'not-on-site' && view?.editorsOnly === true,
    group,
    search: parseSearch(view?.search),
  }
}
