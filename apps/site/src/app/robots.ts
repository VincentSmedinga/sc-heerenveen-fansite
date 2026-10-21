import type { MetadataRoute } from 'next'

import { isIndexable } from '../env'

// Reads SITE_ENV on every request. Without this, Next.js builds robots.txt once, with the variables of the build.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isIndexable() ? { allow: '/', userAgent: '*' } : { disallow: '/', userAgent: '*' },
  }
}
