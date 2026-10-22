import { NextResponse } from 'next/server'

import { isIndexable } from './env'

/**
 * Blocks requests to other domains: a page loads everything from our own server (editorial principle 3). Next.js needs
 * inline scripts and styles. We allow them rather than use nonces, so a page is the same for every visitor and can be
 * cached (see docs/beslissingen.md). `next dev` also needs eval, for reloading code while you work.
 */
export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ')

// Runs for every request, including the files in /_next/static, so every response carries the headers.
export function proxy() {
  const response = NextResponse.next()

  response.headers.set('Content-Security-Policy', contentSecurityPolicy)

  if (!isIndexable()) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  matcher: '/:path*',
}
