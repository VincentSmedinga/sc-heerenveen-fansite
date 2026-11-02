import { adminShortcuts } from '#src/beheer/adminShortcuts'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

/** The bar of the admin on /beheer itself. The pages below it are in [...rest]. */
export default function AdminStartShortcuts() {
  return adminShortcuts()
}
