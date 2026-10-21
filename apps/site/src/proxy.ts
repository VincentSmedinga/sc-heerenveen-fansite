import { NextResponse } from 'next/server'

import { isIndexable } from './env'

// Runs for every request, including the files in /_next/static, so every response carries the header.
export function proxy() {
  const response = NextResponse.next()

  if (!isIndexable()) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  matcher: '/:path*',
}
