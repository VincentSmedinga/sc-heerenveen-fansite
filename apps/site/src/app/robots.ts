import type { MetadataRoute } from 'next'

import { isIndexable, originOf } from '../env'

// Reads SITE_ENV on every request. Without this, Next.js builds robots.txt once, with the variables of the build.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  // Only production points to the sitemap: the other environments refuse everything, so there is nothing to find. The admin
  // is refused everywhere, production too (the page itself says noindex as well, see proxy.ts).
  return isIndexable()
    ? { rules: { allow: '/', disallow: '/beheer', userAgent: '*' }, sitemap: `${originOf()}/sitemap.xml` }
    : { rules: { disallow: ['/', '/beheer'], userAgent: '*' } }
}
