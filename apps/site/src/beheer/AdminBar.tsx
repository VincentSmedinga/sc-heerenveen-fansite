import { sessionToken } from '#src/beheer/require-role'
import { findSession } from '#src/beheer/sessions'
import { getDatabase } from '#src/database'

import { AdminScreens } from './AdminScreens'

/**
 * The bar with the screens of the admin, under the main menu (the slot @shortcuts draws it on
 * every page under /beheer, see app/@shortcuts/beheer). It reads the session on the server, so
 * the screens are those of the role of the account, and without a valid session there is no
 * bar. It is no guard: the pages check the role themselves (requireRole).
 */
export async function AdminBar() {
  const token = await sessionToken()
  const session = token === undefined ? undefined : await findSession(getDatabase().db, token)

  if (session === undefined) {
    return null
  }

  return <AdminScreens role={session.role} />
}
