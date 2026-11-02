import { originOf } from '#src/env'
import { feedOf } from '#src/feed'
import { getReleases } from '#src/releases'

// Reads SITE_ENV on every request, for the address of the site in the links. The versions are
// in the build.
export const dynamic = 'force-dynamic'

export function GET() {
  return new Response(feedOf(getReleases(), originOf()), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
