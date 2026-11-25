import type { MetadataRoute } from 'next'

import { readFans } from '@fansite/shared/fans-env'

import { isIndexable, originOf } from '../env'

// Reads SITE_ENV on every request. Without this, Next.js builds robots.txt once, with the
// variables of the build.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  // Only production points to the sitemap: the other environments refuse everything, so there
  // is nothing to find. The admin is refused everywhere, production too (the page itself says
  // noindex as well, see proxy.ts). So is everything under /fans/, which is personal; the page
  // /fans itself may be found, and so may the pages of the Fantest: for a visitor they are the
  // same for everyone and hold nothing personal (#1480, #1482). The longer rule wins, so
  // `/fans/fantest` can be allowed under the refused `/fans/`.
  return isIndexable()
    ? {
        rules: {
          allow: readFans().fantest ? ['/', '/fans/fantest'] : '/',
          disallow: ['/beheer', '/fans/'],
          userAgent: '*',
        },
        sitemap: `${originOf()}/sitemap.xml`,
      }
    : { rules: { disallow: ['/', '/beheer'], userAgent: '*' } }
}
