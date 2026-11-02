import { adminShortcuts } from '#src/beheer/adminShortcuts'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

/** The bar of the admin on every page below /beheer (see adminShortcuts). */
export default async function AdminShortcuts({ params }: { params: Promise<{ rest: string[] }> }) {
  const { rest } = await params

  return adminShortcuts(rest)
}
