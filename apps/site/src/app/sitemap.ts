import type { MetadataRoute } from 'next'

import { urlOf } from '../metadata'
import { pages } from '../pages'

// Reads SITE_ENV on every request, like robots.txt. Without this, Next.js builds sitemap.xml
// once, with the variables of the build.
export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(({ path }) => ({ url: urlOf(path) }))
}
