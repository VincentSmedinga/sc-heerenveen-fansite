import { type NextRequest, NextResponse } from 'next/server'

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

/** Whether a path is the admin or under it. `/beheerder` is not. */
export function isAdminPath(pathname: string) {
  return pathname === '/beheer' || pathname.startsWith('/beheer/')
}

// Runs for every request, including the files in /_next/static, so every response carries the headers. The admin gets
// two more on every environment, production too: no search engine may index it, and nothing of it is kept in a cache of
// the browser or of anything on the way. It sends a referrer only to our own pages (`same-origin`), so the login link in
// the address bar goes to no other site. `no-referrer` would do that too, but Chromium then sends `Origin: null` with a
// form that posts, and Next.js refuses a server action with it, so no form of the admin would work without JavaScript.
export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('Content-Security-Policy', contentSecurityPolicy)

  if (isAdminPath(request.nextUrl.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'same-origin')
  } else if (!isIndexable()) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  matcher: '/:path*',
}
